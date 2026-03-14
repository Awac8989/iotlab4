const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const setup = (mong_db_uri) => {
  const measurementSchema = new mongoose.Schema(
    {
      room: String,
      deviceId: String,
      deviceName: String,
      ipAddress: String,
      temperature: Number,
      humidity: Number,
      light: Number,
      date: String,
    },
    { timestamps: true }
  );

  const logSchema = new mongoose.Schema(
    {
      logId: { type: String, unique: true, index: true },
      deviceId: { type: String, required: true, index: true },
      deviceName: { type: String, required: true },
      ipAddress: { type: String, default: "" },
      sensorType: { type: String, required: true, index: true },
      value: { type: Number, required: true },
      room: { type: String, default: "" },
      source: { type: String, default: "mqtt" },
      timestamp: { type: Date, default: Date.now, index: true },
    },
    { timestamps: true }
  );

  const userSchema = new mongoose.Schema(
    {
      username: { type: String, required: true, unique: true, index: true },
      passwordHash: { type: String, required: true },
      fullName: { type: String, default: "IoT User" },
      role: { type: String, default: "student" },
    },
    { timestamps: true }
  );

  const MeasurementModel = mongoose.models.room_details || mongoose.model("room_details", measurementSchema);
  const LogModel = mongoose.models.device_logs || mongoose.model("device_logs", logSchema);
  const UserModel = mongoose.models.users || mongoose.model("users", userSchema);

  mongoose
    .connect(mong_db_uri)
    .then(async () => {
      console.log("[Server] : Connected to MongoDB");
      await ensureDefaultUser();
    })
    .catch((error) => {
      console.error("[Server] : MongoDB connection error", error.message);
    });

  async function ensureDefaultUser() {
    const found = await UserModel.findOne({ username: "admin" });
    if (!found) {
      const passwordHash = await bcrypt.hash("123456", 10);
      await UserModel.create({
        username: "admin",
        passwordHash,
        fullName: "Admin User",
        role: "admin",
      });
      console.log("[Server] : Default user created -> admin/123456");
    }
  }

  async function add_measurement(data) {
    const doc = {
      room: data.room || "Unknown",
      deviceId: data.deviceId || "esp32-001",
      deviceName: data.deviceName || "ESP32 Node",
      ipAddress: data.ipAddress || "",
      temperature: Number(data.temperature || 0),
      humidity: Number(data.humidity || 0),
      light: Number(data.light || 0),
      date: new Date().toLocaleString(),
    };
    await MeasurementModel.collection.insertOne(doc);
    return doc;
  }

  async function read_measurements() {
    return MeasurementModel.find({}).sort({ createdAt: -1 }).limit(1000);
  }

  async function add_log(log) {
    const now = new Date();
    const logId = `${log.deviceId || "device"}-${now.getTime()}-${Math.floor(Math.random() * 9999)}`;
    return LogModel.create({
      logId,
      deviceId: log.deviceId || "esp32-001",
      deviceName: log.deviceName || "ESP32 Node",
      ipAddress: log.ipAddress || "",
      sensorType: log.sensorType || "temperature",
      value: Number(log.value || 0),
      room: log.room || "",
      source: log.source || "mqtt",
      timestamp: log.timestamp ? new Date(log.timestamp) : now,
    });
  }

  async function read_logs({ page = 1, pageSize = 10, q = "", sensorType = "" }) {
    const filter = {};
    if (q) {
      filter.$or = [
        { deviceId: { $regex: q, $options: "i" } },
        { deviceName: { $regex: q, $options: "i" } },
        { ipAddress: { $regex: q, $options: "i" } },
        { room: { $regex: q, $options: "i" } },
      ];
    }
    if (sensorType) {
      filter.sensorType = sensorType;
    }

    const total = await LogModel.countDocuments(filter);
    const rows = await LogModel.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    return { total, rows };
  }

  async function read_all_logs({ q = "", sensorType = "" }) {
    const filter = {};
    if (q) {
      filter.$or = [
        { deviceId: { $regex: q, $options: "i" } },
        { deviceName: { $regex: q, $options: "i" } },
        { ipAddress: { $regex: q, $options: "i" } },
        { room: { $regex: q, $options: "i" } },
      ];
    }
    if (sensorType) {
      filter.sensorType = sensorType;
    }
    return LogModel.find(filter).sort({ timestamp: -1 }).limit(5000);
  }

  async function get_log_by_id(id) {
    return LogModel.findById(id);
  }

  async function update_log(id, payload) {
    return LogModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  }

  async function delete_log(id) {
    return LogModel.findByIdAndDelete(id);
  }

  async function create_user({ username, password, fullName }) {
    const existing = await UserModel.findOne({ username });
    if (existing) {
      throw new Error("Username already exists");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ username, passwordHash, fullName: fullName || username });
    return user;
  }

  async function find_user_by_username(username) {
    return UserModel.findOne({ username });
  }

  return {
    add_measurement,
    read_measurements,
    add_log,
    read_logs,
    read_all_logs,
    get_log_by_id,
    update_log,
    delete_log,
    create_user,
    find_user_by_username,
  };
};

module.exports = setup;
