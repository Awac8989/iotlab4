# MQTT Client - Scenario 2 (WiFi hardcoded in code)

Goal:
- MQTTX subscribe `/test/topic`
- ESP32 publish `Hello AIOT` to `/test/topic`
- MQTTX publish control to `/test/topic1`

## Steps
1. Hardcode in `app_main.c`:
   - `#define ESP_WIFI_SSID "YOUR_SSID"`
   - `#define ESP_WIFI_PASS "YOUR_PASSWORD"`
   - `#define ESP_BROKER_IP "mqtt://BROKER_IP:1883"`
2. On `MQTT_EVENT_CONNECTED`, subscribe `/test/topic1`.
3. In a FreeRTOS task, periodically publish `Hello AIOT` to `/test/topic`.
4. Use MQTTX to send command to `/test/topic1`, ESP32 receives in `MQTT_EVENT_DATA`.
