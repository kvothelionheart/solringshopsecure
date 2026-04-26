import { useState, useCallback, useEffect, useRef } from "react";
import { Checkout } from "./Checkout.jsx";
import { CardDetailModal } from "./CardDetailModal.jsx";
import { AuthModal } from "./AuthModal.jsx";
import { useAuth } from "./AuthContext.jsx";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"];
const CONDITION_LABELS = {
  NM: "Near Mint",
  LP: "Lightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Damaged",
};

const RARITIES = ["common", "uncommon", "rare", "mythic"];
const COLORS = ["W", "U", "B", "R", "G", "C"];
const COLOR_LABELS = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green", C: "Colorless" };

function formatPrice(price) {
  if (!price) return "—";
  return `$${parseFloat(price).toFixed(2)}`;
}

function getConditionColor(cond) {
  const map = {
    NM: "#4ade80", LP: "#a3e635", MP: "#facc15", HP: "#fb923c", DMG: "#f87171",
  };
  return map[cond] || "#888";
}

function getRarityColor(rarity) {
  return { common: "#aaa", uncommon: "#acd0e6", rare: "#d4b86a", mythic: "#e87830" }[rarity] || "#aaa";
}

// ─── CART ─────────────────────────────────────────────────────────────────────

function useCart() {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("solring_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save to localStorage whenever cart changes
  useEffect(() => {
    try {
      localStorage.setItem("solring_cart", JSON.stringify(cart));
    } catch (err) {
      console.error("Failed to save cart:", err);
    }
  }, [cart]);

  const addToCart = useCallback((item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, cartQty: Math.min(c.cartQty + 1, c.qty) } : c
        );
      }
      return [...prev, { ...item, cartQty: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateCartQty = useCallback((id, qty) => {
    if (qty < 1) {
      setCart((prev) => prev.filter((c) => c.id !== id));
      return;
    }
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, cartQty: qty } : c)));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = cart.reduce((sum, c) => sum + parseFloat(c.price || 0) * c.cartQty, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.cartQty, 0);

  return { cart, addToCart, removeFromCart, updateCartQty, clearCart, cartTotal, cartCount };
}

// ─── HERO ─────────────────────────────────────────────────────────────────────

function Hero({ onSearch }) {
  const [q, setQ] = useState("");

  return (
    <div className="sf-hero">
      <div className="sf-hero-content">
        <div className="sf-hero-ring">⭕</div>
        <h1 className="sf-hero-title">The Sol Ring Shop</h1>
        <p className="sf-hero-sub">Magic: The Gathering Singles — Curated &amp; Priced</p>
        <div className="sf-hero-search">
          <input
            className="sf-hero-input"
            placeholder="Search cards by name, set, type…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch(q)}
          />
          <button className="sf-hero-btn" onClick={() => onSearch(q)}>
            Search
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FILTER BAR ───────────────────────────────────────────────────────────────

function FilterBar({ filters, setFilters, totalResults }) {
  return (
    <div className="sf-filterbar">
      <div className="sf-filterbar-left">
        <span className="sf-results-count">
          {totalResults} listing{totalResults !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="sf-filterbar-right">
        {/* Color filter */}
        <div className="sf-filter-group">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`sf-color-pill sf-color-${c} ${filters.colors?.includes(c) ? "active" : ""}`}
              onClick={() => {
                const colors = filters.colors || [];
                setFilters({
                  ...filters,
                  colors: colors.includes(c) ? colors.filter((x) => x !== c) : [...colors, c],
                });
              }}
              title={COLOR_LABELS[c]}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Rarity */}
        <select
          className="sf-filter-select"
          value={filters.rarity || ""}
          onChange={(e) => setFilters({ ...filters, rarity: e.target.value })}
        >
          <option value="">All Rarities</option>
          {RARITIES.map((r) => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>

        {/* Condition */}
        <select
          className="sf-filter-select"
          value={filters.condition || ""}
          onChange={(e) => setFilters({ ...filters, condition: e.target.value })}
        >
          <option value="">All Conditions</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>{c} — {CONDITION_LABELS[c]}</option>
          ))}
        </select>

        {/* Foil */}
        <select
          className="sf-filter-select"
          value={filters.foil || ""}
          onChange={(e) => setFilters({ ...filters, foil: e.target.value })}
        >
          <option value="">Foil + Non-Foil</option>
          <option value="foil">Foil Only ✦</option>
          <option value="nonfoil">Non-Foil Only</option>
        </select>

        {/* Sort */}
        <select
          className="sf-filter-select"
          value={filters.sort || "name"}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
        >
          <option value="name">A → Z</option>
          <option value="price_asc">Price: Low</option>
          <option value="price_desc">Price: High</option>
          <option value="rarity">Rarity</option>
          <option value="newest">Newest</option>
        </select>

        {/* Price range */}
        <div className="sf-price-range">
          <input
            className="sf-price-input"
            type="number"
            placeholder="Min $"
            min="0"
            value={filters.priceMin || ""}
            onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
          />
          <span className="sf-price-sep">–</span>
          <input
            className="sf-price-input"
            type="number"
            placeholder="Max $"
            min="0"
            value={filters.priceMax || ""}
            onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── LISTING CARD ─────────────────────────────────────────────────────────────

function ListingCard({ item, onAddToCart, onCardClick, cartQty }) {
  const [hovered, setHovered] = useState(false);
  const inCart = cartQty > 0;
  const soldOut = item.qty < 1;

  return (
    <div
      className={`sf-card ${inCart ? "in-cart" : ""} ${soldOut ? "sold-out" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onCardClick}
      style={{ cursor: "pointer" }}
    >
      <div className="sf-card-image-wrap">
        {item.imageUri ? (
          <img src={item.imageUri} alt={item.name} className="sf-card-image" loading="lazy" />
        ) : (
          <div className="sf-card-image-placeholder">{item.name}</div>
        )}

        {item.foil && <div className="sf-foil-shimmer" />}

        <div className="sf-card-badges">
          {item.foil && <span className="sf-badge sf-badge-foil">✦ Foil</span>}
          {item.misprint && <span className="sf-badge sf-badge-misprint">Misprint</span>}
          {item.altered && <span className="sf-badge sf-badge-altered">Altered</span>}
        </div>

        {soldOut && (
          <div className="sf-soldout-overlay">
            <span>Sold Out</span>
          </div>
        )}

        <div className={`sf-card-hover ${hovered && !soldOut ? "visible" : ""}`}>
          <button
            className="sf-add-btn"
            onClick={(e) => { e.stopPropagation(); onAddToCart(item); }}
            disabled={soldOut}
          >
            {inCart ? `In Cart (${cartQty})` : "Add to Cart"}
          </button>
          {item.oracleText && (
            <p className="sf-oracle-preview">
              {item.oracleText.slice(0, 100)}{item.oracleText.length > 100 ? "…" : ""}
            </p>
          )}
        </div>
      </div>

      <div className="sf-card-info">
        <div className="sf-card-name-row">
          <span className="sf-card-name">{item.name}</span>
          <span className="sf-rarity-dot" style={{ color: getRarityColor(item.rarity) }}>●</span>
        </div>
        <div className="sf-card-meta">
          <span className="sf-card-set">{item.setName}</span>
          {item.lang && item.lang !== "en" && (
            <span className="sf-card-lang">{item.lang.toUpperCase()}</span>
          )}
        </div>
        <div className="sf-card-bottom">
          <div className="sf-card-condition-price">
            <span
              className="sf-condition"
              style={{ color: getConditionColor(item.condition) }}
            >
              {item.condition}
            </span>
            <span className="sf-price">{formatPrice(item.price)}</span>
          </div>
          <span className="sf-qty">
            {item.qty > 1 ? `${item.qty} available` : item.qty === 1 ? "1 left" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── CART DRAWER ──────────────────────────────────────────────────────────────

function CartDrawer({ cart, cartTotal, onRemove, onUpdateQty, onClose, onCheckout, onClearCart }) {
  const handleClearCart = () => {
    if (confirm(`Clear all ${cart.length} item(s) from cart?`)) {
      onClearCart();
    }
  };

  return (
    <div className="sf-cart-overlay" onClick={onClose}>
      <div className="sf-cart-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="sf-cart-header">
          <h2 className="sf-cart-title">Your Cart</h2>
          <button className="sf-cart-close" onClick={onClose}>×</button>
        </div>

        {cart.length === 0 ? (
          <div className="sf-cart-empty">
            <p>Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="sf-cart-items">
              {cart.map((item) => (
                <div key={item.id} className="sf-cart-item">
                  <img
                    src={item.imageUri}
                    alt={item.name}
                    className="sf-cart-item-img"
                  />
                  <div className="sf-cart-item-details">
                    <span className="sf-cart-item-name">{item.name}</span>
                    <span className="sf-cart-item-meta">
                      {item.setName} · {item.condition}
                      {item.foil ? " · ✦ Foil" : ""}
                    </span>
                    <div className="sf-cart-item-bottom">
                      <div className="sf-cart-qty-wrap">
                        <button
                          className="sf-qty-btn"
                          onClick={() => onUpdateQty(item.id, item.cartQty - 1)}
                        >−</button>
                        <span className="sf-qty-num">{item.cartQty}</span>
                        <button
                          className="sf-qty-btn"
                          onClick={() => onUpdateQty(item.id, Math.min(item.cartQty + 1, item.qty))}
                        >+</button>
                      </div>
                      <span className="sf-cart-item-price">
                        {formatPrice(parseFloat(item.price) * item.cartQty)}
                      </span>
                    </div>
                  </div>
                  <button
                    className="sf-cart-remove"
                    onClick={() => onRemove(item.id)}
                  >×</button>
                </div>
              ))}
            </div>

            <div className="sf-cart-footer">
              <button className="sf-clear-cart-btn" onClick={handleClearCart}>
                Clear Cart
              </button>
              <div className="sf-cart-total">
                <span>Total</span>
                <span className="sf-cart-total-price">{formatPrice(cartTotal)}</span>
              </div>
              <button className="sf-checkout-btn" onClick={onCheckout}>
                Checkout with Solana ◎
              </button>
              <p className="sf-checkout-note">
                Solana Pay integration coming soon — contact us to purchase
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── CONTACT MODAL ────────────────────────────────────────────────────────────

function ContactModal({ cart, cartTotal, onClose }) {
  const [copied, setCopied] = useState(false);

  const orderText = cart.map((item) =>
    `${item.cartQty}x ${item.name} (${item.condition}${item.foil ? " Foil" : ""}) — ${formatPrice(item.price)} each`
  ).join("\n") + `\n\nTotal: ${formatPrice(cartTotal)}`;

  const copy = () => {
    navigator.clipboard.writeText(orderText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="sf-modal-overlay" onClick={onClose}>
      <div className="sf-modal" onClick={(e) => e.stopPropagation()}>
        <button className="sf-modal-close" onClick={onClose}>×</button>
        <h2 className="sf-modal-title">Complete Your Order</h2>
        <p className="sf-modal-sub">
          Solana Pay is coming soon. For now copy your order and reach out directly.
        </p>
        <div className="sf-order-summary">
          <pre className="sf-order-text">{orderText}</pre>
          <button className="sf-copy-btn" onClick={copy}>
            {copied ? "✓ Copied" : "Copy Order"}
          </button>
        </div>
        <div className="sf-contact-options">
          <p className="sf-contact-label">Send your order to:</p>
          <a href="mailto:orders@thesolringshop.com" className="sf-contact-link">
            orders@thesolringshop.com
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN LOGIN MODAL ────────────────────────────────────────────────────────

const ADMIN_PASSWORD = "solring2024";

function AdminLoginModal({ onSuccess, onClose }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const attempt = () => {
    if (pw === ADMIN_PASSWORD) {
      onSuccess();
    } else {
      setError("Incorrect password");
      setPw("");
    }
  };

  return (
    <div className="sf-modal-overlay" onClick={onClose}>
      <div className="sf-modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <button className="sf-modal-close" onClick={onClose}>×</button>
        <h2 className="sf-modal-title">Admin Access</h2>
        <p className="sf-modal-sub">Enter your password to continue</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          <input
            type="password"
            className="sf-hero-input"
            style={{ borderRadius: "var(--radius)", border: "1px solid var(--border-light)" }}
            placeholder="Password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && attempt()}
            autoFocus
          />
          {error && <p style={{ color: "var(--red)", fontSize: 12 }}>{error}</p>}
          <button className="sf-checkout-btn" onClick={attempt}>
            Enter Admin
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STOREFRONT NAV ───────────────────────────────────────────────────────────

function StorefrontNav({ cartCount, onCartOpen, onAdminToggle, user, onLoginClick, onLogout }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="sf-nav">
      <div className="sf-nav-logo">
        <span className="sf-nav-ring">⭕</span>
        <span className="sf-nav-name">THE SOL RING SHOP</span>
      </div>
      <div className="sf-nav-center">
        <button 
          className="sf-updates-link"
          onClick={() => window.location.href = '/updates'}
        >
          Updates
        </button>
      </div>
      <div className="sf-nav-right">
        {user ? (
          <div className="sf-user-menu" ref={menuRef}>
            <button 
              className="sf-profile-btn"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              @{user.username} ▾
            </button>
            {userMenuOpen && (
              <div className="sf-user-dropdown">
                <button 
                  className="sf-dropdown-item"
                  onClick={() => {
                    window.location.href = `/profile/${user.username}`;
                  }}
                >
                  View Profile
                </button>
                <button 
                  className="sf-dropdown-item"
                  onClick={() => {
                    window.location.href = '/settings';
                  }}
                >
                  Account Settings
                </button>
                <button 
                  className="sf-dropdown-item logout"
                  onClick={() => {
                    onLogout();
                    setUserMenuOpen(false);
                    window.location.href = '/';
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="sf-login-btn" onClick={onLoginClick}>
            Sign In
          </button>
        )}
        <button className="sf-admin-btn" onClick={onAdminToggle}>
          Admin ↗
        </button>
        <button className="sf-cart-btn" onClick={onCartOpen}>
          🛒 Cart
          {cartCount > 0 && <span className="sf-cart-count">{cartCount}</span>}
        </button>
      </div>
    </nav>
  );
}

// ─── MAIN STOREFRONT ──────────────────────────────────────────────────────────

export function Storefront({ inventory, onAdminToggle }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ colors: [], rarity: "", condition: "", foil: "", sort: "name", priceMin: "", priceMax: "" });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { cart, addToCart, removeFromCart, updateCartQty, clearCart, cartTotal, cartCount } = useCart();
  const { user, logout } = useAuth();

  // Filter and sort inventory for public display
  const listings = inventory
    .filter((item) => {
      if (item.qty < 1) return false;

      const q = search.toLowerCase();
      const matchSearch = !q ||
        item.name?.toLowerCase().includes(q) ||
        item.setName?.toLowerCase().includes(q) ||
        item.typeLine?.toLowerCase().includes(q) ||
        item.artist?.toLowerCase().includes(q) ||
        item.oracleText?.toLowerCase().includes(q);

      const matchColors = !filters.colors?.length ||
        filters.colors.some((c) => (item.colors || []).includes(c));

      const matchRarity = !filters.rarity || item.rarity === filters.rarity;
      const matchCondition = !filters.condition || item.condition === filters.condition;
      const matchFoil = !filters.foil ? true :
        filters.foil === "foil" ? item.foil : !item.foil;

      const price = parseFloat(item.price || 0);
      const matchPriceMin = !filters.priceMin || price >= parseFloat(filters.priceMin);
      const matchPriceMax = !filters.priceMax || price <= parseFloat(filters.priceMax);

      return matchSearch && matchColors && matchRarity && matchCondition && matchFoil && matchPriceMin && matchPriceMax;
    })
    .sort((a, b) => {
      const sort = filters.sort || "name";
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "price_asc") return parseFloat(a.price) - parseFloat(b.price);
      if (sort === "price_desc") return parseFloat(b.price) - parseFloat(a.price);
      if (sort === "rarity") {
        const order = { mythic: 0, rare: 1, uncommon: 2, common: 3 };
        return (order[a.rarity] ?? 4) - (order[b.rarity] ?? 4);
      }
      if (sort === "newest") return new Date(b.addedAt) - new Date(a.addedAt);
      return 0;
    });

  const cartQtyMap = Object.fromEntries(cart.map((c) => [c.id, c.cartQty]));

  // Stats for hero
  const totalListings = inventory.filter((i) => i.qty > 0).length;
  const totalValue = inventory.reduce((s, i) => s + parseFloat(i.price || 0) * (i.qty || 1), 0);

  return (
    <div className="sf-root">
      <StorefrontNav
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
        onAdminToggle={() => setLoginOpen(true)}
        user={user}
        onLoginClick={() => setAuthModalOpen(true)}
        onLogout={logout}
      />

      <Hero onSearch={setSearch} />

      {/* Stats bar */}
      <div className="sf-stats-bar">
        <div className="sf-stat">
          <span className="sf-stat-num">{totalListings.toLocaleString()}</span>
          <span className="sf-stat-label">Cards Listed</span>
        </div>
        <div className="sf-stat-divider" />
        <div className="sf-stat">
          <span className="sf-stat-num">{RARITIES.map((r) => inventory.filter((i) => i.rarity === r && i.qty > 0).length).reduce((a, b) => a + b, 0).toLocaleString()}</span>
          <span className="sf-stat-label">Singles Available</span>
        </div>
        <div className="sf-stat-divider" />
        <div className="sf-stat">
          <span className="sf-stat-num">{inventory.filter((i) => i.foil && i.qty > 0).length}</span>
          <span className="sf-stat-label">Foils In Stock</span>
        </div>
        <div className="sf-stat-divider" />
        <div className="sf-stat">
          <span className="sf-stat-num">${totalValue.toFixed(0)}</span>
          <span className="sf-stat-label">Total Inventory Value</span>
        </div>
      </div>

      <div className="sf-main">
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          totalResults={listings.length}
        />

        {/* Recently Added Section */}
        {!search && !filters.colors?.length && !filters.rarity && !filters.condition && inventory.length > 0 && (
          <div className="sf-recent-section">
            <div className="sf-recent-header">
              <h2 className="sf-recent-title">Recently Added</h2>
              <span className="sf-recent-subtitle">Newest arrivals to the shop</span>
            </div>
            <div className="sf-recent-scroll">
              {inventory
                .filter((item) => item.qty > 0)
                .slice(0, 12)
                .map((item) => (
                  <div key={item.id} className="sf-recent-card">
                    <ListingCard
                      item={item}
                      onAddToCart={addToCart}
                      onCardClick={() => setSelectedDetail(item)}
                      cartQty={cartQtyMap[item.id] || 0}
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        {listings.length === 0 ? (
          <div className="sf-empty">
            <p>No cards match your search</p>
            <button
              className="sf-empty-reset"
              onClick={() => { setSearch(""); setFilters({ colors: [], rarity: "", condition: "", foil: "", sort: "name", priceMin: "", priceMax: "" }); }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="sf-grid">
            {listings.map((item) => (
              <ListingCard
                key={item.id}
                item={item}
                onAddToCart={addToCart}
                onCardClick={() => setSelectedDetail(item)}
                cartQty={cartQtyMap[item.id] || 0}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="sf-footer">
        <span className="sf-footer-logo">⭕ The Sol Ring Shop</span>
        <span className="sf-footer-domain">thesolringshop.com</span>
        <span className="sf-footer-copy">Magic: The Gathering Singles</span>
      </footer>

      {loginOpen && (
        <AdminLoginModal
          onSuccess={() => { setLoginOpen(false); onAdminToggle(); }}
          onClose={() => setLoginOpen(false)}
        />
      )}

      {cartOpen && (
        <CartDrawer
          cart={cart}
          cartTotal={cartTotal}
          onRemove={removeFromCart}
          onUpdateQty={updateCartQty}
          onClose={() => setCartOpen(false)}
          onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
          onClearCart={clearCart}
        />
      )}

      {selectedDetail && (
        <CardDetailModal
          item={selectedDetail}
          allListings={inventory}
          onAddToCart={addToCart}
          onClose={() => setSelectedDetail(null)}
          cartQtyMap={cartQtyMap}
        />
      )}

      {checkoutOpen && (
        <Checkout
          cart={cart}
          cartTotal={cartTotal}
          onClose={() => setCheckoutOpen(false)}
          onComplete={() => {
            setCheckoutOpen(false);
            clearCart();
          }}
        />
      )}

      {authModalOpen && (
        <AuthModal
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => setAuthModalOpen(false)}
        />
      )}
    </div>
  );
}
