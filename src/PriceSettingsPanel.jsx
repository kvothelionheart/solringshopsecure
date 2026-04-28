import { useState, useEffect } from "react";
import * as db from "./supabase.js";
import * as priceSync from "./priceSync.js";

export function PriceSettingsPanel({ inventory, onPricesUpdated }) {
  const [markupPercent, setMarkupPercent] = useState(10);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [syncResults, setSyncResults] = useState(null);

  useEffect(() => {
    loadMarkup();
  }, []);

  const loadMarkup = async () => {
    const saved = await db.getMarkupPercent();
    setMarkupPercent(saved);
    priceSync.setMarkupPercent(saved);
  };

  const handleSaveMarkup = async () => {
    setLoading(true);
    const success = await db.setMarkupPercent(markupPercent);
    
    if (success) {
      priceSync.setMarkupPercent(markupPercent);
      alert(`Markup saved: ${markupPercent}%\n\nThis will apply to new imports and price syncs.`);
    } else {
      alert("Failed to save markup setting");
    }
    
    setLoading(false);
  };

  const handleSyncPrices = async () => {
    if (!confirm(
      `Sync prices for ${inventory.length} cards?\n\n` +
      `This will update all card prices to Scryfall TCGPlayer market + ${markupPercent}% markup.\n\n` +
      `This may take several minutes.`
    )) {
      return;
    }

    setSyncing(true);
    setSyncProgress({ current: 0, total: inventory.length });
    setSyncResults(null);

    const results = await priceSync.syncAllPrices(
      inventory,
      (progress) => {
        setSyncProgress(progress);
      },
      async (cardId, updates) => {
        // Update card in database
        const success = await db.updateInventoryItem(cardId, updates);
        if (!success) {
          console.error(`Failed to update card ${cardId}:`, updates);
        }
        return success;
      }
    );

    setSyncResults(results);
    setSyncing(false);
    setSyncProgress(null);

    alert(
      `Price sync complete!\n\n` +
      `Updated: ${results.updated}\n` +
      `No price: ${results.skipped}\n` +
      `Failed: ${results.failed}\n\n` +
      `Refresh the page to see updated prices.`
    );

    if (onPricesUpdated) {
      onPricesUpdated();
    }
  };

  return (
    <div className="price-settings-panel">
      <h3>Price Settings</h3>

      <div className="setting-group">
        <label>
          Markup Percentage (applied to Scryfall TCGPlayer prices)
          <div className="markup-input-group">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={markupPercent}
              onChange={(e) => setMarkupPercent(parseFloat(e.target.value))}
              disabled={syncing}
            />
            <span className="markup-unit">%</span>
          </div>
        </label>
        <button
          onClick={handleSaveMarkup}
          disabled={loading || syncing}
          className="btn-save-markup"
        >
          {loading ? "Saving..." : "Save Markup"}
        </button>
      </div>

      <div className="setting-group">
        <p className="setting-description">
          Updates all card prices from Scryfall (TCGPlayer market data).
          Applies your {markupPercent}% markup to each card.
        </p>
        <button
          onClick={handleSyncPrices}
          disabled={syncing || inventory.length === 0}
          className="btn-sync-prices"
        >
          {syncing ? "Syncing..." : "Sync All Prices from Scryfall"}
        </button>
      </div>

      {syncProgress && (
        <div className="sync-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
            />
          </div>
          <p className="progress-text">
            {syncProgress.current} / {syncProgress.total} cards
            {syncProgress.card && <span className="current-card"> - {syncProgress.card}</span>}
          </p>
        </div>
      )}

      {syncResults && (
        <div className="sync-results">
          <h4>Sync Complete</h4>
          <div className="results-grid">
            <div className="result-stat">
              <span className="stat-label">Total Cards</span>
              <span className="stat-value">{syncResults.total}</span>
            </div>
            <div className="result-stat success">
              <span className="stat-label">Updated</span>
              <span className="stat-value">{syncResults.updated}</span>
            </div>
            <div className="result-stat warning">
              <span className="stat-label">No Price</span>
              <span className="stat-value">{syncResults.skipped}</span>
            </div>
            <div className="result-stat error">
              <span className="stat-label">Failed</span>
              <span className="stat-value">{syncResults.failed}</span>
            </div>
          </div>
          {syncResults.errors.length > 0 && (
            <details className="error-details">
              <summary>View Errors ({syncResults.errors.length})</summary>
              <ul>
                {syncResults.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
