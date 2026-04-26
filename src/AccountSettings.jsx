import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext.jsx";
import * as db from "./supabase.js";

export function AccountSettings() {
  const { user, linkWallet, updateProfile, logout } = useAuth();
  const [linkingWallet, setLinkingWallet] = useState(false);
  const [linkingEmail, setLinkingEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load user data when component mounts or user changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setBio(user.bio || "");
      setAvatarUrl(user.avatar_url || "");
    }
  }, [user]);

  const handleLinkWallet = async () => {
    if (!window.solana || !window.solana.isPhantom) {
      setError("Phantom wallet not found. Please install Phantom extension.");
      window.open("https://phantom.app/", "_blank");
      return;
    }

    try {
      setLinkingWallet(true);
      setError("");
      setMessage("");
      
      const resp = await window.solana.connect();
      const walletAddress = resp.publicKey.toString();

      const result = await linkWallet(walletAddress);
      
      if (result.success) {
        setMessage("✓ Wallet linked successfully!");
      } else {
        setError(result.error || "Failed to link wallet");
      }
      setLinkingWallet(false);
    } catch (err) {
      setLinkingWallet(false);
      setError("Wallet connection cancelled");
    }
  };

  const handleLinkEmail = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLinkingEmail(true);
    setError("");
    setMessage("");

    // For now, just update the profile with email
    // In production you'd verify the email first
    const result = await updateProfile({ email });
    
    if (result.success) {
      setMessage("✓ Email linked successfully!");
      setEmail("");
      setPassword("");
    } else {
      setError("Failed to link email");
    }
    setLinkingEmail(false);
  };

  const handleUpdateProfile = async () => {
    setError("");
    setMessage("");

    const updates = {};
    if (displayName !== user?.display_name) updates.display_name = displayName;
    if (bio !== user?.bio) updates.bio = bio;
    if (avatarUrl !== user?.avatar_url) updates.avatar_url = avatarUrl;

    if (Object.keys(updates).length === 0) {
      setError("No changes to save");
      return;
    }

    const result = await updateProfile(updates);
    
    if (result.success) {
      setMessage("✓ Profile updated!");
    } else {
      setError("Failed to update profile");
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    setError("");
    
    // Delete from database
    const success = await db.deleteProfile(user.id);
    
    if (success) {
      logout();
      window.location.href = '/';
    } else {
      setError("Failed to delete account");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!user) {
    return (
      <div className="settings-page">
        <p>Please log in to view account settings</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button 
          className="settings-back-btn"
          onClick={() => window.history.back()}
        >
          ← Back
        </button>
        <h1 className="settings-title">Account Settings</h1>
        <p className="settings-subtitle">@{user.username}</p>
      </div>

      {message && <div className="settings-message success">{message}</div>}
      {error && <div className="settings-message error">{error}</div>}

      {/* Profile Information */}
      <div className="settings-section">
        <h2 className="settings-section-title">Profile Information</h2>
        
        <div className="settings-form-group">
          <label className="settings-label">Display Name</label>
          <input
            className="settings-input"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
          />
        </div>

        <div className="settings-form-group">
          <label className="settings-label">Bio</label>
          <textarea
            className="settings-textarea"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            rows={4}
          />
        </div>

        <div className="settings-form-group">
          <label className="settings-label">Avatar URL</label>
          <input
            className="settings-input"
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
          />
        </div>

        <button className="settings-btn primary" onClick={handleUpdateProfile}>
          Save Profile Changes
        </button>
      </div>

      {/* Linked Accounts */}
      <div className="settings-section">
        <h2 className="settings-section-title">Linked Accounts</h2>

        {/* Email */}
        <div className="settings-linked-item">
          <div className="settings-linked-info">
            <span className="settings-linked-icon">📧</span>
            <div className="settings-linked-details">
              <span className="settings-linked-label">Email</span>
              {user.email ? (
                <span className="settings-linked-value">{user.email}</span>
              ) : (
                <span className="settings-linked-value unlinked">Not linked</span>
              )}
            </div>
          </div>
          {!user.email && (
            <div className="settings-link-form">
              <input
                className="settings-input inline"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="settings-input inline"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                className="settings-btn secondary"
                onClick={handleLinkEmail}
                disabled={linkingEmail}
              >
                {linkingEmail ? "Linking..." : "Link Email"}
              </button>
            </div>
          )}
        </div>

        {/* Wallet */}
        <div className="settings-linked-item">
          <div className="settings-linked-info">
            <span className="settings-linked-icon">👻</span>
            <div className="settings-linked-details">
              <span className="settings-linked-label">Phantom Wallet</span>
              {user.wallet_address ? (
                <span className="settings-linked-value mono">
                  {user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-8)}
                </span>
              ) : (
                <span className="settings-linked-value unlinked">Not linked</span>
              )}
            </div>
          </div>
          {!user.wallet_address && (
            <button
              className="settings-btn secondary"
              onClick={handleLinkWallet}
              disabled={linkingWallet}
            >
              {linkingWallet ? "Connecting..." : "Link Wallet"}
            </button>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="settings-section danger">
        <h2 className="settings-section-title">Danger Zone</h2>
        <p className="settings-section-desc">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        {!confirmDelete ? (
          <button 
            className="settings-btn danger"
            onClick={handleDeleteAccount}
          >
            Delete Account
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ color: 'var(--red)', fontSize: '13px' }}>
              Are you absolutely sure? This cannot be undone.
            </span>
            <button 
              className="settings-btn danger"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
            </button>
            <button 
              className="settings-btn secondary"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
