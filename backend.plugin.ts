/* FILE: extensions/plugins/mqtt/backend.plugin.ts */
import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { type ZodSchema } from 'zod';

import { BaseBackendPlugin } from '#backend/plugins/base-backend.plugin.js';

import { MqttActionHandler } from './action-handler.mqtt.js';
import manifestFromFile from './plugin.json' with { type: "json" };
import { MqttActionSettingsSchema, MqttGlobalConfigSchema, type MqttConfig } from './schemas.js';

import type { PluginManifest } from "#shared/types/index.js";

// Helper to wrap async route handlers and catch errors
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

class MqttBackendPlugin extends BaseBackendPlugin {
  #actionHandlerInstance: MqttActionHandler;

  constructor() {
    const actionHandler = new MqttActionHandler();
    super(manifestFromFile as PluginManifest, actionHandler);
    this.#actionHandlerInstance = actionHandler;
  }

  getGlobalConfigValidationSchema(): ZodSchema | null {
    return MqttGlobalConfigSchema;
  }

  getActionConfigValidationSchema(): ZodSchema | null {
    return MqttActionSettingsSchema;
  }
  
  public getApiRouter(): Router {
    const router = Router();
    
    router.post('/test', asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
        const configToTest = req.body as MqttConfig;
        const result = await this.testConnection(configToTest);
        res.status(200).json({ pluginId: this.manifest.id, ...result });
    }));
    
    return router;
  }

  public async testConnection(configToTest: MqttConfig): Promise<{ success: boolean; messageKey?: string; error?: { code?: string; message?: string } }> {
    return this.#actionHandlerInstance.testConnection(configToTest);
  }

  async destroy(): Promise<void> {
    this.#actionHandlerInstance['clientManager']?.destroy();  
    console.log('[MqttBackendPlugin] MQTT connections closed and resources cleaned up.');
  }
}

export default MqttBackendPlugin;