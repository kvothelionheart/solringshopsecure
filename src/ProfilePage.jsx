import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext.jsx";
import * as db from "./supabase.js";

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatPrice(price) {
  if (!price) return "$0.00";
  return `$${parseFloat(price).toFixed(2)}`;
}

export function ProfilePage({ username }) {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("orders"); // orders, reviews, stats
  const { user, logout } = useAuth();

  const isOwnProfile = user?.username === username;

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    const profileData = await db.getProfileByUsername(username);
    if (profileData) {
      setProfile(profileData);
      const orderData = await db.getOrdersByProfile(profileData.id);
      setOrders(orderData);
      const reviewData = await db.getReviewsByProfile(profileData.id);
      setReviews(reviewData);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-not-found">
          <h1>Profile Not Found</h1>
          <p>No user with username "{username}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Top navigation */}
      <div className="profile-top-nav">
        <button 
          className="profile-back-btn"
          onClick={() => window.location.href = '/'}
        >
          ← Back to Shop
        </button>
        {isOwnProfile && (
          <button 
            className="profile-logout-btn"
            onClick={() => {
              logout();
              window.location.href = '/';
            }}
          >
            Sign Out
          </button>
        )}
      </div>

      <div className="profile-header">
        <div className="profile-avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} />
          ) : (
            <div className="profile-avatar-placeholder">
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="profile-info">
          <h1 className="profile-username">@{profile.username}</h1>
          {profile.display_name && (
            <p className="profile-display-name">{profile.display_name}</p>
          )}
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <div className="profile-meta">
            <span className="profile-meta-item">
              Joined {formatDate(profile.joined_at)}
            </span>
            {profile.wallet_address && (
              <span className="profile-meta-item">
                🔗 {profile.wallet_address.slice(0, 4)}...{profile.wallet_address.slice(-4)}
              </span>
            )}
          </div>
        </div>
        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat-num">{orders.length}</span>
            <span className="profile-stat-label">Orders</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-num">{reviews.length}</span>
            <span className="profile-stat-label">Reviews</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-num">{formatPrice(profile.total_spent)}</span>
            <span className="profile-stat-label">Total Spent</span>
          </div>
          {profile.token_balance > 0 && (
            <div className="profile-stat token">
              <span className="profile-stat-num">⭕ {profile.token_balance}</span>
              <span className="profile-stat-label">Tokens</span>
            </div>
          )}
        </div>
      </div>

      <div className="profile-tabs">
        <button
          className={`profile-tab ${tab === "orders" ? "active" : ""}`}
          onClick={() => setTab("orders")}
        >
          Orders ({orders.length})
        </button>
        <button
          className={`profile-tab ${tab === "reviews" ? "active" : ""}`}
          onClick={() => setTab("reviews")}
        >
          Reviews ({reviews.length})
        </button>
        <button
          className={`profile-tab ${tab === "stats" ? "active" : ""}`}
          onClick={() => setTab("stats")}
        >
          Stats
        </button>
      </div>

      <div className="profile-content">
        {tab === "orders" && (
          <div className="profile-orders">
            {orders.length === 0 ? (
              <div className="profile-empty">
                <p>No orders yet</p>
              </div>
            ) : (
              <div className="profile-orders-list">
                {orders.map((order) => (
                  <div key={order.id} className="profile-order-card">
                    <div className="profile-order-header">
                      <span className="profile-order-id">{order.id}</span>
                      <span className={`profile-order-status status-${order.status}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="profile-order-items">
                      {order.items.slice(0, 3).map((item, i) => (
                        <div key={i} className="profile-order-item">
                          <span className="profile-order-item-name">{item.name}</span>
                          <span className="profile-order-item-qty">×{item.qty}</span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="profile-order-more">
                          +{order.items.length - 3} more
                        </p>
                      )}
                    </div>
                    <div className="profile-order-footer">
                      <span className="profile-order-total">{formatPrice(order.total)}</span>
                      <span className="profile-order-date">
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "reviews" && (
          <div className="profile-reviews">
            {reviews.length === 0 ? (
              <div className="profile-empty">
                <p>No reviews yet</p>
              </div>
            ) : (
              <div className="profile-reviews-list">
                {reviews.map((review) => (
                  <div key={review.id} className="profile-review-card">
                    <div className="profile-review-header">
                      <span className="profile-review-card-name">{review.card_name}</span>
                      <div className="profile-review-rating">
                        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                      </div>
                    </div>
                    {review.review_text && (
                      <p className="profile-review-text">{review.review_text}</p>
                    )}
                    <span className="profile-review-date">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "stats" && (
          <div className="profile-stats-detail">
            <div className="profile-stat-card">
              <h3>Shopping Activity</h3>
              <div className="profile-stat-row">
                <span>Total Orders</span>
                <span>{orders.length}</span>
              </div>
              <div className="profile-stat-row">
                <span>Total Spent</span>
                <span>{formatPrice(profile.total_spent)}</span>
              </div>
              <div className="profile-stat-row">
                <span>Average Order</span>
                <span>
                  {orders.length > 0
                    ? formatPrice(profile.total_spent / orders.length)
                    : "$0.00"}
                </span>
              </div>
            </div>

            <div className="profile-stat-card">
              <h3>Community</h3>
              <div className="profile-stat-row">
                <span>Reviews Written</span>
                <span>{reviews.length}</span>
              </div>
              <div className="profile-stat-row">
                <span>Member Since</span>
                <span>{formatDate(profile.joined_at)}</span>
              </div>
            </div>

            {profile.token_balance > 0 && (
              <div className="profile-stat-card token">
                <h3>⭕ Token Balance</h3>
                <div className="profile-token-balance">
                  <span className="profile-token-amount">{profile.token_balance}</span>
                  <span className="profile-token-label">SOL RING TOKENS</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
