/* FILE: extensions/plugins/mqtt/action-handler.mqtt.ts */
import { MqttClient } from 'mqtt';

import { processActionTemplate } from '#shared/utils/index.js';
import { createErrorResult, executeWithRetry } from '#backend/utils/action-helpers.js';
import { MqttClientManager } from './helpers/mqtt-client-manager.js';
import { type MqttConfig, type MqttActionInstanceSettings } from './schemas.js';

import type { ActionDetails, ActionResult } from '#shared/types/index.js';
import type { ActionHandler } from '#backend/types/index.js';

export class MqttActionHandler implements ActionHandler {
  private readonly PUBLISH_TIMEOUT_MS = 5000;
  private readonly MAX_RETRIES = 1;
  private readonly RETRY_DELAY_MS = 1500;
  private clientManager: MqttClientManager;

  constructor() {
    this.clientManager = new MqttClientManager();
  }

  async execute(
    instanceSettings: MqttActionInstanceSettings,
    details: ActionDetails,
    pluginGlobalConfig?: MqttConfig
  ): Promise<ActionResult> {
    if (!pluginGlobalConfig || !pluginGlobalConfig.url) {
      return createErrorResult(
        'MQTT Plugin Error: Broker URL not configured globally for the MQTT plugin.',
        { reason: 'Missing MQTT plugin global config' }
      );
    }

    if (!instanceSettings.mqttTopic) {
      return createErrorResult(
        'MQTT Action Error: Topic not configured for this action.',
        { config: instanceSettings }
      );
    }
    const topic = instanceSettings.mqttTopic;
    let payloadString: string;
    try {
      payloadString = processActionTemplate(
        instanceSettings.mqttPayloadTemplate || '',
        details as unknown as Record<string, unknown>
      );
    } catch (tmplError: unknown) {
      return createErrorResult(
        `MQTT payload template error: ${(tmplError as Error).message}`,
        { tmplError }
      );
    }

    const actionFn = async () => {
      const client: MqttClient =
        await this.clientManager.getConnectedClient(pluginGlobalConfig);
      await new Promise<void>((resolve, reject) => {
        const publishOptions = {
          qos: (instanceSettings.mqttOptions?.qos ?? 0) as 0 | 1 | 2,
          retain: instanceSettings.mqttOptions?.retain ?? false,
        };
        const pubTimeout = setTimeout(
          () => reject(new Error(`Publish timeout to ${topic}`)),
          this.PUBLISH_TIMEOUT_MS
        );

        client.publish(topic, payloadString, publishOptions, (err) => {
          clearTimeout(pubTimeout);
          if (err) reject(err);
          else resolve();
        });
      });
      const mockResponse: Response = {
        // This is still fine as a placeholder for successful MQTT publish
        ok: true,
        status: 200,
        statusText: 'Published',
        headers: new Headers(),
        redirected: false,
        type: 'basic',
        url: '',
        clone: () => mockResponse,
        body: null,
        bodyUsed: true,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
        json: async () => ({}),
        text: async () => 'Published',
      } as unknown as Response;
      return { response: mockResponse, responseBody: instanceSettings };
    };

    const isRetryable = (_error: unknown, response?: Response): boolean => {
      if (_error instanceof Error) {
        const msg = _error.message.toLowerCase();
        if (
          msg.includes('timeout') ||
          msg.includes('econnrefused') ||
          msg.includes('enetunreach')
        ) {
          return true;
        }
      }
      if (response && !response.ok) return false;
      return true;
    };

    const result = await executeWithRetry<MqttActionInstanceSettings>({
      actionFn,
      isRetryableError: isRetryable,
      maxRetries: this.MAX_RETRIES,
      initialDelayMs: this.RETRY_DELAY_MS,
      actionName: `MQTT Publish to ${topic}`,
    });

    return result;
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
      const client = await this.clientManager.getConnectedClient(configToTest, true);
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
}