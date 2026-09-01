import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    phone: "",
    password: "",
  });

  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const phone = form.phone.trim();

    if (!phone) {
      setError("Please enter your phone number.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!termsAccepted) {
      setError("Please accept the Terms & Conditions to continue.");
      return;
    }

    setLoading(true);

    try {
      await register({
        phone,
        password: form.password,
        terms_accepted: true,
        terms_version: "2026-09-01",
      });

      navigate("/dashboard");
    } catch (err) {
      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map((item) => item.msg || "Invalid input")
            .join(", ")
        );
      } else {
        setError(
          detail ||
            err.message ||
            "Registration failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <main style={styles.wrapper}>
        <div style={styles.brand}>
          <div style={styles.logo}>BB</div>

          <div>
            <div style={styles.brandName}>
              BangBet<span style={{ color: "#FFC107" }}>254</span>
            </div>

            <div style={styles.brandTagline}>
              BET • WIN • WITHDRAW
            </div>
          </div>
        </div>

        <section style={styles.card}>
          <div style={styles.yellowBar} />

          <div style={styles.cardHeader}>
            <div style={styles.iconCircle}>🎯</div>

            <h1 style={styles.title}>Join BangBet254</h1>

            <p style={styles.subtitle}>
              Create your account and start betting
            </p>
          </div>

          {error && (
            <div style={styles.error}>
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label htmlFor="register-phone" style={styles.label}>
              M-Pesa Phone Number
            </label>

            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>📱</span>

              <input
                id="register-phone"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="254700000000"
                required
                autoComplete="tel"
                style={styles.input}
              />
            </div>

            <label htmlFor="register-password" style={styles.label}>
              Create Password
            </label>

            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>🔒</span>

              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
                style={{
                  ...styles.input,
                  paddingRight: "48px",
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.passwordButton}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>

            <label htmlFor="confirm-password" style={styles.label}>
              Confirm Password
            </label>

            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>🔐</span>

              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Repeat your password"
                required
                autoComplete="new-password"
                style={styles.input}
              />
            </div>

            <label style={styles.termsRow}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) =>
                  setTermsAccepted(event.target.checked)
                }
                style={styles.checkbox}
              />

              <span>
                I agree to the{" "}
                <span style={styles.termsLink}>
                  Terms & Conditions
                </span>{" "}
                and understand that betting involves financial risk.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <>
                  <span>⏳</span>
                  CREATING ACCOUNT...
                </>
              ) : (
                <>
                  CREATE MY ACCOUNT
                  <span style={styles.arrow}>→</span>
                </>
              )}
            </button>
          </form>

          <div style={styles.divider}>
            <span>ALREADY HAVE AN ACCOUNT?</span>
          </div>

          <Link to="/login" style={styles.loginButton}>
            LOGIN TO BANGBET254
          </Link>

          <p style={styles.footerText}>
            🔒 Your account information is securely protected.
          </p>
        </section>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #292929 0%, #111111 45%, #050505 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "25px 16px",
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  glowOne: {
    position: "absolute",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "rgba(255, 193, 7, 0.10)",
    filter: "blur(80px)",
    top: "-100px",
    left: "-100px",
  },

  glowTwo: {
    position: "absolute",
    width: "280px",
    height: "280px",
    borderRadius: "50%",
    background: "rgba(255, 193, 7, 0.08)",
    filter: "blur(80px)",
    bottom: "-120px",
    right: "-100px",
  },

  wrapper: {
    width: "100%",
    maxWidth: "440px",
    position: "relative",
    zIndex: 2,
  },

  brand: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "20px",
  },

  logo: {
    width: "50px",
    height: "50px",
    borderRadius: "14px",
    background: "#FFC107",
    color: "#111111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: 1000,
    boxShadow: "0 8px 25px rgba(255,193,7,0.30)",
  },

  brandName: {
    color: "#ffffff",
    fontSize: "25px",
    fontWeight: 900,
    letterSpacing: "-1px",
  },

  brandTagline: {
    color: "#FFC107",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "2px",
    marginTop: "2px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "24px",
    padding: "30px 32px",
    boxSizing: "border-box",
    boxShadow: "0 25px 80px rgba(0,0,0,0.45)",
    position: "relative",
    overflow: "hidden",
  },

  yellowBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "5px",
    background: "#FFC107",
  },

  cardHeader: {
    textAlign: "center",
    marginBottom: "25px",
  },

  iconCircle: {
    width: "58px",
    height: "58px",
    margin: "0 auto 14px",
    borderRadius: "50%",
    background: "#FFF8E1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
  },

  title: {
    margin: 0,
    color: "#111111",
    fontSize: "28px",
    fontWeight: 900,
    letterSpacing: "-1px",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#737373",
    fontSize: "14px",
  },

  error: {
    display: "flex",
    gap: "9px",
    alignItems: "center",
    padding: "12px 14px",
    marginBottom: "19px",
    borderRadius: "12px",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#B91C1C",
    fontSize: "13px",
    fontWeight: 700,
  },

  label: {
    display: "block",
    color: "#222222",
    fontSize: "13px",
    fontWeight: 800,
    marginBottom: "8px",
  },

  inputWrap: {
    position: "relative",
    marginBottom: "17px",
  },

  inputIcon: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "17px",
    zIndex: 1,
  },

  input: {
    width: "100%",
    height: "51px",
    boxSizing: "border-box",
    border: "2px solid #E5E5E5",
    borderRadius: "13px",
    background: "#FAFAFA",
    color: "#111111",
    padding: "0 14px 0 45px",
    fontSize: "15px",
    outline: "none",
  },

  passwordButton: {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "18px",
    padding: "6px",
  },

  termsRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    color: "#666666",
    fontSize: "12px",
    lineHeight: 1.5,
    margin: "3px 0 20px",
    cursor: "pointer",
  },

  checkbox: {
    width: "17px",
    height: "17px",
    marginTop: "1px",
    accentColor: "#FFC107",
    flexShrink: 0,
    cursor: "pointer",
  },

  termsLink: {
    color: "#111111",
    fontWeight: 800,
  },

  submitButton: {
    width: "100%",
    minHeight: "54px",
    border: "none",
    borderRadius: "13px",
    background: "#FFC107",
    color: "#111111",
    fontSize: "14px",
    fontWeight: 900,
    letterSpacing: "0.4px",
    boxShadow: "0 8px 22px rgba(255,193,7,0.28)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
  },

  arrow: {
    fontSize: "20px",
    fontWeight: 900,
  },

  divider: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "23px 0 14px",
    color: "#999999",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "1px",
  },

  loginButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "50px",
    boxSizing: "border-box",
    borderRadius: "13px",
    border: "2px solid #FFC107",
    background: "#FFFDF5",
    color: "#111111",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "0.4px",
  },

  footerText: {
    textAlign: "center",
    color: "#999999",
    fontSize: "11px",
    lineHeight: 1.5,
    margin: "17px 0 0",
  },
};
