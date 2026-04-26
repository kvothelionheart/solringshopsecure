import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext.jsx";

export function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { updatePassword } = useAuth();

  const handleSubmit = async () => {
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Please fill in both fields");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    const result = await updatePassword(newPassword);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } else {
      setError(result.error || "Failed to update password");
    }
  };

  if (success) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-card">
          <div className="reset-success-icon">✓</div>
          <h1>Password Updated!</h1>
          <p>Redirecting you to the homepage...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-card">
        <h1 className="reset-password-title">Set New Password</h1>
        <p className="reset-password-subtitle">Enter your new password below</p>

        <div className="reset-form-group">
          <label className="reset-label">New Password</label>
          <input
            className="reset-input"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <div className="reset-form-group">
          <label className="reset-label">Confirm Password</label>
          <input
            className="reset-input"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        {error && <p className="reset-error">{error}</p>}

        <button
          className="reset-submit-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </div>
  );
}
