import { useState, useCallback } from "react";
import * as db from "./supabase.js";

// ─── MIGRATION FROM LOCALSTORAGE TO SUPABASE ──────────────────────────────────

function MigrationButton() {
  const [status, setStatus] = useState("");
  const [migrating, setMigrating] = useState(false);

  const checkLocal = () => {
    try {
      const data = JSON.parse(localStorage.getItem("mtg_inventory") || "[]");
      return data;
    } catch {
      return [];
    }
  };

  const localCards = checkLocal();

  if (localCards.length === 0) return null;

  const migrate = async () => {
    setMigrating(true);
    setStatus(`Uploading ${localCards.length} cards to cloud database…`);

    const result = await db.bulkInsertCards(localCards);

    if (result.length === localCards.length) {
      setStatus(`✓ Successfully migrated ${result.length} cards to cloud database`);
      // Clear localStorage so we don't migrate twice
      localStorage.removeItem("mtg_inventory");
      setTimeout(() => window.location.reload(), 2000);
    } else {
      setStatus(`Migrated ${result.length} of ${localCards.length} cards. Some may have failed.`);
    }
    setMigrating(false);
  };

  return (
    <div style={{
      background: "var(--accent-glow)",
      border: "1px solid rgba(201,168,76,0.3)",
      borderRadius: "var(--radius)",
      padding: "16px",
      marginBottom: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    }}>
      <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>
        ⚠ Local Storage Detected
      </p>
      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Found {localCards.length} cards in your browser's local storage. Upload them to the cloud database so they're visible everywhere.
      </p>
      {status && (
        <p style={{
          fontSize: 12,
          color: status.startsWith("✓") ? "var(--green)" : "var(--text-muted)",
        }}>{status}</p>
      )}
      <button
        className="btn-primary"
        onClick={migrate}
        disabled={migrating}
        style={{ alignSelf: "flex-start" }}
      >
        {migrating ? "Migrating…" : `Migrate ${localCards.length} Cards to Cloud`}
      </button>
    </div>
  );
}

// ─── MANABOX CSV IMPORTER ─────────────────────────────────────────────────────

function getConditionColorStr(cond) {
  const map = {
    NM: "#4ade80",
    LP: "#a3e635",
    MP: "#facc15",
    HP: "#fb923c",
    DMG: "#f87171",
  };
  return map[cond] || "#888";
}

// Condition mapper from ManaBox format to our format
function mapCondition(raw) {
  const map = {
    near_mint: "NM",
    lightly_played: "LP",
    moderately_played: "MP",
    heavily_played: "HP",
    damaged: "DMG",
    nm: "NM",
    lp: "LP",
    mp: "MP",
    hp: "HP",
    dmg: "DMG",
    "near mint": "NM",
    "lightly played": "LP",
    "moderately played": "MP",
    "heavily played": "HP",
  };
  return map[raw?.toLowerCase?.().trim()] || "NM";
}

// Parse ManaBox CSV text into row objects
function parseManaBoxCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  // Parse header
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields with commas inside
    const fields = [];
    let current = "";
    let inQuote = false;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());

    const row = {};
    header.forEach((h, idx) => {
      row[h] = fields[idx] || "";
    });
    rows.push(row);
  }
  return rows;
}

// Fetch a single card from Scryfall by ID with rate limiting
async function fetchCardById(scryfallId) {
  const res = await fetch(`https://api.scryfall.com/cards/${scryfallId}`);
  if (!res.ok) return null;
  return res.json();
}

// Sleep utility for rate limiting
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── IMPORT PAGE COMPONENT ────────────────────────────────────────────────────

export function ImportPage({ onImportComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f) => {
    if (!f || !f.name.endsWith(".csv")) {
      alert("Please upload a .csv file");
      return;
    }
    setFile(f);
    setResults(null);
    setErrors([]);
    setProgress(0);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const rows = parseManaBoxCSV(text);
      setPreview(rows.slice(0, 5));
      setTotal(rows.length);
    };
    reader.readAsText(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const runImport = async () => {
    if (!file) return;
    setImporting(true);
    setProgress(0);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const rows = parseManaBoxCSV(text);
      setTotal(rows.length);

      const imported = [];
      const failed = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setProgress(i + 1);

        try {
          // Use Scryfall ID directly if available — perfect accuracy
          const scryfallId = row["scryfall_id"]?.trim();
          let card = null;

          if (scryfallId && scryfallId.length > 10) {
            card = await fetchCardById(scryfallId);
          }

          if (!card) {
            failed.push({ name: row["name"], reason: "Scryfall lookup failed" });
            continue;
          }

          const condition = mapCondition(row["condition"]);
          const foil = row["foil"]?.toLowerCase() === "foil" || row["foil"]?.toLowerCase() === "true";
          const qty = parseInt(row["quantity"] || row["qty"] || "1") || 1;
          const price = parseFloat(row["purchase_price"] || row["price"] || "0") || 0;

          const entry = {
            id: `${card.id}_${condition}_${foil ? "foil" : "nonfoil"}_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 10)}`,
            card_id: card.id,
            name: card.name,
            set: card.set,
            set_name: card.set_name,
            collector_number: card.collector_number,
            condition,
            foil,
            qty,
            price: price.toFixed(2),
            notes: row["notes"] || "",
            image_uri:
              card.image_uris?.normal ||
              card.card_faces?.[0]?.image_uris?.normal ||
              "",
            image_large:
              card.image_uris?.large ||
              card.card_faces?.[0]?.image_uris?.large ||
              "",
            rarity: card.rarity,
            colors: card.colors || [],
            type_line: card.type_line,
            added_at: new Date().toISOString(),
            scryfall_uri: card.scryfall_uri,
            oracle_text: card.oracle_text || card.card_faces?.[0]?.oracle_text || "",
            mana_cost: card.mana_cost || card.card_faces?.[0]?.mana_cost || "",
            cmc: card.cmc,
            power: card.power,
            toughness: card.toughness,
            artist: card.artist,
            lang: card.lang || row["language"] || "en",
            legalities: card.legalities,
            misprint: row["misprint"]?.toLowerCase() === "true",
            altered: row["altered"]?.toLowerCase() === "true",
          };

          imported.push(entry);
        } catch (err) {
          failed.push({ name: row["name"], reason: err.message });
        }

        // Rate limit — Scryfall allows 10 req/sec, we do ~5/sec to be safe
        await sleep(200);
      }

      setResults({ imported, failed });
      setImporting(false);

      if (imported.length > 0) {
        onImportComplete(imported);
      }
    };

    reader.readAsText(file);
  };

  const isManaBox = preview.length > 0 && ("scryfall_id" in preview[0] || "manabox_id" in preview[0]);

  return (
    <div className="import-page">
      <h1 className="page-title">Import Collection</h1>
      <p className="page-subtitle">
        Supports ManaBox CSV exports — drag and drop or click to upload
      </p>

      <MigrationButton />

      {!importing && !results && (
        <>
          <div
            className={`drop-zone ${dragOver ? "drag-over" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("csv-input").click()}
          >
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {file ? (
              <div className="drop-zone-content">
                <span className="drop-icon">✓</span>
                <span className="drop-filename">{file.name}</span>
                <span className="drop-count">{total} cards detected</span>
              </div>
            ) : (
              <div className="drop-zone-content">
                <span className="drop-icon">⊕</span>
                <span className="drop-label">Drop your ManaBox CSV here</span>
                <span className="drop-hint">or click to browse</span>
              </div>
            )}
          </div>

          {preview.length > 0 && (
            <div className="preview-section">
              <p className="preview-title">
                Preview — first {preview.length} of {total} cards
                {isManaBox && <span className="manabox-badge">✓ ManaBox Format</span>}
              </p>
              <div className="preview-table-wrap">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Set</th>
                      <th>Condition</th>
                      <th>Foil</th>
                      <th>Qty</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        <td className="preview-name">{row.name}</td>
                        <td>{row.set_code || row.set}</td>
                        <td>
                          <span style={{ color: getConditionColorStr(mapCondition(row.condition)) }}>
                            {mapCondition(row.condition)}
                          </span>
                        </td>
                        <td>{row.foil === "foil" || row.foil === "true" ? "✦" : "—"}</td>
                        <td>{row.quantity || row.qty || 1}</td>
                        <td>${parseFloat(row.purchase_price || row.price || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="import-actions">
                <button className="btn-primary" onClick={runImport}>
                  Import {total} Cards
                </button>
                <button className="btn-ghost" onClick={() => { setFile(null); setPreview([]); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {importing && (
        <div className="import-progress">
          <div className="progress-header">
            <span className="progress-label">Importing cards…</span>
            <span className="progress-count">{progress} / {total}</span>
          </div>
          <div className="progress-bar-wrap">
            <div
              className="progress-bar"
              style={{ width: `${(progress / total) * 100}%` }}
            />
          </div>
          <p className="progress-note">
            Fetching card data from Scryfall — please wait
          </p>
        </div>
      )}

      {results && (
        <div className="import-results">
          <div className="results-summary">
            <div className="result-stat success">
              <span className="result-num">{results.imported.length}</span>
              <span className="result-label">Successfully Imported</span>
            </div>
            {results.failed.length > 0 && (
              <div className="result-stat failed">
                <span className="result-num">{results.failed.length}</span>
                <span className="result-label">Failed</span>
              </div>
            )}
          </div>

          {results.failed.length > 0 && (
            <div className="failed-list">
              <p className="failed-title">Failed Cards:</p>
              {results.failed.map((f, i) => (
                <div key={i} className="failed-item">
                  <span className="failed-name">{f.name}</span>
                  <span className="failed-reason">{f.reason}</span>
                </div>
              ))}
            </div>
          )}

          <div className="results-actions">
            <button
              className="btn-primary"
              onClick={() => {
                setFile(null);
                setPreview([]);
                setResults(null);
                setProgress(0);
              }}
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
