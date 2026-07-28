import { useState, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";
import "../styles/login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
          <div className="doc-line" style={{ width: "40%" }} />
          <div className="doc-line" style={{ width: "85%" }} />
          <div className="doc-line" style={{ width: "70%" }} />
          <div className="doc-line" style={{ width: "55%", marginBottom: 0 }} />
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
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
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
                  onChange={(e) => setPassword(e.target.value)}
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

          <div className="login-role-hint">
            <strong>Demo access:</strong> Log in with any seeded role — Admin, Sales,
            Warehouse, or Accounts — using the credentials provided in the README /
            submission notes.
          </div>
        </div>

        <div style={{ marginTop: 32 }}>
          <Footer />
        </div>
      </div>
    </div>
  );
}