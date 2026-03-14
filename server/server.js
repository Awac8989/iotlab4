const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const {
  cors_config,
  mqtt_broker_config,
  database_uri,
} = require("./configuration");
const house_details = require("./structure");
const { mqtt_broker_setup, apis_setups, database_setup } = require("./setups");
const { show_house_updates } = require("./helps");

const app = express();
const port = process.env.PORT || 5000;

const deviceConnections = {
  "esp32-001": {
    deviceName: "ESP32 Main Node",
    ipAddress: "",
    lastSeen: new Date().toISOString(),
  },
  "esp8266-001": {
    deviceName: "ESP8266 Backup Node",
    ipAddress: "",
    lastSeen: new Date().toISOString(),
  },
};

const updateDeviceLastSeen = ({ deviceId, deviceName, ipAddress }) => {
  const id = deviceId || "esp32-001";
  deviceConnections[id] = {
    deviceName: deviceName || deviceConnections[id]?.deviceName || id,
    ipAddress: ipAddress || deviceConnections[id]?.ipAddress || "",
    lastSeen: new Date().toISOString(),
  };
};

// Configuration of database part
console.log("[Server] : Configuration of database part ...");
const {
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
} = database_setup(database_uri);

// Configuration of MQTT broker part
console.log("[Server] : Configuration of MQTT broker part ...");
const mqtt_broker_client = mqtt_broker_setup(
  mqtt_broker_config,
  show_house_updates,
  house_details,
  add_measurement,
  add_log,
  updateDeviceLastSeen
);

// Configuration of APIs part
console.log("[Server] : Configuration of APIs part ...");
const router = apis_setups(
  house_details,
  mqtt_broker_client,
  mqtt_broker_config,
  show_house_updates,
  read_measurements,
  {
    add_log,
    read_logs,
    read_all_logs,
    get_log_by_id,
    update_log,
    delete_log,
    create_user,
    find_user_by_username,
  },
  deviceConnections
);
app.use(cors(cors_config));
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(router);

app.listen(port, () => {
  console.log("[Server] : Server started on port " + port);
  show_house_updates(house_details, []);
});
