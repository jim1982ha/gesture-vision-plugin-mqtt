/* FILE: extensions/plugins/mqtt/action-handler.mqtt.ts */
import { MqttClient } from 'mqtt';
import type { Response } from 'node-fetch';

import { processActionTemplate } from '#shared/index.js';
import { createErrorResult, executeWithRetry } from '#backend/utils/action-helpers.js';
import { type MqttClientManager } from './helpers/mqtt-client-manager.js';
import { type MqttConfig, type MqttActionInstanceSettings } from './schemas.js';

import type { ActionDetails, ActionResult } from '#shared/index.js';
import type { ActionHandler } from '#backend/types/index.js';

export class MqttActionHandler implements ActionHandler {
  private readonly PUBLISH_TIMEOUT_MS = 5000;
  private readonly MAX_RETRIES = 1;
  private readonly RETRY_DELAY_MS = 1500;
  private clientManager: MqttClientManager;

  constructor(clientManager: MqttClientManager) {
    this.clientManager = clientManager;
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

    const isRetryable = (error: unknown, response?: Response): boolean => {
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
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
}