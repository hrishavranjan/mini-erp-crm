import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "./Footer";
import "../styles/layout.css";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles: string[]; // which roles can see this nav item
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "◱", roles: ["admin", "sales", "warehouse", "accounts"] },
  { to: "/customers", label: "Customers (CRM)", icon: "◔", roles: ["admin", "sales", "accounts", "warehouse"] },
  { to: "/products", label: "Products & Stock", icon: "▤", roles: ["admin", "sales", "warehouse", "accounts"] },
  { to: "/challans", label: "Sales Challans", icon: "▣", roles: ["admin", "sales", "warehouse", "accounts"] },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const visibleItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">E</div>
          Mini ERP + CRM
        </div>

        <div className="nav-section-label">Menu</div>
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div>
            <h1>Operations Portal</h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="badge badge-info" style={{ textTransform: "capitalize" }}>
              {user?.role} access
            </div>

            <div className="user-menu" ref={menuRef}>
              <button className="user-menu-trigger" onClick={() => setMenuOpen((o) => !o)}>
                <div className="user-avatar">{user ? initials(user.name) : "?"}</div>
                <span className="user-menu-chevron" data-open={menuOpen}>▾</span>
              </button>

              {menuOpen && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    <div className="user-avatar">{user ? initials(user.name) : "?"}</div>
                    <div>
                      <div className="user-name">{user?.name}</div>
                      <div className="user-role">{user?.role}</div>
                    </div>
                  </div>
                  <div className="user-menu-divider" />
                  <button className="user-menu-item" onClick={handleLogout}>
                    <span>←</span> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>

        <Footer />
      </div>
    </div>
  );
}