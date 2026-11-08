/** Copy for the "+" select toggle on gallery photos (adds the photo to the bulk buy / download bar). */

export function formatPrice(cents: number): string {
  return cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;
}

/** One-line hint above the grid, based on the prices of photos the viewer doesn't own yet. */
export function selectHint(unownedPrices: number[]): string | null {
  if (unownedPrices.length === 0) return null;
  const free = unownedPrices.filter((c) => c === 0).length;
  if (free === unownedPrices.length) return "Tap + to pick photos, then download them together.";
  if (free === 0) return "Tap + to pick photos, then buy them together.";
  return "Tap + to pick photos, then buy or download them together.";
}

/** Accessible name of the toggle; its on/off state is carried by aria-pressed. */
export function selectLabel(photoNumber: number, priceCents: number): string {
  return priceCents === 0
    ? `Select photo ${photoNumber} to download (free)`
    : `Select photo ${photoNumber} to buy (${formatPrice(priceCents)})`;
}
