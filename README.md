# gesture-vision-plugin-mqtt

Publishes messages to an MQTT broker.

---

<p align="center">
  <img src="https://raw.githubusercontent.com/your-repo/gesture-vision-app/main/path/to/icon.png" width="80" alt="MQTT Plugin Icon">
</p>
<h1 align="center">GestureVision - MQTT Plugin</h1>
<p align="center">
  <strong>Integrate with your IoT ecosystem by publishing custom messages to an MQTT broker on gesture detection.</strong>
</p>

---

The MQTT plugin allows GestureVision to act as an IoT device, sending messages to a central broker. This enables integration with a vast array of services and devices that support the MQTT protocol, such as Node-RED, Zigbee2MQTT, and custom ESPHome devices.

## ✨ Key Features

-   **Standard Compliant:** Connects to any standard MQTT broker (v3.1.1, v5).
-   **Secure Connections:** Supports `mqtt://`, `mqtts://`, and authentication with username/password.
-   **Custom Payloads:** Use a simple templating system to include dynamic data like the gesture name and confidence score in your message payload.
-   **Configurable Options:** Set Quality of Service (QoS) and the Retain flag for each message on a per-action basis.

## 🔧 Configuration

### Global Configuration

Before using MQTT actions, you must configure the connection to your broker.

1.  Navigate to **Settings -> Plugins**.
2.  Find the **MQTT** plugin card and click it to enter edit mode.
3.  Fill in the following fields:
    -   **MQTT Broker URL:** The full URL of your broker, including the protocol (e.g., `mqtt://192.168.1.50:1883`).
    -   **Username (Optional):** Your MQTT username, if required.
    -   **Password (Optional):** Your MQTT password, if required.
4.  Click the **Test Connection** button.
5.  Click **Save**.

Alternatively, you can edit the `extensions/plugins/gesture-vision-plugin-mqtt/config.mqtt.json` file:

```json
{
  "url": "mqtt://your-broker-ip:1883",
  "username": "your_username",
  "password": "your_password"
}
```

### Action Configuration

When you select "MQTT" as the Action Type for a gesture, you will see the following fields:

-   **Topic:** The MQTT topic to publish the message to (e.g., `gesturevision/events`).
-   **Payload Template (Optional):** The message body. You can use variables:
    -   `{{gestureName}}`: The name of the detected gesture.
    -   `{{confidence}}`: The confidence score (0.0 to 1.0).
    -   `{{timestamp}}`: The timestamp of the detection.
-   **QoS:** The Quality of Service level (0, 1, or 2).
-   **Retain:** Whether the broker should retain the message for new subscribers.

## 🚀 Usage Example

**Goal:** Publish a JSON payload to the `gesturevision/action` topic when a "Victory" sign is detected.

1.  Ensure your MQTT broker is configured in the Global Settings.
2.  Go to the **Gesture Settings** panel.
3.  Select **"Victory"** from the Gesture dropdown.
4.  For **Action Type**, select **"MQTT"**.
5.  Configure the action settings:
    -   **Topic:** `gesturevision/action`
    -   **Payload Template:** `{"gesture": "{{gestureName}}", "confidence_percent": {{confidence}}}`
    -   **QoS:** `1`
    -   **Retain:** Unchecked
6.  Click **Add Configuration**.

Now, making a victory sign will publish a message like `{"gesture": "VICTORY", "confidence_percent": 0.95}` to your MQTT broker.

---

Part of the **GestureVision** application.