import { useState, useEffect, useCallback, useRef } from "react";
import "./styles/main.css";
import { ImportPage } from "./Importer.jsx";
import { Storefront } from "./Storefront.jsx";
import { OrdersPage } from "./OrdersPage.jsx";
import { ProfilePage } from "./ProfilePage.jsx";
import { AccountSettings } from "./AccountSettings.jsx";
import { ResetPasswordPage } from "./ResetPasswordPage.jsx";
import { UpdatesPage } from "./UpdatesPage.jsx";
import { PostsAdminPage } from "./PostsAdminPage.jsx";
import { PriceSettingsPanel } from "./PriceSettingsPanel.jsx";
import * as db from "./supabase.js";
import { syncAllPrices } from "./priceSync.js";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"];
const CONDITION_LABELS = {
  NM: "Near Mint",
  LP: "Lightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Damaged",
};

const COLORS = [
  { id: "W", label: "White", symbol: "☀" },
  { id: "U", label: "Blue", symbol: "💧" },
  { id: "B", label: "Black", symbol: "💀" },
  { id: "R", label: "Red", symbol: "🔥" },
  { id: "G", label: "Green", symbol: "🌲" },
  { id: "C", label: "Colorless", symbol: "◇" },
];

const RARITIES = ["common", "uncommon", "rare", "mythic"];

const FORMATS = [
  "standard",
  "pioneer",
  "modern",
  "legacy",
  "vintage",
  "commander",
  "pauper",
];

// ─── UTILITY ─────────────────────────────────────────────────────────────────

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function formatPrice(price) {
  if (!price) return "—";
  return `$${parseFloat(price).toFixed(2)}`;
}

function getConditionColor(cond) {
  const map = {
    NM: "#4ade80",
    LP: "#a3e635",
    MP: "#facc15",
    HP: "#fb923c",
    DMG: "#f87171",
  };
  return map[cond] || "#888";
}

// ─── SCRYFALL API ─────────────────────────────────────────────────────────────

async function scryfallSearch(query, filters = {}) {
  let q = query || "";

  if (filters.colors?.length) {
    q += ` color<=${filters.colors.join("")}`;
  }
  if (filters.rarity) q += ` rarity:${filters.rarity}`;
  if (filters.type) q += ` type:${filters.type}`;
  if (filters.set) q += ` set:${filters.set}`;
  if (filters.cmc !== undefined && filters.cmc !== "") q += ` cmc=${filters.cmc}`;
  if (filters.format) q += ` legal:${filters.format}`;
  if (filters.keywords) q += ` o:"${filters.keywords}"`;
  if (filters.artist) q += ` artist:"${filters.artist}"`;
  if (filters.power !== "") q += ` pow=${filters.power}`;
  if (filters.toughness !== "") q += ` tou=${filters.toughness}`;

  if (!q.trim()) q = "*";

  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q.trim())}&order=name&unique=prints`;

  try {
    const res = await fetch(url);
    if (!res.ok) return { data: [], error: "No cards found" };
    const json = await res.json();
    return { data: json.data || [], total: json.total_cards };
  } catch {
    return { data: [], error: "Search failed" };
  }
}

async function scryfallAutocomplete(q) {
  if (q.length < 2) return [];
  const res = await fetch(
    `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(q)}`
  );
  const json = await res.json();
  return json.data || [];
}

async function getCardByName(name) {
  const res = await fetch(
    `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`
  );
  if (!res.ok) return null;
  return res.json();
}

// ─── LOCAL INVENTORY ──────────────────────────────────────────────────────────

function useInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load inventory from Supabase on mount
  useEffect(() => {
    let mounted = true;
    db.fetchInventory().then((rawData) => {
      if (mounted) {
        // Transform snake_case to camelCase for frontend
        const transformedData = rawData.map(item => ({
          ...item,
          imageUri: item.image_uri,
          imageLarge: item.image_large,
          cardId: item.card_id,
          setCode: item.set_code,
          setName: item.set_name,
          collectorNumber: item.collector_number,
          oracleText: item.oracle_text,
          manaCost: item.mana_cost,
          typeLine: item.type_line,
          scryfallUri: item.scryfall_uri,
          addedAt: item.added_at,
        }));
        setInventory(transformedData);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const addCard = useCallback(
    async (card, condition = "NM", price = null, qty = 1, foil = false, notes = "") => {
      const entry = {
        id: `${card.id}_${condition}_${foil ? "foil" : "nonfoil"}_${Date.now()}`,
        cardId: card.id,
        name: card.name,
        set: card.set,
        setName: card.set_name,
        collectorNumber: card.collector_number,
        condition,
        foil,
        qty,
        price: price ?? (foil ? card.prices?.usd_foil : card.prices?.usd) ?? "0.00",
        notes,
        imageUri:
          card.image_uris?.normal ||
          card.card_faces?.[0]?.image_uris?.normal ||
          "",
        imageLarge:
          card.image_uris?.large ||
          card.card_faces?.[0]?.image_uris?.large ||
          "",
        rarity: card.rarity,
        colors: card.colors || [],
        typeLine: card.type_line,
        addedAt: new Date().toISOString(),
        scryfallUri: card.scryfall_uri,
        oracleText: card.oracle_text || card.card_faces?.[0]?.oracle_text || "",
        manaCost: card.mana_cost || card.card_faces?.[0]?.mana_cost || "",
        cmc: card.cmc,
        power: card.power,
        toughness: card.toughness,
        artist: card.artist,
        lang: card.lang,
        legalities: card.legalities,
      };
      const saved = await db.insertCard(entry);
      if (saved) {
        setInventory((prev) => [saved, ...prev]);
      }
      return saved;
    },
    []
  );

  const removeCard = useCallback(async (id) => {
    const ok = await db.deleteCard(id);
    if (ok) {
      setInventory((prev) => prev.filter((c) => c.id !== id));
    }
  }, []);

  const updateCard = useCallback(async (id, updates) => {
    const ok = await db.updateCard(id, updates);
    if (ok) {
      setInventory((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    }
  }, []);

  const bulkImport = useCallback(async (entries) => {
    const saved = await db.bulkInsertCards(entries);
    if (saved.length > 0) {
      setInventory((prev) => [...saved, ...prev]);
    }
    return saved;
  }, []);

  const clearAll = useCallback(async () => {
    const ok = await db.clearAllInventory();
    if (ok) {
      setInventory([]);
    }
    return ok;
  }, []);

  return { inventory, addCard, removeCard, updateCard, bulkImport, clearAll, loading };
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="logo">
      <span className="logo-mark">⭕</span>
      <span className="logo-text">THE SOL RING SHOP</span>
    </div>
  );
}

function NavBar({ page, setPage, inventoryCount, onStorefrontToggle }) {
  return (
    <nav className="navbar">
      <Logo />
      <div className="nav-links">
        <button
          className="nav-btn"
          onClick={onStorefrontToggle}
          style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
        >
          ← Storefront
        </button>
        <button
          className={`nav-btn ${page === "shop" ? "active" : ""}`}
          onClick={() => setPage("shop")}
        >
          Shop
        </button>
        <button
          className={`nav-btn ${page === "inventory" ? "active" : ""}`}
          onClick={() => setPage("inventory")}
        >
          Inventory
          {inventoryCount > 0 && (
            <span className="badge">{inventoryCount}</span>
          )}
        </button>
        <button
          className={`nav-btn ${page === "add" ? "active" : ""}`}
          onClick={() => setPage("add")}
        >
          + Add Cards
        </button>
        <button
          className={`nav-btn ${page === "orders" ? "active" : ""}`}
          onClick={() => setPage("orders")}
        >
          Orders
        </button>
        <button
          className={`nav-btn ${page === "posts" ? "active" : ""}`}
          onClick={() => setPage("posts")}
        >
          Posts
        </button>
        <button
          className={`nav-btn ${page === "import" ? "active" : ""}`}
          onClick={() => setPage("import")}
        >
          ⊕ Import CSV
        </button>
      </div>
    </nav>
  );
}

function FilterPanel({ filters, setFilters, onSearch, loading }) {
  const [localFilters, setLocalFilters] = useState(filters);

  const update = (key, val) => {
    const next = { ...localFilters, [key]: val };
    setLocalFilters(next);
  };

  const toggleColor = (colorId) => {
    const colors = localFilters.colors || [];
    const next = colors.includes(colorId)
      ? colors.filter((c) => c !== colorId)
      : [...colors, colorId];
    update("colors", next);
  };

  const apply = () => {
    setFilters(localFilters);
    onSearch(localFilters);
  };

  const reset = () => {
    const empty = {
      colors: [],
      rarity: "",
      type: "",
      set: "",
      cmc: "",
      format: "",
      keywords: "",
      artist: "",
      power: "",
      toughness: "",
      priceMin: "",
      priceMax: "",
    };
    setLocalFilters(empty);
    setFilters(empty);
    onSearch(empty);
  };

  return (
    <div className="filter-panel">
      <div className="filter-section">
        <label className="filter-label">Colors</label>
        <div className="color-pills">
          {COLORS.map((c) => (
            <button
              key={c.id}
              className={`color-pill color-${c.id} ${
                (localFilters.colors || []).includes(c.id) ? "active" : ""
              }`}
              onClick={() => toggleColor(c.id)}
              title={c.label}
            >
              {c.id}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <label className="filter-label">Rarity</label>
        <select
          className="filter-select"
          value={localFilters.rarity || ""}
          onChange={(e) => update("rarity", e.target.value)}
        >
          <option value="">Any</option>
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">Format</label>
        <select
          className="filter-select"
          value={localFilters.format || ""}
          onChange={(e) => update("format", e.target.value)}
        >
          <option value="">Any</option>
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">Type</label>
        <input
          className="filter-input"
          placeholder="Creature, Instant…"
          value={localFilters.type || ""}
          onChange={(e) => update("type", e.target.value)}
        />
      </div>

      <div className="filter-section">
        <label className="filter-label">Set Code</label>
        <input
          className="filter-input"
          placeholder="e.g. mh3, ltr"
          value={localFilters.set || ""}
          onChange={(e) => update("set", e.target.value.toLowerCase())}
        />
      </div>

      <div className="filter-row">
        <div className="filter-section half">
          <label className="filter-label">CMC</label>
          <input
            className="filter-input"
            type="number"
            min="0"
            placeholder="0"
            value={localFilters.cmc || ""}
            onChange={(e) => update("cmc", e.target.value)}
          />
        </div>
        <div className="filter-section half">
          <label className="filter-label">Power</label>
          <input
            className="filter-input"
            placeholder="*"
            value={localFilters.power || ""}
            onChange={(e) => update("power", e.target.value)}
          />
        </div>
      </div>

      <div className="filter-section">
        <label className="filter-label">Toughness</label>
        <input
          className="filter-input"
          placeholder="*"
          value={localFilters.toughness || ""}
          onChange={(e) => update("toughness", e.target.value)}
        />
      </div>

      <div className="filter-section">
        <label className="filter-label">Oracle Text</label>
        <input
          className="filter-input"
          placeholder="flying, trample…"
          value={localFilters.keywords || ""}
          onChange={(e) => update("keywords", e.target.value)}
        />
      </div>

      <div className="filter-section">
        <label className="filter-label">Artist</label>
        <input
          className="filter-input"
          placeholder="Artist name"
          value={localFilters.artist || ""}
          onChange={(e) => update("artist", e.target.value)}
        />
      </div>

      <div className="filter-actions">
        <button className="btn-primary" onClick={apply} disabled={loading}>
          {loading ? "Searching…" : "Apply Filters"}
        </button>
        <button className="btn-ghost" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}

function CardFace({ card, onAdd, inventoryMode = false }) {
  const [hovered, setHovered] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const isTwoFaced = card.card_faces && card.card_faces.length === 2;
  const frontImg =
    card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal;
  const backImg = card.card_faces?.[1]?.image_uris?.normal;

  const currentImg = flipped && backImg ? backImg : frontImg;
  const price = card.prices?.usd;
  const foilPrice = card.prices?.usd_foil;

  const rarityColor = {
    common: "#aaa",
    uncommon: "#acd0e6",
    rare: "#d4b86a",
    mythic: "#e87830",
  }[card.rarity] || "#aaa";

  return (
    <div
      className="card-face"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="card-image-wrap">
        {currentImg ? (
          <img
            src={currentImg}
            alt={card.name}
            className="card-image"
            loading="lazy"
          />
        ) : (
          <div className="card-image-placeholder">
            <span>{card.name}</span>
          </div>
        )}
        {isTwoFaced && (
          <button
            className="flip-btn"
            onClick={() => setFlipped(!flipped)}
            title="Flip card"
          >
            ⟳
          </button>
        )}
        <div className={`card-overlay ${hovered ? "visible" : ""}`}>
          <div className="card-overlay-content">
            <p className="card-type">{card.type_line}</p>
            {card.oracle_text && (
              <p className="card-oracle">
                {card.oracle_text.slice(0, 120)}
                {card.oracle_text.length > 120 ? "…" : ""}
              </p>
            )}
            {card.power && (
              <p className="card-pt">
                {card.power}/{card.toughness}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card-info">
        <div className="card-name-row">
          <span className="card-name">{card.name}</span>
          <span className="rarity-dot" style={{ color: rarityColor }}>
            ●
          </span>
        </div>
        <div className="card-meta">
          <span className="card-set">{card.set_name}</span>
          <span className="card-number">#{card.collector_number}</span>
        </div>
        <div className="card-prices">
          {price && <span className="price-tag">{formatPrice(price)}</span>}
          {foilPrice && (
            <span className="price-tag foil-price">
              ✦ {formatPrice(foilPrice)}
            </span>
          )}
        </div>
        {!inventoryMode && onAdd && (
          <button className="add-btn" onClick={() => onAdd(card)}>
            Add to Inventory
          </button>
        )}
      </div>
    </div>
  );
}

function InventoryCard({ entry, onRemove, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    price: entry.price,
    qty: entry.qty,
    condition: entry.condition,
    notes: entry.notes || "",
  });

  const save = () => {
    onUpdate(entry.id, editData);
    setEditing(false);
  };

  return (
    <div className="inventory-card">
      <div className="inv-image-wrap">
        {entry.imageUri ? (
          <img src={entry.imageUri} alt={entry.name} className="inv-image" loading="lazy" />
        ) : (
          <div className="inv-image-placeholder">{entry.name}</div>
        )}
        {entry.foil && <span className="foil-badge">✦ FOIL</span>}
      </div>

      <div className="inv-details">
        <div className="inv-name-row">
          <span className="inv-name">{entry.name}</span>
          <span
            className="inv-condition"
            style={{ color: getConditionColor(entry.condition) }}
          >
            {entry.condition}
          </span>
        </div>
        <span className="inv-set">
          {entry.setName} #{entry.collectorNumber}
        </span>

        {editing ? (
          <div className="inv-edit-form">
            <div className="edit-row">
              <label>Condition</label>
              <select
                value={editData.condition}
                onChange={(e) =>
                  setEditData({ ...editData, condition: e.target.value })
                }
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c} — {CONDITION_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="edit-row">
              <label>Price</label>
              <input
                type="number"
                step="0.01"
                value={editData.price}
                onChange={(e) =>
                  setEditData({ ...editData, price: e.target.value })
                }
              />
            </div>
            <div className="edit-row">
              <label>Qty</label>
              <input
                type="number"
                min="1"
                value={editData.qty}
                onChange={(e) =>
                  setEditData({ ...editData, qty: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="edit-row">
              <label>Notes</label>
              <input
                value={editData.notes}
                onChange={(e) =>
                  setEditData({ ...editData, notes: e.target.value })
                }
                placeholder="Optional notes"
              />
            </div>
            <div className="edit-actions">
              <button className="btn-primary small" onClick={save}>
                Save
              </button>
              <button
                className="btn-ghost small"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="inv-stats">
            <span className="inv-price">{formatPrice(entry.price)}</span>
            <span className="inv-qty">×{entry.qty}</span>
            <span className="inv-total">
              = {formatPrice(parseFloat(entry.price) * entry.qty)}
            </span>
          </div>
        )}

        {!editing && (
          <div className="inv-actions">
            <button className="btn-ghost small" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button
              className="btn-danger small"
              onClick={() => onRemove(entry.id)}
            >
              Remove
            </button>
          </div>
        )}
        {entry.notes && !editing && (
          <p className="inv-notes">{entry.notes}</p>
        )}
      </div>
    </div>
  );
}

function AddCardModal({ card, onConfirm, onClose }) {
  const [condition, setCondition] = useState("NM");
  const [foil, setFoil] = useState(false);
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(
    card.prices?.usd || "0.00"
  );
  const [notes, setNotes] = useState("");

  const hasFoil = !!card.prices?.usd_foil;

  useEffect(() => {
    setPrice(
      foil
        ? card.prices?.usd_foil || "0.00"
        : card.prices?.usd || "0.00"
    );
  }, [foil, card]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="modal-content">
          <div className="modal-image-wrap">
            {(card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal) && (
              <img
                src={card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal}
                alt={card.name}
                className="modal-image"
              />
            )}
          </div>
          <div className="modal-form">
            <h2 className="modal-title">{card.name}</h2>
            <p className="modal-subtitle">
              {card.set_name} · #{card.collector_number} ·{" "}
              {card.rarity}
            </p>

            <div className="form-group">
              <label>Condition</label>
              <div className="condition-pills">
                {CONDITIONS.map((c) => (
                  <button
                    key={c}
                    className={`condition-pill ${condition === c ? "active" : ""}`}
                    style={
                      condition === c
                        ? { borderColor: getConditionColor(c), color: getConditionColor(c) }
                        : {}
                    }
                    onClick={() => setCondition(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {hasFoil && (
              <div className="form-group">
                <label>Version</label>
                <div className="toggle-row">
                  <button
                    className={`toggle-btn ${!foil ? "active" : ""}`}
                    onClick={() => setFoil(false)}
                  >
                    Non-Foil
                  </button>
                  <button
                    className={`toggle-btn ${foil ? "active" : ""}`}
                    onClick={() => setFoil(true)}
                  >
                    ✦ Foil
                  </button>
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notes (optional)</label>
              <input
                className="form-input"
                placeholder="Signature, misprint, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              className="btn-primary full"
              onClick={() => onConfirm(card, condition, price, qty, foil, notes)}
            >
              Add to Inventory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAGES ────────────────────────────────────────────────────────────────────

function ShopPage({ onAddCard }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    colors: [],
    rarity: "",
    type: "",
    set: "",
    cmc: "",
    format: "",
    keywords: "",
    artist: "",
    power: "",
    toughness: "",
  });
  const [selectedCard, setSelectedCard] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedAutocomplete = useCallback(
    debounce(async (q) => {
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      const data = await scryfallAutocomplete(q);
      setSuggestions(data.slice(0, 8));
      setShowSuggestions(true);
    }, 300),
    []
  );

  const doSearch = useCallback(
    async (overrideFilters) => {
      setLoading(true);
      setError("");
      const f = overrideFilters || filters;
      const { data, error: err, total: t } = await scryfallSearch(query, f);
      setResults(data);
      setTotal(t || 0);
      if (err) setError(err);
      setLoading(false);
    },
    [query, filters]
  );

  return (
    <div className="shop-page">
      <div className="search-header">
        <div className="search-wrap">
          <div className="search-box-wrap">
            <input
              className="search-box"
              placeholder="Search any Magic card…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                debouncedAutocomplete(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setShowSuggestions(false);
                  doSearch();
                }
                if (e.key === "Escape") setShowSuggestions(false);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => suggestions.length && setShowSuggestions(true)}
            />
            <button className="search-btn" onClick={() => doSearch()}>
              Search
            </button>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions">
              {suggestions.map((s) => (
                <button
                  key={s}
                  className="suggestion-item"
                  onMouseDown={() => {
                    setQuery(s);
                    setShowSuggestions(false);
                    setTimeout(() => doSearch(), 100);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className={`filter-toggle ${showFilters ? "active" : ""}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          ⊟ Filters
        </button>
      </div>

      <div className="shop-body">
        {showFilters && (
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            onSearch={doSearch}
            loading={loading}
          />
        )}

        <div className="results-area">
          {total > 0 && (
            <p className="results-count">
              {total.toLocaleString()} cards found
            </p>
          )}
          {error && <p className="error-msg">{error}</p>}
          {loading && (
            <div className="loading-grid">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="card-skeleton" />
              ))}
            </div>
          )}
          {!loading && results.length > 0 && (
            <div className="card-grid">
              {results.map((card) => (
                <CardFace
                  key={`${card.id}_${card.collector_number}`}
                  card={card}
                  onAdd={() => setSelectedCard(card)}
                />
              ))}
            </div>
          )}
          {!loading && results.length === 0 && !error && (
            <div className="empty-state">
              <p>Search for any Magic card above</p>
              <p className="empty-hint">
                The Sol Ring Shop — use filters for color, rarity, format, type, CMC and more
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedCard && (
        <AddCardModal
          card={selectedCard}
          onConfirm={(card, condition, price, qty, foil, notes) => {
            onAddCard(card, condition, price, qty, foil, notes);
            setSelectedCard(null);
          }}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}

function InventoryPage({ inventory, onRemove, onUpdate, onClearAll }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterFoil, setFilterFoil] = useState("");
  const [view, setView] = useState("grid");
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const totalValue = inventory.reduce(
    (sum, c) => sum + parseFloat(c.price || 0) * (c.qty || 1),
    0
  );

  const filtered = inventory
    .filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.setName?.toLowerCase().includes(q) ||
        c.typeLine?.toLowerCase().includes(q) ||
        c.artist?.toLowerCase().includes(q);
      const matchCondition = !filterCondition || c.condition === filterCondition;
      const matchFoil =
        filterFoil === ""
          ? true
          : filterFoil === "foil"
          ? c.foil
          : !c.foil;
      return matchSearch && matchCondition && matchFoil;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "price") return parseFloat(b.price) - parseFloat(a.price);
      if (sortBy === "condition") return CONDITIONS.indexOf(a.condition) - CONDITIONS.indexOf(b.condition);
      if (sortBy === "set") return a.setName?.localeCompare(b.setName);
      if (sortBy === "added") return new Date(b.addedAt) - new Date(a.addedAt);
      return 0;
    });

  return (
    <div className="inventory-page">
      <PriceSettingsPanel 
        inventory={inventory}
        onPricesUpdated={() => window.location.reload()}
      />
      
      <div className="inv-header">
        <div className="inv-stats-bar">
          <div className="stat-block">
            <span className="stat-num">{inventory.length}</span>
            <span className="stat-label">Total Listings</span>
          </div>
          <div className="stat-block">
            <span className="stat-num">
              {inventory.reduce((s, c) => s + (c.qty || 1), 0)}
            </span>
            <span className="stat-label">Total Cards</span>
          </div>
          <div className="stat-block">
            <span className="stat-num">${totalValue.toFixed(2)}</span>
            <span className="stat-label">Total Value</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {!confirmClear ? (
              <button
                className="btn-danger"
                onClick={() => setConfirmClear(true)}
                disabled={inventory.length === 0}
                style={{ fontSize: 11, padding: "8px 14px" }}
              >
                Clear All Inventory
              </button>
            ) : (
              <>
                <span style={{ fontSize: 11, color: "var(--red)", marginRight: 4 }}>
                  Delete all {inventory.length} cards?
                </span>
                <button
                  className="btn-danger"
                  onClick={async () => {
                    setClearing(true);
                    await onClearAll();
                    setClearing(false);
                    setConfirmClear(false);
                  }}
                  disabled={clearing}
                  style={{ fontSize: 11, padding: "8px 14px" }}
                >
                  {clearing ? "Deleting…" : "Yes, Delete All"}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setConfirmClear(false)}
                  disabled={clearing}
                  style={{ fontSize: 11, padding: "8px 14px" }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        <div className="inv-controls">
          <input
            className="inv-search"
            placeholder="Search inventory…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="filter-select"
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
          >
            <option value="">All Conditions</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            value={filterFoil}
            onChange={(e) => setFilterFoil(e.target.value)}
          >
            <option value="">Foil + Non-Foil</option>
            <option value="foil">Foil Only</option>
            <option value="nonfoil">Non-Foil Only</option>
          </select>
          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Sort: Name</option>
            <option value="price">Sort: Price</option>
            <option value="condition">Sort: Condition</option>
            <option value="set">Sort: Set</option>
            <option value="added">Sort: Recently Added</option>
          </select>
          <div className="view-toggle">
            <button
              className={`view-btn ${view === "grid" ? "active" : ""}`}
              onClick={() => setView("grid")}
            >
              ⊞
            </button>
            <button
              className={`view-btn ${view === "list" ? "active" : ""}`}
              onClick={() => setView("list")}
            >
              ≡
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No cards in inventory yet</p>
          <p className="empty-hint">Use the Shop or Add Cards page to add cards</p>
        </div>
      ) : (
        <div className={view === "grid" ? "inv-grid" : "inv-list"}>
          {filtered.map((entry) => (
            <InventoryCard
              key={entry.id}
              entry={entry}
              onRemove={onRemove}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddCardsPage({ onAddCard }) {
  const [cardName, setCardName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [foundCard, setFoundCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);

  const debouncedAuto = useCallback(
    debounce(async (q) => {
      if (q.length < 2) { setSuggestions([]); return; }
      const data = await scryfallAutocomplete(q);
      setSuggestions(data.slice(0, 8));
      setShowSuggestions(true);
    }, 300),
    []
  );

  const lookup = async (name) => {
    setLoading(true);
    setError("");
    setFoundCard(null);
    const card = await getCardByName(name || cardName);
    if (card) {
      setFoundCard(card);
    } else {
      setError("Card not found. Check spelling or try a different name.");
    }
    setLoading(false);
  };

  return (
    <div className="add-page">
      <h1 className="page-title">Add Cards to Inventory</h1>
      <p className="page-subtitle">
        Search by card name to find exact printings and add them to The Sol Ring Shop inventory
      </p>

      <div className="add-search-wrap">
        <div className="search-box-wrap">
          <input
            className="search-box"
            placeholder="Type a card name…"
            value={cardName}
            onChange={(e) => {
              setCardName(e.target.value);
              debouncedAuto(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setShowSuggestions(false);
                lookup();
              }
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          <button className="search-btn" onClick={() => lookup()}>
            Find
          </button>
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((s) => (
              <button
                key={s}
                className="suggestion-item"
                onMouseDown={() => {
                  setCardName(s);
                  setShowSuggestions(false);
                  lookup(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="error-msg">{error}</p>}
      {success && <p className="success-msg">{success}</p>}

      {loading && <div className="loading-spinner">Searching…</div>}

      {foundCard && (
        <div className="found-card-preview">
          <CardFace
            card={foundCard}
            onAdd={() => setSelectedCard(foundCard)}
            inventoryMode={false}
          />
        </div>
      )}

      {selectedCard && (
        <AddCardModal
          card={selectedCard}
          onConfirm={(card, condition, price, qty, foil, notes) => {
            onAddCard(card, condition, price, qty, foil, notes);
            setSelectedCard(null);
            setSuccess(`Added ${qty}× ${card.name} (${condition}) to inventory`);
            setTimeout(() => setSuccess(""), 3000);
          }}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("shop");
  const [mode, setMode] = useState("storefront"); // "storefront" or "admin"
  const { inventory, addCard, removeCard, updateCard, bulkImport, clearAll } = useInventory();

  // Simple routing based on URL path
  const path = window.location.pathname;
  if (path.startsWith("/profile/")) {
    const username = path.split("/profile/")[1];
    return <ProfilePage username={username} />;
  }
  if (path === "/settings") {
    return <AccountSettings />;
  }
  if (path === "/auth/reset-password") {
    return <ResetPasswordPage />;
  }
  if (path === "/updates") {
    return <UpdatesPage />;
  }

  // Show storefront to public by default
  if (mode === "storefront") {
    return (
      <Storefront
        inventory={inventory}
        onAdminToggle={() => setMode("admin")}
      />
    );
  }

  // Admin view
  return (
    <div className="app">
      <NavBar
        page={page}
        setPage={setPage}
        inventoryCount={inventory.length}
        onStorefrontToggle={() => setMode("storefront")}
      />
      <main className="main-content">
        {page === "shop" && <ShopPage onAddCard={addCard} />}
        {page === "inventory" && (
          <InventoryPage
            inventory={inventory}
            onRemove={removeCard}
            onUpdate={updateCard}
            onClearAll={clearAll}
          />
        )}
        {page === "add" && <AddCardsPage onAddCard={addCard} />}
        {page === "orders" && <OrdersPage />}
        {page === "posts" && <PostsAdminPage />}
        {page === "import" && (
          <ImportPage
            onImportComplete={(entries) => {
              bulkImport(entries);
              setPage("inventory");
            }}
          />
        )}
      </main>
      <footer className="site-footer">
        <span className="footer-logo">⭕ The Sol Ring Shop</span>
        <span className="footer-domain">thesolringshop.com</span>
        <span className="footer-copy">Magic: The Gathering Singles</span>
      </footer>
    </div>
  );
}
