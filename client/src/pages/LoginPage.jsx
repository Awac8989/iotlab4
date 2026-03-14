import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setToken } from "../auth";
import { apiRequest } from "./api";

function LoginPage() {
  const [form, setForm] = useState({ username: "admin", password: "123456" });
  const [message, setMessage] = useState("Use default account admin/123456");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("Signing in...");

    try {
      const response = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (result.error) {
        setMessage(result.message);
      } else {
        setToken(result.data.token);
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      setMessage(error.message === "UNAUTHORIZED" ? "Invalid credentials" : error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>IoT Platform Login</h1>
        <p className="hint">Dang nhap de vao Dashboard/Main/Charts/Logs</p>

        <label>Username</label>
        <input
          value={form.username}
          onChange={(event) => setForm((s) => ({ ...s, username: event.target.value }))}
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={form.password}
          onChange={(event) => setForm((s) => ({ ...s, password: event.target.value }))}
          required
        />

        <button disabled={loading} type="submit">
          {loading ? "Loading..." : "Login"}
        </button>

        <p className="hint">{message}</p>
      </form>
    </div>
  );
}

export default LoginPage;
