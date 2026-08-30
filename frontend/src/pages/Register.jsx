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

    setLoading(true);

    try {
      await register({
        phone,
        password: form.password,
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
    <div className="page">
      <main
        className="container"
        style={{
          minHeight: "75vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "460px",
            padding: "32px",
            borderRadius: "18px",
            background: "#ffffff",
            color: "#111827",
            boxShadow: "0 15px 45px rgba(0,0,0,0.08)",
          }}
        >
          <h1
            style={{
              color: "#111827",
              fontSize: "32px",
              fontWeight: 800,
              margin: "0 0 10px",
            }}
          >
            Create your account
          </h1>

          <p
            style={{
              color: "#4b5563",
              fontSize: "16px",
              margin: "0 0 28px",
            }}
          >
            Join BangBet254 using your phone number.
          </p>

          {error && (
            <div
              style={{
                padding: "12px 14px",
                marginBottom: "18px",
                borderRadius: "10px",
                background: "#fee2e2",
                color: "#991b1b",
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="register-phone"
              style={labelStyle}
            >
              Phone number
            </label>

            <input
              id="register-phone"
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="254700000000"
              required
              autoComplete="tel"
              style={inputStyle}
            />

            <label
              htmlFor="register-password"
              style={labelStyle}
            >
              Password
            </label>

            <div style={{ position: "relative", marginBottom: "18px" }}>
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
                  ...inputStyle,
                  marginBottom: 0,
                  paddingRight: "48px",
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: "#64748b",
                  padding: "6px",
                  fontSize: "18px",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <label
              htmlFor="confirm-password"
              style={labelStyle}
            >
              Confirm password
            </label>

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
              style={{
                ...inputStyle,
                marginBottom: "22px",
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={buttonStyle}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p
            style={{
              marginTop: "24px",
              textAlign: "center",
              color: "#4b5563",
            }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              style={{
                color: "#111827",
                fontWeight: 700,
                textDecoration: "underline",
              }}
            >
              Login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

const labelStyle = {
  display: "block",
  color: "#111827",
  fontWeight: 700,
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  padding: "13px 14px",
  margin: "0 0 18px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
  color: "#111827",
  background: "#ffffff",
  fontSize: "15px",
  outline: "none",
};

const buttonStyle = {
  width: "100%",
  padding: "14px",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: "15px",
  background: "#111827",
  color: "#ffffff",
};
