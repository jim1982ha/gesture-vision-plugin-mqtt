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
                clearTimeout(externalTimeoutId);
                newClient.removeAllListeners();
                
                const currentCacheEntry = connectionCache.get(brokerUrl);
                if (currentCacheEntry?.connectingPromise === connectingPromise) {
                    if (error || !client) connectionCache.delete(brokerUrl);
                    else connectionCache.set(brokerUrl, { client, timestamp: Date.now(), connectingPromise: null });
                }

                if (error) { newClient.end(true); reject(error); } 
                else if (client) {
                    client.once('close', () => connectionCache.delete(brokerUrl));
                    client.once('error', () => { client.end(true); connectionCache.delete(brokerUrl); });
                    resolve(client);
                } else {
                    newClient.end(true); reject(new Error("MQTT client settlement in inconsistent state."));
                }
            };
            
            const externalTimeoutId = setTimeout(() => {
                settlePromise(new Error(`MQTT connection timeout after ${CONNECTION_TIMEOUT_MS}ms`));
            }, CONNECTION_TIMEOUT_MS);

            newClient.on('error', (err) => settlePromise(err));
            newClient.once('connect', () => settlePromise(undefined, newClient));
        });
        
        connectionCache.set(brokerUrl, { client: null, timestamp: Date.now(), connectingPromise });
        connectingPromise.catch(() => {
            const entry = connectionCache.get(brokerUrl);
            if (entry?.connectingPromise === connectingPromise) connectionCache.delete(brokerUrl);
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