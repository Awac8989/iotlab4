# MQTT Client - Scenario 2 (WiFi hardcoded in source)

Goal:
- Không dùng WiFi menuconfig.
- ESP32 tự connect bằng SSID/password cố định trong firmware.
- Đồng thời publish sensor data + test topic và nhận lệnh điều khiển.

## Steps
1. Mở `idf.py menuconfig`.
2. Vào `IoT Lab4 Firmware Settings`:
   - `WiFi mode` = `Scenario 2 - hardcoded in source`
   - `Hardcoded WiFi SSID` = SSID thật
   - `Hardcoded WiFi password` = mật khẩu thật
   - Kiểm tra `MQTT broker URL` và các topic.
3. Build + flash:
   - `idf.py build`
   - `idf.py -p COMx flash monitor`

## MQTT checks
- ESP32 publish `Hello AIOT` lên `/test/topic`.
- ESP32 subscribe `/test/topic1`.
- ESP32 subscribe `led/n1`, `led/n2` để điều khiển LED GPIO.

## Sensor checks
- ESP32 publish JSON cảm biến lên:
  `b556606d67dd8c7cecfab843fecbe28c/projet-IoT-2022-2023/hardware/Rooms Details`
- Backend nhận và ghi MongoDB, web hiển thị nhiệt độ/độ ẩm/ánh sáng.
