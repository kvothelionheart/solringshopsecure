import { useState } from "react";
import { useAuth } from "./AuthContext.jsx";

export function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login"); // login, signup, wallet, magiclink, forgot
  const [method, setMethod] = useState("email"); // email or wallet
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, signup, loginWithWallet, signupWithWallet, loginWithMagicLink, resetPassword } = useAuth();

  const handleEmailSubmit = async () => {
    setError("");
    setSuccess("");
    
    if (mode === "login") {
      if (!email || !password) {
        setError("Please enter email and password");
        return;
      }
      setLoading(true);
      try {
        const result = await login(email, password);
        setLoading(false);
        if (result.success) {
          onSuccess?.();
          onClose();
        } else {
          setError(result.error || "Login failed");
        }
      } catch (err) {
        setLoading(false);
        setError(`Login error: ${err.message}`);
      }
    } else {
      if (!email || !password || !username) {
        setError("Please fill all fields");
        return;
      }
      if (username.length < 3) {
        setError("Username must be at least 3 characters");
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setError("Username can only contain letters, numbers, and underscores");
        return;
      }
      setLoading(true);
      try {
        const result = await signup(email, password, username);
        setLoading(false);
        if (result.success) {
          if (result.needsEmailConfirmation) {
            setSuccess(result.message);
            setMode("confirmation");
          } else {
            onSuccess?.();
            onClose();
          }
        } else {
          setError(result.error || "Signup failed");
        }
      } catch (err) {
        setLoading(false);
        setError(`Signup error: ${err.message}`);
      }
    }
  };

  const handleMagicLink = async () => {
    setError("");
    setSuccess("");
    
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    const result = await loginWithMagicLink(email);
    setLoading(false);

    if (result.success) {
      setSuccess(result.message);
      setMode("confirmation");
    } else {
      setError(result.error);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setSuccess("");
    
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);

    if (result.success) {
      setSuccess(result.message);
      setMode("confirmation");
    } else {
      setError(result.error);
    }
  };

  const handleWalletConnect = async () => {
    setError("");
    
    if (!window.solana || !window.solana.isPhantom) {
      setError("Phantom wallet not found. Please install Phantom extension.");
      window.open("https://phantom.app/", "_blank");
      return;
    }

    try {
      setLoading(true);
      const resp = await window.solana.connect();
      const walletAddress = resp.publicKey.toString();

      if (mode === "login") {
        const result = await loginWithWallet(walletAddress);
        if (result.success) {
          onSuccess?.();
          onClose();
        } else {
          setError("Wallet not found. Please sign up first.");
        }
      } else {
        if (!username) {
          setError("Please enter a username");
          setLoading(false);
          return;
        }
        const result = await signupWithWallet(walletAddress, username);
        if (result.success) {
          onSuccess?.();
          onClose();
        } else {
          setError(result.error || "Signup failed");
        }
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError("Wallet connection cancelled");
    }
  };

  if (mode === "confirmation") {
    return (
      <div className="auth-modal-overlay" onClick={onClose}>
        <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
          <button className="auth-modal-close" onClick={onClose}>×</button>
          <div className="auth-confirmation">
            <div className="auth-confirmation-icon">✉️</div>
            <h2 className="auth-confirmation-title">Check Your Email</h2>
            <p className="auth-confirmation-message">{success}</p>
            <button className="auth-submit-btn" onClick={onClose}>
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "magiclink") {
    return (
      <div className="auth-modal-overlay" onClick={onClose}>
        <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
          <button className="auth-modal-close" onClick={onClose}>×</button>

          <div className="auth-modal-header">
            <h2 className="auth-modal-title">Magic Link</h2>
            <p className="auth-modal-subtitle">Sign in with a link sent to your email</p>
          </div>

          <div className="auth-modal-body">
            <div className="auth-form-group">
              <label className="auth-label">Email</label>
              <input
                className="auth-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button
              className="auth-submit-btn"
              onClick={handleMagicLink}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Magic Link"}
            </button>

            <div className="auth-toggle">
              <button
                className="auth-toggle-btn"
                onClick={() => { setMode("login"); setError(""); }}
              >
                Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <div className="auth-modal-overlay" onClick={onClose}>
        <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
          <button className="auth-modal-close" onClick={onClose}>×</button>

          <div className="auth-modal-header">
            <h2 className="auth-modal-title">Reset Password</h2>
            <p className="auth-modal-subtitle">We'll send you a reset link</p>
          </div>

          <div className="auth-modal-body">
            <div className="auth-form-group">
              <label className="auth-label">Email</label>
              <input
                className="auth-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button
              className="auth-submit-btn"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <div className="auth-toggle">
              <button
                className="auth-toggle-btn"
                onClick={() => { setMode("login"); setError(""); }}
              >
                Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>×</button>

        <div className="auth-modal-header">
          <h2 className="auth-modal-title">
            {mode === "login" ? "Welcome Back" : "Join The Community"}
          </h2>
          <p className="auth-modal-subtitle">
            {mode === "login" 
              ? "Sign in to your account" 
              : "Create your Sol Ring Shop profile"}
          </p>
        </div>

        {/* Method selector */}
        <div className="auth-method-tabs">
          <button
            className={`auth-method-tab ${method === "email" ? "active" : ""}`}
            onClick={() => setMethod("email")}
          >
            Email
          </button>
          <button
            className={`auth-method-tab ${method === "wallet" ? "active" : ""}`}
            onClick={() => setMethod("wallet")}
          >
            Wallet
          </button>
        </div>

        <div className="auth-modal-body">
          {method === "email" ? (
            <>
              {mode === "signup" && (
                <div className="auth-form-group">
                  <label className="auth-label">Username</label>
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              )}
              
              <div className="auth-form-group">
                <label className="auth-label">Email</label>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="auth-form-group">
                <label className="auth-label">Password</label>
                <div className="auth-password-wrapper">
                  <input
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              {error && <p className="auth-error">{error}</p>}
              {success && <p className="auth-success">{success}</p>}

              <button
                className="auth-submit-btn"
                onClick={handleEmailSubmit}
                disabled={loading}
              >
                {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
              </button>

              {mode === "login" && (
                <div className="auth-options">
                  <button
                    className="auth-option-btn"
                    onClick={() => { setMode("magiclink"); setError(""); }}
                  >
                    Use magic link instead
                  </button>
                  <button
                    className="auth-option-btn"
                    onClick={() => { setMode("forgot"); setError(""); }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {mode === "signup" && (
                <div className="auth-form-group">
                  <label className="auth-label">Username</label>
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              )}

              <div className="auth-wallet-box">
                <div className="auth-wallet-icon">👻</div>
                <p className="auth-wallet-text">
                  {mode === "login" 
                    ? "Connect your Phantom wallet to sign in"
                    : "Connect your Phantom wallet to create an account"}
                </p>
              </div>

              {error && <p className="auth-error">{error}</p>}

              <button
                className="auth-wallet-btn"
                onClick={handleWalletConnect}
                disabled={loading}
              >
                {loading ? "Connecting..." : "Connect Phantom Wallet"}
              </button>
            </>
          )}

          {/* Toggle between login/signup */}
          <div className="auth-toggle">
            {mode === "login" ? (
              <p>
                Don't have an account?{" "}
                <button
                  className="auth-toggle-btn"
                  onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  className="auth-toggle-btn"
                  onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
