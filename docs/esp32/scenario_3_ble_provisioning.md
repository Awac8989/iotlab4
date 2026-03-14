# MQTT Client - Scenario 3 (WiFi via BLE provisioning)

Goal:
- Cấu hình WiFi qua app `ESP BLE Provisioning`.
- Sau provisioning, ESP32 tự chạy MQTT và publish dữ liệu BH1750 + DHT.

## Steps
1. Chạy `idf.py menuconfig`.
2. Vào `IoT Lab4 Firmware Settings`:
	- `WiFi mode` = `Scenario 3 - BLE provisioning (example_connect)`
3. Vào phần WiFi provisioning của example connect:
	- Bật provisioning qua BLE.
	- Thiết lập thông tin service POP nếu cần theo hướng dẫn IDF.
4. Build + flash:
	- `idf.py build`
	- `idf.py -p COMx flash monitor`
5. Mở app `ESP BLE Provisioning`, scan QR/payload trong terminal và nhập SSID/password.

## Expected
- Log có provisioning thành công, sau đó `MQTT connected`.
- Log định kỳ `Published sensor data -> T=... H=... L=...`.
- Web nhận dữ liệu realtime như Scenario 1/2.
