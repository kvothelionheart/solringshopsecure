import { useState, useEffect } from "react";
import * as db from "./supabase.js";

function formatPrice(price) {
  if (!price) return "$0.00";
  return `$${parseFloat(price).toFixed(2)}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, shipped, completed
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    const data = await db.fetchOrders();
    setOrders(data);
    setLoading(false);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const success = await db.updateOrderStatus(orderId, newStatus);
    if (success) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    }
  };

  const filtered = orders.filter((o) => {
    if (filter === "all") return true;
    return o.status === filter;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    completed: orders.filter((o) => o.status === "completed").length,
  };

  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h1 className="page-title">Orders</h1>
        <button className="btn-ghost" onClick={loadOrders}>
          ↻ Refresh
        </button>
      </div>

      {/* Stats bar */}
      <div className="orders-stats">
        <div className="order-stat">
          <span className="order-stat-num">{stats.total}</span>
          <span className="order-stat-label">Total Orders</span>
        </div>
        <div className="order-stat">
          <span className="order-stat-num pending">{stats.pending}</span>
          <span className="order-stat-label">Pending</span>
        </div>
        <div className="order-stat">
          <span className="order-stat-num shipped">{stats.shipped}</span>
          <span className="order-stat-label">Shipped</span>
        </div>
        <div className="order-stat">
          <span className="order-stat-num completed">{stats.completed}</span>
          <span className="order-stat-label">Completed</span>
        </div>
        <div className="order-stat">
          <span className="order-stat-num revenue">{formatPrice(totalRevenue)}</span>
          <span className="order-stat-label">Total Revenue</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="orders-filters">
        <button
          className={`filter-tab ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({stats.total})
        </button>
        <button
          className={`filter-tab ${filter === "pending" ? "active" : ""}`}
          onClick={() => setFilter("pending")}
        >
          Pending ({stats.pending})
        </button>
        <button
          className={`filter-tab ${filter === "shipped" ? "active" : ""}`}
          onClick={() => setFilter("shipped")}
        >
          Shipped ({stats.shipped})
        </button>
        <button
          className={`filter-tab ${filter === "completed" ? "active" : ""}`}
          onClick={() => setFilter("completed")}
        >
          Completed ({stats.completed})
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading orders…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No {filter === "all" ? "" : filter} orders yet</p>
          <p className="empty-hint">Orders will appear here when customers complete checkout</p>
        </div>
      ) : (
        <div className="orders-grid">
          {/* Orders list */}
          <div className="orders-list">
            {filtered.map((order) => (
              <div
                key={order.id}
                className={`order-card ${selectedOrder?.id === order.id ? "selected" : ""}`}
                onClick={() => setSelectedOrder(order)}
              >
                <div className="order-card-header">
                  <span className="order-id">{order.id}</span>
                  <span className={`order-status status-${order.status}`}>
                    {order.status}
                  </span>
                </div>
                <div className="order-card-customer">
                  <span className="order-customer-name">{order.customer_name}</span>
                  <span className="order-customer-email">{order.customer_email}</span>
                </div>
                <div className="order-card-footer">
                  <span className="order-total">{formatPrice(order.total)}</span>
                  <span className="order-date">{formatDate(order.created_at)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Order detail panel */}
          {selectedOrder && (
            <div className="order-detail-panel">
              <div className="order-detail-header">
                <h2 className="order-detail-title">{selectedOrder.id}</h2>
                <span className={`order-status-badge status-${selectedOrder.status}`}>
                  {selectedOrder.status}
                </span>
              </div>

              {/* Status actions */}
              <div className="order-actions">
                {selectedOrder.status === "pending" && (
                  <button
                    className="btn-primary small"
                    onClick={() => updateOrderStatus(selectedOrder.id, "shipped")}
                  >
                    Mark as Shipped
                  </button>
                )}
                {selectedOrder.status === "shipped" && (
                  <button
                    className="btn-primary small"
                    onClick={() => updateOrderStatus(selectedOrder.id, "completed")}
                  >
                    Mark as Completed
                  </button>
                )}
                {selectedOrder.status === "completed" && (
                  <span className="completed-badge">✓ Order Complete</span>
                )}
              </div>

              {/* Customer info */}
              <div className="order-section">
                <h3 className="order-section-title">Customer</h3>
                <div className="order-info-grid">
                  <div className="order-info-item">
                    <span className="order-info-label">Name</span>
                    <span className="order-info-value">{selectedOrder.customer_name}</span>
                  </div>
                  <div className="order-info-item">
                    <span className="order-info-label">Email</span>
                    <a
                      href={`mailto:${selectedOrder.customer_email}`}
                      className="order-info-link"
                    >
                      {selectedOrder.customer_email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Shipping address */}
              <div className="order-section">
                <h3 className="order-section-title">Ship To</h3>
                <div className="order-address">
                  <p>{selectedOrder.shipping_address}</p>
                  <p>
                    {selectedOrder.shipping_city}, {selectedOrder.shipping_state}{" "}
                    {selectedOrder.shipping_zip}
                  </p>
                  <p>{selectedOrder.shipping_country}</p>
                </div>
              </div>

              {/* Items */}
              <div className="order-section">
                <h3 className="order-section-title">Items</h3>
                <div className="order-items">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="order-item">
                      <div className="order-item-info">
                        <span className="order-item-name">{item.name}</span>
                        <span className="order-item-meta">
                          {item.set} · {item.condition}
                          {item.foil ? " · ✦ Foil" : ""}
                        </span>
                      </div>
                      <div className="order-item-pricing">
                        <span className="order-item-qty">×{item.qty}</span>
                        <span className="order-item-price">
                          {formatPrice(parseFloat(item.price) * item.qty)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment info */}
              <div className="order-section">
                <h3 className="order-section-title">Payment</h3>
                <div className="order-info-grid">
                  <div className="order-info-item">
                    <span className="order-info-label">Method</span>
                    <span className="order-info-value">{selectedOrder.currency}</span>
                  </div>
                  <div className="order-info-item">
                    <span className="order-info-label">Total</span>
                    <span className="order-info-value total">
                      {formatPrice(selectedOrder.total)}
                    </span>
                  </div>
                  {selectedOrder.tx_signature && (
                    <div className="order-info-item full-width">
                      <span className="order-info-label">Transaction</span>
                      <span className="order-info-value tx">
                        {selectedOrder.tx_signature}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order metadata */}
              <div className="order-section">
                <h3 className="order-section-title">Details</h3>
                <div className="order-info-grid">
                  <div className="order-info-item">
                    <span className="order-info-label">Order Date</span>
                    <span className="order-info-value">
                      {formatDate(selectedOrder.created_at)}
                    </span>
                  </div>
                  <div className="order-info-item">
                    <span className="order-info-label">Order ID</span>
                    <span className="order-info-value">{selectedOrder.id}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
