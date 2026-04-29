import { useState, useEffect } from 'react';
import * as db from './supabase.js';
import * as email from './emailService.js';

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, shipped

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    const data = await db.fetchOrders();
    setOrders(data);
    setLoading(false);
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'pending') return order.fulfillment_status === 'pending';
    if (filter === 'shipped') return order.fulfillment_status === 'shipped';
    return true;
  });

  if (loading) {
    return <div className="orders-page"><p>Loading orders...</p></div>;
  }

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h2>Orders</h2>
        <div className="orders-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({orders.length})
          </button>
          <button
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending ({orders.filter(o => o.fulfillment_status === 'pending').length})
          </button>
          <button
            className={`filter-btn ${filter === 'shipped' ? 'active' : ''}`}
            onClick={() => setFilter('shipped')}
          >
            Shipped ({orders.filter(o => o.fulfillment_status === 'shipped').length})
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="orders-empty">
          <p>No {filter !== 'all' ? filter : ''} orders yet</p>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map(order => (
            <OrderCard key={order.id} order={order} onUpdate={loadOrders} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [trackingInput, setTrackingInput] = useState(order.tracking_number || '');
  const [carrier, setCarrier] = useState(order.tracking_carrier || 'USPS');
  const [saving, setSaving] = useState(false);

  async function handleAddTracking() {
    if (!trackingInput) {
      alert('Please enter a tracking number');
      return;
    }

    setSaving(true);

    try {
      const success = await db.addTrackingNumber(order.id, trackingInput, carrier);
      
      if (success) {
        // Send tracking email to customer
        const updatedOrder = { ...order, tracking_number: trackingInput, tracking_carrier: carrier };
        await email.sendTrackingEmail(updatedOrder);
        
        alert('Tracking number saved and email sent to customer!');
        onUpdate();
      } else {
        alert('Failed to save tracking number');
      }
    } catch (error) {
      console.error('Error adding tracking:', error);
      alert('Error saving tracking number');
    } finally {
      setSaving(false);
    }
  }

  const totalItems = order.items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className={`order-card ${order.fulfillment_status === 'shipped' ? 'shipped' : ''}`}>
      <div className="order-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="order-number">
          <strong>{order.order_number}</strong>
          <span className={`status-badge ${order.fulfillment_status}`}>
            {order.fulfillment_status}
          </span>
        </div>
        <div className="order-meta">
          <span>{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
          <span>${order.total_usd.toFixed(2)}</span>
          <span>◎{order.total_sol.toFixed(4)}</span>
        </div>
        <div className="order-date">
          {new Date(order.created_at).toLocaleDateString()}
        </div>
        <button className="expand-btn">{expanded ? '−' : '+'}</button>
      </div>

      {expanded && (
        <div className="order-card-body">
          <div className="order-section">
            <h4>Customer</h4>
            <p><strong>{order.shipping_name}</strong></p>
            <p>{order.customer_email}</p>
          </div>

          <div className="order-section">
            <h4>Shipping Address</h4>
            <p>{order.shipping_address_line1}</p>
            {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
            <p>{order.shipping_city}, {order.shipping_state} {order.shipping_zip}</p>
          </div>

          <div className="order-section">
            <h4>Items</h4>
            {order.items.map((item, i) => (
              <div key={i} className="order-item">
                <span>{item.name} {item.foil ? '(Foil)' : ''} - {item.condition}</span>
                <span>×{item.qty}</span>
                <span>${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
            <div className="order-item order-total">
              <span>Shipping</span>
              <span></span>
              <span>${order.shipping_fee.toFixed(2)}</span>
            </div>
            <div className="order-item order-total">
              <strong>Total</strong>
              <span></span>
              <strong>${order.total_usd.toFixed(2)}</strong>
            </div>
          </div>

          <div className="order-section">
            <h4>Transaction</h4>
            <p className="tx-hash">
              {order.transaction_signature}
              <a
                href={`https://solscan.io/tx/${order.transaction_signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                View on Solscan →
              </a>
            </p>
          </div>

          <div className="order-section tracking-section">
            <h4>Tracking Number</h4>
            {order.tracking_number ? (
              <div className="tracking-display">
                <p><strong>{order.tracking_number}</strong></p>
                <p>Carrier: {order.tracking_carrier}</p>
                <p>Shipped: {new Date(order.shipped_at).toLocaleString()}</p>
              </div>
            ) : (
              <div className="tracking-input">
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                >
                  <option value="USPS">USPS</option>
                  <option value="UPS">UPS</option>
                  <option value="FedEx">FedEx</option>
                </select>
                <input
                  type="text"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="Enter tracking number..."
                />
                <button
                  className="btn-add-tracking"
                  onClick={handleAddTracking}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Add & Email Customer'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
