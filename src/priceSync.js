// ─── PRICE SYNC ───────────────────────────────────────────────────────────────

// Default markup - can be configured in admin
let CURRENT_MARKUP = 1.10; // 10% over TCGPlayer market price via Scryfall
const FLOOR_COMMON_UNCOMMON = 0.25;
const FLOOR_RARE_MYTHIC = 0.50;

// Set custom markup percentage
export function setMarkupPercent(percent) {
  CURRENT_MARKUP = 1 + (percent / 100);
}

// Get current markup as percentage
export function getMarkupPercent() {
  return (CURRENT_MARKUP - 1) * 100;
}

// Calculate final price based on Scryfall market price + your rules
export function calculatePrice(scryfallPrice, rarity, foil) {
  const marketPrice = parseFloat(scryfallPrice) || 0;
  const markedUp = marketPrice * CURRENT_MARKUP;

  // Determine floor based on rarity
  const floor = (rarity === "rare" || rarity === "mythic")
    ? FLOOR_RARE_MYTHIC
    : FLOOR_COMMON_UNCOMMON;

  // Final price = max of floor or marked-up market
  return Math.max(floor, markedUp).toFixed(2);
}

// Fetch current Scryfall price for a single card
async function fetchScryfallPrice(scryfallId) {
  try {
    const res = await fetch(`https://api.scryfall.com/cards/${scryfallId}`);
    if (!res.ok) return null;
    const card = await res.json();
    return {
      usd: card.prices?.usd,
      usd_foil: card.prices?.usd_foil,
      rarity: card.rarity,
    };
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Sync all prices in inventory
export async function syncAllPrices(inventory, onProgress, updateCardFn) {
  const total = inventory.length;
  let updated = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < total; i++) {
    const entry = inventory[i];
    onProgress({ current: i + 1, total, updated, failed, skipped, currentCard: entry.name });

    const priceData = await fetchScryfallPrice(entry.cardId);

    if (!priceData) {
      failed++;
      errors.push({ name: entry.name, reason: "Scryfall lookup failed" });
      await sleep(150);
      continue;
    }

    // Use foil price if foil, otherwise non-foil
    const sourcePrice = entry.foil ? priceData.usd_foil : priceData.usd;

    if (!sourcePrice) {
      // No price data available — apply floor only
      const rarity = priceData.rarity || entry.rarity;
      const floor = (rarity === "rare" || rarity === "mythic")
        ? FLOOR_RARE_MYTHIC
        : FLOOR_COMMON_UNCOMMON;
      await updateCardFn(entry.id, { price: floor.toFixed(2) });
      skipped++;
      await sleep(150);
      continue;
    }

    const newPrice = calculatePrice(sourcePrice, priceData.rarity || entry.rarity, entry.foil);
    console.log(`[Price Sync] ${entry.name}: $${sourcePrice} → $${newPrice} (${getMarkupPercent()}% markup, rarity: ${priceData.rarity})`);

    await updateCardFn(entry.id, { price: newPrice });
    updated++;
    await sleep(150);
  }

  return { updated, failed, skipped, total, errors };
}
