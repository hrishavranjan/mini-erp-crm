import { useEffect, useState, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";
import "../styles/login.css";

const DEMO_EMAILS = [
  "admin@erp.com",
  "sales@erp.com",
  "warehouse@erp.com",
  "accounts@erp.com",
];
const DEMO_PASSWORD = "Password@123";

const STORAGE_EMAIL_KEY = "demo_login_email";
const STORAGE_PASSWORD_KEY = "demo_login_password";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  // Restore last-used (or default) demo credentials on every mount —
  // i.e. on refresh, and whenever the user lands back here after logout.
  useEffect(() => {
    const savedEmail = localStorage.getItem(STORAGE_EMAIL_KEY);
    const savedPassword = localStorage.getItem(STORAGE_PASSWORD_KEY);
    setEmail(savedEmail || DEMO_EMAILS[0]);
    setPassword(savedPassword || DEMO_PASSWORD);
  }, []);

  function handleEmailChange(value: string) {
    setEmail(value);
    localStorage.setItem(STORAGE_EMAIL_KEY, value);
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    localStorage.setItem(STORAGE_PASSWORD_KEY, value);
  }

  function fillDemo(demoEmail: string) {
    handleEmailChange(demoEmail);
    handlePasswordChange(DEMO_PASSWORD);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      const redirectTo = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      {/* Left visual/branding panel */}
      <div className="login-visual">
        <div className="login-brand">
          <div className="login-brand-mark">E</div>
          Mini ERP + CRM
        </div>

        <div className="login-visual-copy">
          <h1>Run your operations from one clean portal.</h1>
          <p>
            Manage customers, track inventory, and generate sales challans — all with
            role-based access for Admin, Sales, Warehouse, and Accounts teams.
          </p>
        </div>

        <div className="login-doc-preview">
          <div className="doc-preview-topbar">
            <span className="doc-dot doc-dot-a" />
            <span className="doc-dot doc-dot-b" />
            <span className="doc-dot doc-dot-c" />
            <span className="doc-preview-title">Live preview</span>
          </div>
          <div className="doc-preview-chips">
            <span className="doc-chip">Customers</span>
            <span className="doc-chip">Stock</span>
            <span className="doc-chip">Challans</span>
          </div>
          <div className="doc-line" style={{ width: "80%" }} />
          <div className="doc-line" style={{ width: "60%", marginBottom: 0 }} />
        </div>

        <div className="login-visual-footer">
          Secure JWT authentication &nbsp;•&nbsp; Role-based access control
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
        <div className="login-form-card">
          <h2>Welcome back</h2>
          <p className="subtitle">Sign in to access your operations dashboard.</p>

          {error && (
            <div className="error-banner" style={{ marginBottom: 18 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                className="input"
                type="email"
                list="demo-emails"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                required
                autoFocus
              />
              <datalist id="demo-emails">
                {DEMO_EMAILS.map((demoEmail) => (
                  <option key={demoEmail} value={demoEmail} />
                ))}
              </datalist>
            </div>

            <div className="field">
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="password-field">
                <input
                  id="password"
                  className="input"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  required
                  style={{ paddingRight: 56 }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary login-submit"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <details className="login-role-hint" open={demoOpen} onToggle={(e) => setDemoOpen((e.target as HTMLDetailsElement).open)}>
            <summary className="demo-summary">
              <span>Demo access</span>
              <span className="demo-summary-hint">tap to {demoOpen ? "hide" : "view"} credentials</span>
            </summary>

            <p className="demo-copy">
              Pick a role, or type any email into the field above — it's an editable
              dropdown. Password is shared across roles and editable too.
            </p>

            <div className="demo-cred-list">
              {DEMO_EMAILS.map((demoEmail) => (
                <button
                  type="button"
                  key={demoEmail}
                  className="demo-cred-row"
                  onClick={() => fillDemo(demoEmail)}
                >
                  <span className="demo-cred-role-dot" />
                  <span className="demo-cred-email">{demoEmail}</span>
                  <span className="demo-cred-role">{demoEmail.split("@")[0]}</span>
                </button>
              ))}
            </div>

            <div className="demo-cred-password">
              Password for all roles: <code>{DEMO_PASSWORD}</code>
            </div>
          </details>
        </div>

        <div style={{ marginTop: 32 }}>
          <Footer />
        </div>
      </div>
    </div>
  );
}