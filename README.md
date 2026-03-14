# Smart Dashboard - IoT Lab 4

This repository is updated to satisfy Lab 4 requirements with full components:
- Device: ESP32/ESP8266 (BH1750 + DHT11/DHT22)
- API: Node.js/Express REST APIs
- Database: MongoDB
- Web UI: Login, Dashboard, Main, Charts, Logs
- IoT Platform local: EMQX + MongoDB using Docker Compose

## 1. Run local IoT platform

```bash
cd platform-local
docker compose up -d
```

Services:
- EMQX MQTT broker: `mqtt://localhost:1883`
- EMQX websocket: `ws://localhost:8083`
- EMQX dashboard: `http://localhost:18083`
- MongoDB: `mongodb://localhost:27017`

## 2. Run backend API

```bash
cd server
npm install
npm start
```

Default config:
- Port: `5000`
- MongoDB URI: `mongodb://127.0.0.1:27017/smart_dashboard`

Default account created automatically:
- Username: `admin`
- Password: `123456`

## 3. Run frontend

```bash
cd client
npm install
npm start
```

Open:
- `http://localhost:3000` (or `http://localhost:3001` if 3000 is busy)

## 4. Implemented pages

- `Login`: username/password + JWT authentication
- `Dashboard`: welcome, group info, device status, last seen (>=2 devices)
- `Main`: current sensor values and control LED N1/N2 via MQTT (`led/n1`, `led/n2`)
- `Charts`: real-time 3 chart types
  - Temperature: Line
  - Humidity: Bar
  - Light: Radar
- `Logs`: table with pagination + auto refresh + search/filter + CSV/XLSX export

Required log fields:
- ID
- IP
- Device Name
- Device ID
- Sensor Type
- Value
- Time

## 5. API summary

All APIs return JSON in this format:

```json
{
  "error": false,
  "message": "this is a message of API",
  "data": {}
}
```

Main endpoints:
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /dashboard`
- `GET /house-details`
- `PATCH /devices-details`
- `PATCH /rooms-details`
- `PATCH /rooms-details/temperature`
- `PUT /led-control`
- `GET /sensors/current`
- `GET /charts`
- `GET /logs`
- `POST /logs`
- `PUT /logs/:id`
- `DELETE /logs/:id`
- `GET /logs/export?format=csv|xlsx`

## 6. MQTT Client requirements for ESP32

See detailed guides:
- `docs/esp32/scenario_1_menuconfig.md`
- `docs/esp32/scenario_2_hardcoded_wifi.md`
- `docs/esp32/scenario_3_ble_provisioning.md`

These cover:
- Menuconfig WiFi + `/topic/qos0` subscribe and `/topic/qos1` publish
- Hardcoded WiFi + `/test/topic` and `/test/topic1`
- BLE provisioning via `ESP BLE Provisioning` app

## 7. Database design notes for report

Collections:
- `room_details`: room sensor snapshots (temperature, humidity, light, room, device, ip)
- `device_logs`: detailed logs (id, ip, deviceName, sensorType, value, timestamp)
- `users`: authentication users (username, passwordHash, role)
