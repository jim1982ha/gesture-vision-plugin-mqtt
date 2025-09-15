/* FILE: extensions/plugins/mqtt/backend.plugin.ts */
import type { ZodType } from 'zod';
import { BaseBackendPlugin } from '#backend/plugins/base-backend.plugin.js';
import { MqttActionHandler } from './action-handler.mqtt.js';
import { MqttClientManager } from './helpers/mqtt-client-manager.js';
import {
  MqttGlobalConfigSchema,
  MqttActionSettingsSchema,
  type MqttConfig,
} from './schemas.js';
import manifest from './plugin.json' with { type: 'json' };
import type { PluginManifest } from '#shared/index.js';

class MqttBackendPlugin extends BaseBackendPlugin {
  #clientManager: MqttClientManager;

  constructor() {
    const clientManager = new MqttClientManager();
    // Pass the manager instance to the handler
    super(manifest as PluginManifest, new MqttActionHandler(clientManager));
    this.#clientManager = clientManager;
  }

  async onGlobalConfigUpdate(): Promise<void> {
    // When the config changes, destroy old connections to force reconnect with new credentials.
    this.#clientManager.destroy();
  }

  getGlobalConfigValidationSchema(): ZodType | null {
    return MqttGlobalConfigSchema;
  }

  getActionConfigValidationSchema(): ZodType | null {
    return MqttActionSettingsSchema;
  }

  public async testConnection(
    configToTest: MqttConfig
  ): Promise<{
    success: boolean;
    messageKey?: string;
    error?: { code?: string; message?: string };
  }> {
    const brokerUrl = configToTest.url;
    if (!brokerUrl)
      return {
        success: false,
        messageKey: 'mqttBrokerUrlRequired',
        error: { code: 'CONFIG_ERROR', message: 'Broker URL is required.' },
      };

    try {
      const client = await this.#clientManager.getConnectedClient(
        configToTest,
        true
      );
      if (client.connected) {
        client.end(true);
        return { success: true, messageKey: 'mqttConnectionSuccess' };
      } else {
        client.end(true);
        return {
          success: false,
          messageKey: 'mqttTestFailed',
          error: {
            code: 'CONNECTION_FAILED_UNKNOWN',
            message: 'Client reported not connected after connect attempt.',
          },
        };
      }
    } catch (error: unknown) {
      const typedError = error as Error & { code?: string; type?: string };
      let messageKey = 'mqttGenericError';
      let errorCode = typedError.code || 'UNKNOWN_MQTT_ERROR';

      if (typedError.message?.toLowerCase().includes('timeout')) {
        messageKey = 'mqttTimeout';
        errorCode = 'TIMEOUT';
      } else if (
        typedError.message?.toLowerCase().includes('econnrefused') ||
        typedError.code === 'ECONNREFUSED'
      ) {
        messageKey = 'mqttConnRefused';
        errorCode = 'CONN_REFUSED';
      } else if (
        typedError.message?.toLowerCase().includes('eai_again') ||
        typedError.code === 'EAI_AGAIN' ||
        typedError.code === 'ENOTFOUND'
      ) {
        messageKey = 'mqttDnsError';
        errorCode = 'DNS_ERROR';
      } else if (
        typedError.message?.toLowerCase().includes('auth') ||
        typedError.message?.includes('credentials')
      ) {
        messageKey = 'mqttAuthFailed';
        errorCode = 'AUTH_FAILED';
      }

      return {
        success: false,
        messageKey,
        error: { code: errorCode, message: typedError.message },
      };
    }
  }
  
  async destroy(): Promise<void> {
    this.#clientManager.destroy();
  }
}

export default MqttBackendPlugin;