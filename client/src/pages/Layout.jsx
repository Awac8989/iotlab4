import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearToken } from "../auth";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/main", label: "Main" },
  { to: "/charts", label: "Charts" },
  { to: "/logs", label: "Logs" },
];

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="lab-shell">
      <header className="lab-header">
        <h2>Smart Dashboard - IoT Lab 4</h2>
        <div className="lab-nav-wrap">
          <nav>
            {links.map((link) => (
              <Link
                className={`lab-nav-link ${location.pathname === link.to ? "active" : ""}`}
                key={link.to}
                to={link.to}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <button
            className="logout-btn"
            onClick={() => {
              clearToken();
              navigate("/login", { replace: true });
            }}
          >
            Logout
          </button>
        </div>
      </header>
      <main className="lab-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
