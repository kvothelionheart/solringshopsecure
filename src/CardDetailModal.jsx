import { useState, useEffect } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

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

// Convert mana cost like "{2}{R}{R}" to readable display
function parseManaCost(cost) {
  if (!cost) return null;
  const matches = cost.match(/\{[^}]+\}/g) || [];
  return matches.map((m, i) => {
    const symbol = m.replace(/[{}]/g, "");
    return <span key={i} className="mana-pip">{symbol}</span>;
  });
}

// ─── CARD DETAIL MODAL ────────────────────────────────────────────────────────

export function CardDetailModal({ item, allListings, onAddToCart, onClose, cartQtyMap }) {
  const [selectedListing, setSelectedListing] = useState(item);
  const [quantity, setQuantity] = useState(1);
  const [flipped, setFlipped] = useState(false);

  // Find all listings for this same card (different conditions, foils, etc)
  const sameCardListings = allListings.filter(
    (l) => l.cardId === item.cardId && l.qty > 0
  );

  // Use the larger image if available
  const currentImg = selectedListing.imageLarge || selectedListing.imageUri;
  const cartQty = cartQtyMap[selectedListing.id] || 0;
  const maxQty = selectedListing.qty - cartQty;

  const handleAdd = () => {
    for (let i = 0; i < quantity; i++) {
      onAddToCart(selectedListing);
    }
    setQuantity(1);
  };

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="cdm-overlay" onClick={onClose}>
      <div className="cdm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cdm-close" onClick={onClose}>×</button>

        <div className="cdm-grid">
          {/* Left side - card image */}
          <div className="cdm-image-section">
            <div className="cdm-image-wrap">
              {currentImg ? (
                <img
                  src={currentImg}
                  alt={selectedListing.name}
                  className="cdm-image"
                />
              ) : (
                <div className="cdm-image-placeholder">{selectedListing.name}</div>
              )}
              {selectedListing.foil && <div className="cdm-foil-shimmer" />}
            </div>

            {/* Card meta below image */}
            <div className="cdm-meta-bar">
              <span className="cdm-meta-set">{selectedListing.setName}</span>
              <span className="cdm-meta-num">#{selectedListing.collectorNumber}</span>
              <span
                className="cdm-meta-rarity"
                style={{ color: getRarityColor(selectedListing.rarity) }}
              >
                ● {selectedListing.rarity}
              </span>
            </div>

            {/* External links */}
            <div className="cdm-links">
              {selectedListing.scryfallUri && (
                <a
                  href={selectedListing.scryfallUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cdm-link"
                >
                  View on Scryfall ↗
                </a>
              )}
            </div>
          </div>

          {/* Right side - details and listings */}
          <div className="cdm-details-section">
            {/* Header */}
            <div className="cdm-header">
              <h1 className="cdm-name">{selectedListing.name}</h1>
              {selectedListing.manaCost && (
                <div className="cdm-mana-cost">
                  {parseManaCost(selectedListing.manaCost)}
                </div>
              )}
              <p className="cdm-type">{selectedListing.typeLine}</p>
              {selectedListing.power && (
                <p className="cdm-pt">
                  {selectedListing.power} / {selectedListing.toughness}
                </p>
              )}
            </div>

            {/* Oracle text */}
            {selectedListing.oracleText && (
              <div className="cdm-oracle">
                {selectedListing.oracleText.split("\n").map((line, i) => (
                  <p key={i} className="cdm-oracle-line">{line}</p>
                ))}
              </div>
            )}

            {/* Artist */}
            {selectedListing.artist && (
              <p className="cdm-artist">Illustrated by {selectedListing.artist}</p>
            )}

            {/* All available listings of this card */}
            {sameCardListings.length > 1 && (
              <div className="cdm-listings-section">
                <p className="cdm-listings-label">Available Listings</p>
                <div className="cdm-listings">
                  {sameCardListings.map((listing) => (
                    <button
                      key={listing.id}
                      className={`cdm-listing-pill ${selectedListing.id === listing.id ? "active" : ""}`}
                      onClick={() => {
                        setSelectedListing(listing);
                        setQuantity(1);
                      }}
                    >
                      <span style={{ color: getConditionColor(listing.condition) }}>
                        {listing.condition}
                      </span>
                      {listing.foil && <span className="cdm-foil-tag">✦</span>}
                      <span className="cdm-listing-price">{formatPrice(listing.price)}</span>
                      <span className="cdm-listing-qty">×{listing.qty}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected listing details */}
            <div className="cdm-selection-box">
              <div className="cdm-selection-row">
                <div className="cdm-selection-info">
                  <div className="cdm-selection-tags">
                    <span
                      className="cdm-condition-tag"
                      style={{
                        color: getConditionColor(selectedListing.condition),
                        borderColor: getConditionColor(selectedListing.condition),
                      }}
                    >
                      {selectedListing.condition}
                    </span>
                    {selectedListing.foil && (
                      <span className="cdm-foil-badge">✦ Foil</span>
                    )}
                    {selectedListing.misprint && (
                      <span className="cdm-special-badge">Misprint</span>
                    )}
                    {selectedListing.altered && (
                      <span className="cdm-special-badge">Altered</span>
                    )}
                    <span className="cdm-stock">
                      {selectedListing.qty} in stock
                    </span>
                  </div>
                  {selectedListing.notes && (
                    <p className="cdm-notes">📝 {selectedListing.notes}</p>
                  )}
                </div>
                <div className="cdm-price-display">
                  {formatPrice(selectedListing.price)}
                </div>
              </div>

              {/* Add to cart row */}
              {maxQty > 0 ? (
                <div className="cdm-cart-row">
                  <div className="cdm-qty-selector">
                    <button
                      className="cdm-qty-btn"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >−</button>
                    <span className="cdm-qty-display">{quantity}</span>
                    <button
                      className="cdm-qty-btn"
                      onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                      disabled={quantity >= maxQty}
                    >+</button>
                  </div>
                  <button
                    className="cdm-add-btn"
                    onClick={handleAdd}
                  >
                    Add {quantity} to Cart — {formatPrice(parseFloat(selectedListing.price) * quantity)}
                  </button>
                </div>
              ) : (
                <div className="cdm-sold-out">
                  {cartQty > 0
                    ? `All ${selectedListing.qty} already in your cart`
                    : "Sold Out"}
                </div>
              )}
            </div>

            {/* Card legalities */}
            {selectedListing.legalities && (
              <div className="cdm-legalities">
                <p className="cdm-legal-label">Format Legality</p>
                <div className="cdm-legal-grid">
                  {Object.entries(selectedListing.legalities)
                    .filter(([format]) =>
                      ["standard", "pioneer", "modern", "legacy", "vintage", "commander", "pauper"].includes(format)
                    )
                    .map(([format, status]) => (
                      <div
                        key={format}
                        className={`cdm-legal-item legal-${status}`}
                      >
                        <span className="cdm-legal-format">{format}</span>
                        <span className="cdm-legal-status">{status.replace("_", " ")}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
