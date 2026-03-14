# Flash guide (COM11, menuconfig)

Board: ESP32 (CP210x on COM11)
Project path: `q:\IOT_Lab4\smart-dashboard\firmware\example210`

## A) VS Code (ESP-IDF extension) - recommended

1. Open folder `q:\IOT_Lab4\smart-dashboard\firmware\example210` in VS Code.
2. Press `Ctrl+Shift+P` -> run `ESP-IDF: Configure ESP-IDF extension` if this is first run.
3. Press `Ctrl+Shift+P` -> `ESP-IDF: Set Espressif Device Target` -> choose your chip (esp32 or esp32c3).
4. Press `Ctrl+Shift+P` -> `ESP-IDF: SDK Configuration editor (menuconfig)`.
   - In `Example Connection Configuration` set WiFi SSID/password.
   - In `Example Configuration` set `Broker URL` to your broker, e.g. `mqtt://192.168.1.8:1883`.
5. In status bar select serial port `COM11`.
6. Run `ESP-IDF: Build your project`.
7. Run `ESP-IDF: Flash your project`.
8. Run `ESP-IDF: Monitor your device`.

Expected log:
- `MQTT_EVENT_CONNECTED`
- publish to `/topic/qos1` with message `Hi from the IoT application`
- subscribed `/topic/qos0`

## B) ESP-IDF terminal (CLI)

If `idf.py` is available in terminal:

```bash
cd q:\IOT_Lab4\smart-dashboard\firmware\example210
idf.py set-target esp32
idf.py menuconfig
idf.py -p COM11 flash monitor
```

Use MQTTX to verify:
- Subscribe `/topic/qos1` -> should receive `Hi from the IoT application`
- Publish any payload to `/topic/qos0` -> should appear in monitor logs
