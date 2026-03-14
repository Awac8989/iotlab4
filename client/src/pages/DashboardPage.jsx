import { useEffect, useState } from "react";
import { apiRequest } from "./api";

function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await apiRequest("/dashboard");
        const result = await response.json();
        if (active && !result.error) {
          setDashboard(result.data);
        }
      } catch (error) {
        if (active) {
          setDashboard(null);
        }
      }
    };

    load();
    const interval = setInterval(load, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (!dashboard) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="panel-grid">
      <section className="panel">
        <h3>{dashboard.welcome}</h3>
        <p>Project: {dashboard.group.project}</p>
        <p>Group: {dashboard.group.name}</p>
        <p>Members: {dashboard.group.members.join(", ")}</p>
      </section>

      <section className="panel wide">
        <h3>Connected Devices (>=2)</h3>
        <table className="simple-table">
          <thead>
            <tr>
              <th>Device Name</th>
              <th>Device ID</th>
              <th>IP</th>
              <th>Status</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.devices.map((device) => (
              <tr key={device.deviceId}>
                <td>{device.deviceName}</td>
                <td>{device.deviceId}</td>
                <td>{device.ipAddress || "-"}</td>
                <td>{device.online ? "Online" : "Offline"}</td>
                <td>{new Date(device.lastSeen).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default DashboardPage;
