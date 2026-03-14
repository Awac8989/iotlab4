# MQTT Client - Scenario 1 (WiFi via menuconfig)

Goal:
- Subscribe `/topic/qos0`
- Publish `Hi from the IoT application` to `/topic/qos1`

## Steps
1. In ESP-IDF terminal run `idf.py menuconfig`.
2. Set WiFi SSID/password in Example Connection Configuration.
3. Set broker URL in Example Configuration, e.g. `mqtt://192.168.1.8:1883`.
4. In `app_main.c`, in `MQTT_EVENT_CONNECTED`:
   - `esp_mqtt_client_subscribe(client, "/topic/qos0", 0);`
   - `esp_mqtt_client_publish(client, "/topic/qos1", "Hi from the IoT application", 0, 1, 0);`
5. Flash and monitor with `idf.py -p COMx flash monitor`.
