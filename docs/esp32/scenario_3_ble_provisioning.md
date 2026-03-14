# MQTT Client - Scenario 3 (WiFi via BLE provisioning)

Goal:
- Use mobile app `ESP BLE Provisioning` to provision SSID/password by scanning QR from ESP32 terminal.

## Steps
1. Build ESP-IDF project with WiFi provisioning manager BLE enabled.
2. Boot device and read QR payload in terminal.
3. Open `ESP BLE Provisioning` app and scan QR.
4. Select WiFi SSID and input password.
5. After provisioning success, ESP32 connects to WiFi then starts MQTT client.

## Evidence for report
- Screenshot QR in terminal.
- Screenshot app provisioning success.
- Terminal logs for BLE + WiFi + MQTT connected.
