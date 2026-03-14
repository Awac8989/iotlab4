import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "./api";

function LogsPage() {
  const [state, setState] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    q: "",
    sensorType: "",
    rows: [],
  });

  const loadLogs = useCallback(async (nextState) => {
    const query = new URLSearchParams({
      page: String(nextState.page),
      pageSize: String(nextState.pageSize),
      q: nextState.q,
      sensorType: nextState.sensorType,
    }).toString();

    const response = await apiRequest(`/logs?${query}`);
    const result = await response.json();
    if (!result.error) {
      setState((s) => ({ ...s, total: result.data.total, rows: result.data.rows }));
    }
  }, []);

  useEffect(() => {
    let active = true;
    const queryState = {
      page: state.page,
      pageSize: state.pageSize,
      q: state.q,
      sensorType: state.sensorType,
    };

    const run = async () => {
      if (!active) return;
      try {
        await loadLogs(queryState);
      } catch (_) {
        if (active) {
          setState((s) => ({ ...s, rows: [] }));
        }
      }
    };

    run();
    const interval = setInterval(run, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [state.page, state.pageSize, state.q, state.sensorType, loadLogs]);

  const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));

  const exportFile = async (format) => {
    const query = new URLSearchParams({
      q: state.q,
      sensorType: state.sensorType,
      format,
    }).toString();

    const response = await apiRequest(`/logs/export?${query}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "xlsx" ? "logs.xlsx" : "logs.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="panel">
      <h3>Sensor Logs</h3>
      <div className="toolbar">
        <input
          placeholder="Search by ID/IP/device/room"
          value={state.q}
          onChange={(event) => setState((s) => ({ ...s, q: event.target.value, page: 1 }))}
        />
        <select
          value={state.sensorType}
          onChange={(event) => setState((s) => ({ ...s, sensorType: event.target.value, page: 1 }))}
        >
          <option value="">All sensors</option>
          <option value="temperature">Temperature</option>
          <option value="humidity">Humidity</option>
          <option value="light">Light</option>
          <option value="device_state">Device State</option>
        </select>
        <button onClick={() => exportFile("csv")}>Export CSV</button>
        <button onClick={() => exportFile("xlsx")}>Export XLSX</button>
      </div>

      <table className="simple-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>IP</th>
            <th>Device Name</th>
            <th>Sensor</th>
            <th>Value</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {state.rows.map((row) => (
            <tr key={row._id}>
              <td>{row.logId}</td>
              <td>{row.ipAddress || "-"}</td>
              <td>{row.deviceName}</td>
              <td>{row.sensorType}</td>
              <td>{row.value}</td>
              <td>{new Date(row.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pager">
        <button
          disabled={state.page <= 1}
          onClick={() => setState((s) => ({ ...s, page: s.page - 1 }))}
        >
          Prev
        </button>
        <span>
          Page {state.page} / {totalPages} - Total {state.total}
        </span>
        <button
          disabled={state.page >= totalPages}
          onClick={() => setState((s) => ({ ...s, page: s.page + 1 }))}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default LogsPage;
