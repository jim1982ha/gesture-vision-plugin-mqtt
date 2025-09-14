/* FILE: packages/plugins/mqtt/helpers/mqtt-client-manager.ts */
import { MqttClient, type IClientOptions, connect } from 'mqtt';

import type { MqttConfig } from '../schemas.js';

const connectionCache: Map<string, { client: MqttClient | null, timestamp: number, connectingPromise: Promise<MqttClient> | null }> = new Map();
const CACHE_TTL_MS = 60 * 1000;
const CONNECTION_TIMEOUT_MS = 5000;

const cleanupInterval = setInterval(() => {
    const now = Date.now();
    connectionCache.forEach((entry, url) => {
        if (now - entry.timestamp > CACHE_TTL_MS) {
            if (entry.client?.connected) entry.client.end(true);
            connectionCache.delete(url);
        }
    });
}, CACHE_TTL_MS / 2);

process.on('exit', () => clearInterval(cleanupInterval));


export class MqttClientManager {
    public async getConnectedClient(config: MqttConfig, forceReconnect = false): Promise<MqttClient> {
        const brokerUrl = config.url;
        let cachedEntry = connectionCache.get(brokerUrl);

        if (forceReconnect && cachedEntry) {
            if (cachedEntry.client?.connected) cachedEntry.client.end(true);
            connectionCache.delete(brokerUrl);
            cachedEntry = undefined;
        }

        if (cachedEntry?.client?.connected && !cachedEntry.connectingPromise) {
            cachedEntry.timestamp = Date.now();
            return cachedEntry.client;
        }
        
        if (cachedEntry?.connectingPromise) {
            return cachedEntry.connectingPromise;
        }

        const connectingPromise = new Promise<MqttClient>((resolve, reject) => {
            const options: IClientOptions = {
                clientId: `gesturevision_plugin_mqtt_${Math.random().toString(16).substring(2, 10)}`,
                connectTimeout: CONNECTION_TIMEOUT_MS,
                username: config.username,
                password: config.password,
                reconnectPeriod: 0,
                keepalive: 30,
            };

            const newClient = connect(brokerUrl, options);
            let promiseSettled = false;

            const settlePromise = (error?: Error, client?: MqttClient) => {
                if (promiseSettled) return;
                promiseSettled = true;
                
                // Crucially, only remove the listeners specific to this connection attempt.
                // The persistent 'error' listener (our safety net) will remain.
                newClient.removeListener('connect', connectHandler);
                newClient.removeListener('close', closeHandler);
                
                const currentCacheEntry = connectionCache.get(brokerUrl);
                if (currentCacheEntry?.connectingPromise === connectingPromise) {
                    if (error || !client) {
                        connectionCache.delete(brokerUrl);
                    } else {
                        connectionCache.set(brokerUrl, { client, timestamp: Date.now(), connectingPromise: null });
                    }
                }

                if (error) { 
                    newClient.end(true); 
                    reject(error); 
                } else if (client) {
                    // Attach a listener to clear the cache if the established connection closes later.
                    client.once('close', () => connectionCache.delete(brokerUrl));
                    resolve(client);
                } else {
                    newClient.end(true); 
                    reject(new Error("MQTT client settlement in inconsistent state."));
                }
            };
            
            const connectHandler = () => settlePromise(undefined, newClient);
            const closeHandler = () => {
                if (!promiseSettled) {
                    settlePromise(new Error('Connection closed before a successful connection was established.'));
                }
            };

            // It catches ALL errors. It only rejects the promise if it's the *first* error.
            // Subsequent errors are caught silently to prevent a crash.
            newClient.on('error', (err) => {
                if (!promiseSettled) {
                    settlePromise(err);
                }
                // After the promise is settled (e.g., on timeout), this listener remains active.
                // If the MQTT client emits another error while shutting down, this will catch it
                // and prevent the entire Node.js process from crashing.
            });

            newClient.once('connect', connectHandler);
            newClient.once('close', closeHandler);
        });
        
        connectionCache.set(brokerUrl, { client: null, timestamp: Date.now(), connectingPromise });
        connectingPromise.catch(() => {
            const entry = connectionCache.get(brokerUrl);
            if (entry?.connectingPromise === connectingPromise) {
                connectionCache.delete(brokerUrl);
            }
        });
        return connectingPromise;
    }

    public destroy(): void {
        connectionCache.forEach((entry, key) => {
            if (entry.client?.connected) {
                entry.client.end(true);
            }
            connectionCache.delete(key);
        });
    }
}