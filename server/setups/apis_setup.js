const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const XLSX = require("xlsx");
const authMiddleware = require("../middlewares/auth_middleware");
const { sendSuccess, sendError } = require("../utils/api_response");

const jwtSecret = process.env.JWT_SECRET || "smart-dashboard-jwt-secret";

const setup = (
  house_details,
  mqtt_broker_client,
  mqtt_broker_config,
  show_house_updates,
  read_measurements,
  dataStore,
  deviceConnections
) => {
  const router = express.Router();

  const signToken = (user) => {
    return jwt.sign(
      {
        id: String(user._id),
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: "1d" }
    );
  };

  router.get("/health", (req, res) => sendSuccess(res, "Server healthy", { now: new Date().toISOString() }));

  router.post("/auth/register", async (req, res) => {
    try {
      const { username, password, fullName } = req.body;
      if (!username || !password) {
        return sendError(res, "username and password are required", {}, 400);
      }
      const user = await dataStore.create_user({ username, password, fullName });
      const token = signToken(user);
      return sendSuccess(
        res,
        "Register successful",
        {
          token,
          user: {
            username: user.username,
            fullName: user.fullName,
            role: user.role,
          },
        },
        201
      );
    } catch (error) {
      return sendError(res, "Register failed", { detail: error.message }, 400);
    }
  });

  router.post("/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return sendError(res, "username and password are required", {}, 400);
      }

      const user = await dataStore.find_user_by_username(username);
      if (!user) {
        return sendError(res, "Invalid credentials", {}, 401);
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return sendError(res, "Invalid credentials", {}, 401);
      }

      const token = signToken(user);
      return sendSuccess(res, "Login successful", {
        token,
        user: {
          username: user.username,
          fullName: user.fullName,
          role: user.role,
        },
      });
    } catch (error) {
      return sendError(res, "Login failed", { detail: error.message }, 500);
    }
  });

  router.get("/auth/me", authMiddleware, async (req, res) => {
    return sendSuccess(res, "Profile", { user: req.user });
  });

  router.get("/dashboard", authMiddleware, async (req, res) => {
    const deviceList = Object.keys(deviceConnections).map((deviceId) => ({
      deviceId,
      deviceName: deviceConnections[deviceId].deviceName,
      ipAddress: deviceConnections[deviceId].ipAddress,
      online: Date.now() - new Date(deviceConnections[deviceId].lastSeen).getTime() < 120000,
      lastSeen: deviceConnections[deviceId].lastSeen,
    }));

    return sendSuccess(res, "Dashboard loaded", {
      welcome: `Welcome ${req.user.fullName || req.user.username}`,
      group: {
        name: "IoT Lab 4 Group",
        project: "smart-dashboard",
        members: ["Member 1", "Member 2"],
      },
      devices: deviceList,
    });
  });

  router.get("/house-details", authMiddleware, (req, res) => {
    return sendSuccess(res, "House details", house_details);
  });

  router.patch("/devices-details", authMiddleware, async (req, res) => {
    const { Device, Status, deviceId, deviceName, ipAddress } = req.body;
    if (!Device || Status === undefined) {
      return sendError(res, "Device and Status are required", {}, 400);
    }

    house_details.devicesDetails[Device] = Status;

    const id = deviceId || "esp32-001";
    deviceConnections[id] = {
      deviceName: deviceName || Device.replace("is", "").replace("Active", ""),
      ipAddress: ipAddress || deviceConnections[id]?.ipAddress || "",
      lastSeen: new Date().toISOString(),
    };

    mqtt_broker_client.publish(
      mqtt_broker_config.topics_publish[0],
      JSON.stringify(house_details.devicesDetails),
      { qos: 0, retain: false }
    );

    await dataStore.add_log({
      deviceId: id,
      deviceName: deviceConnections[id].deviceName,
      ipAddress: deviceConnections[id].ipAddress,
      sensorType: "device_state",
      value: Status ? 1 : 0,
      source: "web",
    });

    show_house_updates(house_details, req.body);
    return sendSuccess(res, "Device state updated", { Device, Status });
  });

  router.patch("/rooms-details", authMiddleware, async (req, res) => {
    const { Feature, Room, Status } = req.body;
    if (!Feature || !Room || Status === undefined) {
      return sendError(res, "Feature, Room and Status are required", {}, 400);
    }

    if (Status === true && (Feature === "isAir ConditionerActive" || Feature === "isTemperatureActive")) {
      house_details.roomsDetails[Room]["isAir ConditionerActive"] = false;
      house_details.roomsDetails[Room]["isTemperatureActive"] = false;
    }

    house_details.roomsDetails[Room][Feature] = Status;

    mqtt_broker_client.publish(
      mqtt_broker_config.topics_publish[1] + "/" + Room,
      JSON.stringify(house_details.roomsDetails[Room]),
      { qos: 0, retain: false }
    );

    await dataStore.add_log({
      deviceId: "web-control",
      deviceName: Room,
      ipAddress: req.ip || "",
      sensorType: Feature,
      value: Status ? 1 : 0,
      room: Room,
      source: "web",
    });

    show_house_updates(house_details, req.body);
    return sendSuccess(res, "Room feature updated", { Room, Feature, Status });
  });

  router.patch("/rooms-details/temperature", authMiddleware, async (req, res) => {
    const { Room } = req.body;
    const newValue = Number(req.body["Device Temperature"]);

    if (!Room || Number.isNaN(newValue)) {
      return sendError(res, "Room and Device Temperature are required", {}, 400);
    }

    house_details.roomsDetails[Room]["Device Temperature"] = newValue;

    mqtt_broker_client.publish(
      mqtt_broker_config.topics_publish[1] + "/" + Room,
      JSON.stringify(house_details.roomsDetails[Room]),
      { qos: 0, retain: false }
    );

    show_house_updates(house_details, req.body);
    return sendSuccess(res, "Room temperature updated", { Room, value: newValue });
  });

  router.put("/led-control", authMiddleware, async (req, res) => {
    const led1 = !!req.body.led1;
    const led2 = !!req.body.led2;

    mqtt_broker_client.publish("led/n1", JSON.stringify({ value: led1 ? 1 : 0 }), { qos: 0, retain: false });
    mqtt_broker_client.publish("led/n2", JSON.stringify({ value: led2 ? 1 : 0 }), { qos: 0, retain: false });

    await dataStore.add_log({
      deviceId: "web-led",
      deviceName: "Web LED Controller",
      ipAddress: req.ip || "",
      sensorType: "led_n1",
      value: led1 ? 1 : 0,
      source: "mqtt",
    });

    await dataStore.add_log({
      deviceId: "web-led",
      deviceName: "Web LED Controller",
      ipAddress: req.ip || "",
      sensorType: "led_n2",
      value: led2 ? 1 : 0,
      source: "mqtt",
    });

    return sendSuccess(res, "LED control message published", { led1, led2 });
  });

  router.get("/measured-values", authMiddleware, async (req, res) => {
    const data = await read_measurements();
    return sendSuccess(res, "Measured values", data);
  });

  router.get("/sensors/current", authMiddleware, async (req, res) => {
    const data = await read_measurements();
    const current = data?.[0] || {
      temperature: 0,
      humidity: 0,
      light: 0,
      room: "N/A",
    };
    return sendSuccess(res, "Current sensor value", current);
  });

  router.get("/charts", authMiddleware, async (req, res) => {
    const values = await read_measurements();
    const rows = values
      .slice(0, 50)
      .reverse()
      .map((row) => ({
        timestamp: row.createdAt,
        temperature: Number(row.temperature || 0),
        humidity: Number(row.humidity || 0),
        light: Number(row.light || 0),
        room: row.room,
      }));

    return sendSuccess(res, "Chart data", rows);
  });

  router.get("/logs", authMiddleware, async (req, res) => {
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 10), 1), 100);
    const q = (req.query.q || "").trim();
    const sensorType = (req.query.sensorType || "").trim();

    const result = await dataStore.read_logs({
      page,
      pageSize,
      q,
      sensorType,
    });

    return sendSuccess(res, "Logs loaded", {
      page,
      pageSize,
      total: result.total,
      rows: result.rows,
    });
  });

  router.post("/logs", authMiddleware, async (req, res) => {
    try {
      const doc = await dataStore.add_log(req.body);
      return sendSuccess(res, "Log created", doc, 201);
    } catch (error) {
      return sendError(res, "Cannot create log", { detail: error.message }, 400);
    }
  });

  router.put("/logs/:id", authMiddleware, async (req, res) => {
    try {
      const updated = await dataStore.update_log(req.params.id, req.body);
      if (!updated) {
        return sendError(res, "Log not found", {}, 404);
      }
      return sendSuccess(res, "Log updated", updated);
    } catch (error) {
      return sendError(res, "Cannot update log", { detail: error.message }, 400);
    }
  });

  router.delete("/logs/:id", authMiddleware, async (req, res) => {
    const deleted = await dataStore.delete_log(req.params.id);
    if (!deleted) {
      return sendError(res, "Log not found", {}, 404);
    }
    return sendSuccess(res, "Log deleted", deleted);
  });

  router.get("/logs/export", authMiddleware, async (req, res) => {
    const q = (req.query.q || "").trim();
    const sensorType = (req.query.sensorType || "").trim();
    const format = (req.query.format || "csv").toLowerCase();
    const rows = await dataStore.read_all_logs({ q, sensorType });

    const normalized = rows.map((row) => ({
      ID: row.logId,
      IP: row.ipAddress,
      DeviceName: row.deviceName,
      DeviceID: row.deviceId,
      SensorType: row.sensorType,
      Value: row.value,
      Time: new Date(row.timestamp).toISOString(),
    }));

    if (format === "xlsx") {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(normalized);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Logs");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=logs.xlsx");
      return res.status(200).send(buffer);
    }

    const header = "ID,IP,DeviceName,DeviceID,SensorType,Value,Time";
    const csvRows = normalized.map((row) =>
      [row.ID, row.IP, row.DeviceName, row.DeviceID, row.SensorType, row.Value, row.Time].join(",")
    );
    const csv = [header, ...csvRows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=logs.csv");
    return res.status(200).send(csv);
  });

  return router;
};

module.exports = setup;
