/* FILE: extensions/plugins/mqtt/schemas.ts */
import { z } from 'zod';

export const MqttGlobalConfigSchema = z.object({
  url: z.string().min(1, { message: "mqttBrokerUrlRequired" }).refine(
    (url) => url.startsWith("mqtt://") || url.startsWith("mqtts://") || url.startsWith("ws://") || url.startsWith("wss://"),
    { message: "mqttBrokerUrlInvalidScheme", path: ["url"] }
  ).or(z.literal("")),
  username: z.string().optional(),
  password: z.string().optional(),
}).refine(data => !(data.url === "" && (data.username || data.password)), {
  message: "mqttBrokerUrlRequiredWithCreds",
  path: ["url"],
});

export const MqttActionSettingsSchema = z.object({
    mqttTopic: z.string().min(1, { message: "mqttTopicRequired" }),
    mqttPayloadTemplate: z.string().optional(),
    mqttOptions: z.object({
        qos: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
        retain: z.boolean().optional(),
    }).optional(),
});

// Inferred types
export type MqttConfig = z.infer<typeof MqttGlobalConfigSchema>;
export type MqttActionInstanceSettings = z.infer<typeof MqttActionSettingsSchema>;