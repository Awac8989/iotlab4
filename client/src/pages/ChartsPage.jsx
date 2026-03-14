import { useEffect, useState } from "react";
import { Line, Bar, Radar } from "react-chartjs-2";
import { apiRequest } from "./api";

function ChartsPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await apiRequest("/charts");
        const result = await response.json();
        if (active && !result.error) {
          setRows(result.data);
        }
      } catch (_) {
        if (active) {
          setRows([]);
        }
      }
    };

    load();
    const interval = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const labels = rows.map((row) => new Date(row.timestamp).toLocaleTimeString());
  const temperatures = rows.map((row) => row.temperature);
  const humidities = rows.map((row) => row.humidity);
  const lights = rows.map((row) => row.light);

  return (
    <div className="panel-grid">
      <section className="panel wide">
        <h3>Temperature - Line Chart</h3>
        <Line
          data={{
            labels,
            datasets: [{
              label: "Temperature",
              data: temperatures,
              borderColor: "#58f3ff",
              backgroundColor: "rgba(88,243,255,0.2)",
            }],
          }}
        />
      </section>

      <section className="panel">
        <h3>Humidity - Bar Chart</h3>
        <Bar
          data={{
            labels,
            datasets: [{ label: "Humidity", data: humidities, backgroundColor: "rgba(255,182,72,0.6)" }],
          }}
        />
      </section>

      <section className="panel">
        <h3>Light - Radar Chart</h3>
        <Radar
          data={{
            labels,
            datasets: [{
              label: "Light",
              data: lights,
              borderColor: "#7dff8d",
              backgroundColor: "rgba(125,255,141,0.25)",
            }],
          }}
        />
      </section>
    </div>
  );
}

export default ChartsPage;
