const mqtt = require("mqtt");

const setup = (
  mqtt_broker_config,
  show_house_updates,
  house_details,
  add_measurement,
  add_log,
  updateDeviceLastSeen
) => {
  console.log("[Server] : Connecting to MQTT broker ...");
  const client = mqtt.connect(mqtt_broker_config.connectUrl, mqtt_broker_config.options);

  client.on("connect", () => {
    console.log("[Server] : Connected to MQTT broker");
    client.subscribe(mqtt_broker_config.topics_subscribe, (_, topics) => {
      console.log("[Server] : Subscribe to topics ");
      console.table(topics);
    });
  });

  client.on("message", async (topic, payloadBuffer) => {
    let data = null;

    try {
      data = JSON.parse(payloadBuffer.toString());
      if (typeof data === "string") {
        data = JSON.parse(data);
      }

      const room = data.Room || data.room || "Living Room";
      const deviceId = data.deviceId || "esp32-001";
      const deviceName = data.deviceName || room;
      const ipAddress = data.ipAddress || "";
      const lightValue = Number(data["Measured Light"] || data.light || 0);

      updateDeviceLastSeen({
        deviceId,
        deviceName,
        ipAddress,
      });

      if (topic === mqtt_broker_config.topics_subscribe[1]) {
        const message = data.message;

        if (message === undefined && room !== undefined) {
          const measuredTemp = Number(data["Measured Temperature"] || data.temperature || 0);
          const measuredHum = Number(data["Measured Humidity"] || data.humidity || 0);

          house_details.roomsDetails[room]["Measured Temperature"] = measuredTemp.toFixed(1);
          house_details.roomsDetails[room]["Measured Humidity"] = measuredHum.toFixed(1);
          house_details.roomsDetails[room]["Measured Light"] = lightValue.toFixed(0);

          await add_measurement({
            room,
            deviceId,
            deviceName,
            ipAddress,
            temperature: measuredTemp,
            humidity: measuredHum,
            light: lightValue,
          });

          await add_log({
            deviceId,
            deviceName,
            ipAddress,
            room,
            sensorType: "temperature",
            value: measuredTemp,
            source: "mqtt",
          });

          await add_log({
            deviceId,
            deviceName,
            ipAddress,
            room,
            sensorType: "humidity",
            value: measuredHum,
            source: "mqtt",
          });

          await add_log({
            deviceId,
            deviceName,
            ipAddress,
            room,
            sensorType: "light",
            value: lightValue,
            source: "mqtt",
          });
        } else {
          client.publish(
            mqtt_broker_config.topics_publish[1] + "/" + room,
            JSON.stringify(house_details.roomsDetails[room]),
            { qos: 0, retain: false },
            (error) => {
              if (error) {
                console.error(error);
              }
            }
          );
        }

        show_house_updates(house_details, data);
      } else if (topic === mqtt_broker_config.topics_subscribe[0]) {
        client.publish(
          mqtt_broker_config.topics_publish[0],
          JSON.stringify(house_details.devicesDetails),
          { qos: 0, retain: false },
          (error) => {
            if (error) {
              console.error(error);
            }
          }
        );

        show_house_updates(house_details, data);
      }
    } catch (error) {
      console.error(error);
      console.error("\n\n========> Wrong message format " + payloadBuffer.toString() + " from " + topic);
    }
  });

  return client;
};

module.exports = setup;
