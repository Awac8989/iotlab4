import { useEffect, useState } from "react";
import { apiRequest } from "./api";

function MainPage() {
  const [current, setCurrent] = useState(null);
  const [ledState, setLedState] = useState({ led1: false, led2: false });
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await apiRequest("/sensors/current");
        const result = await response.json();
        if (active && !result.error) {
          setCurrent(result.data);
        }
      } catch (_) {
        if (active) {
          setCurrent(null);
        }
      }
    };

    load();
    const interval = setInterval(load, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const sendLed = async () => {
    try {
      const response = await apiRequest("/led-control", {
        method: "PUT",
        body: JSON.stringify(ledState),
      });
      const result = await response.json();
      setMessage(result.message);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="panel-grid">
      <section className="panel">
        <h3>Current Sensor Values</h3>
        <p>Room: {current?.room || "N/A"}</p>
        <p>Temperature: {current?.temperature ?? 0} C</p>
        <p>Humidity: {current?.humidity ?? 0} %</p>
        <p>Light: {current?.light ?? 0} lx</p>
      </section>

      <section className="panel">
        <h3>LED Real-time Control (MQTT)</h3>
        <label className="check-row">
          <input
            type="checkbox"
            checked={ledState.led1}
            onChange={(event) => setLedState((s) => ({ ...s, led1: event.target.checked }))}
          />
          LED N1 -> topic led/n1
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={ledState.led2}
            onChange={(event) => setLedState((s) => ({ ...s, led2: event.target.checked }))}
          />
          LED N2 -> topic led/n2
        </label>
        <button onClick={sendLed}>Send MQTT Command</button>
        <p>{message}</p>
      </section>
    </div>
  );
}

export default MainPage;
