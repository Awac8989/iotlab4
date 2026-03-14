# MQTT Client - Scenario 1 (WiFi via menuconfig)

Goal:
- ESP32 đọc BH1750 + DHT11/DHT22 và publish dữ liệu cảm biến về backend.
- Giữ đúng topic để web hiển thị nhiệt độ/độ ẩm/ánh sáng realtime.

## Wiring
- BH1750: `SDA -> GPIO21`, `SCL -> GPIO22`, `VCC -> 3V3`, `GND -> GND`
- DHT11/DHT22: `DATA -> GPIO4`, `VCC -> 3V3`, `GND -> GND`

## Steps
1. Mở terminal ESP-IDF tại `firmware/example210`.
2. Chạy `idf.py menuconfig`.
3. Vào `IoT Lab4 Firmware Settings`:
   - `WiFi mode` = `Scenario 1 - menuconfig (example_connect)`
   - `MQTT broker URL` = broker bạn dùng (mặc định `mqtt://broker.emqx.io:1883`)
   - `MQTT topic to publish room sensor JSON` giữ mặc định:
     `b556606d67dd8c7cecfab843fecbe28c/projet-IoT-2022-2023/hardware/Rooms Details`
   - Chọn `DHT sensor type` đúng phần cứng (`DHT22` hoặc `DHT11`)
4. Trong `Example Connection Configuration`, nhập SSID/password WiFi.
5. Build + flash:
   - `idf.py build`
   - `idf.py -p COMx flash monitor`

## Expected
- Log có `MQTT connected` và `Published sensor data -> T=... H=... L=...`
- Web `Main` page không còn `0 C / 0 % / 0 lx`.
