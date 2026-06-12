// The classic FiveThirtyEight chart palette.
export const PALETTE = [
  '#008fd5', // blue
  '#fc4f30', // red
  '#e5ae38', // gold
  '#6d904f', // green
  '#810f7c', // purple
];

// Topic ids use underscores (and occasionally dashes) as separators.
export function topicTitle(id: string): string {
  return id.replace(/[-_]/g, ' ');
}

// Deterministic color per topic, so a topic looks the same everywhere.
export function colorFor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
