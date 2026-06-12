// Helpers for turning relevance records into series and sparklines.

export const FIRST_YEAR = 1980;
export const LAST_YEAR = 2020;

// Collapse a topic's relevance records into one value per year. Records may
// each cover a subset of years; the first record with a value wins.
export function seriesFor(records: any[]): number[] {
  const series: number[] = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    const record = records.find((r) => r[year.toString()] !== undefined);
    series.push(record ? record[year.toString()] : 0);
  }
  return series;
}

// Map a 0–1 series onto a small polyline for inline SVG sparklines.
export function sparkline(series: number[]) {
  const w = 120;
  const h = 36;
  const pad = 3;
  const step = (w - pad * 2) / (series.length - 1);
  const coords = series.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (1 - Math.max(0, Math.min(1, v))) * (h - pad * 2);
    return [Number(x.toFixed(1)), Number(y.toFixed(1))];
  });
  const [endX, endY] = coords[coords.length - 1];
  return {
    points: coords.map(([x, y]) => `${x},${y}`).join(' '),
    endX,
    endY,
  };
}

// Pearson correlation between two equal-length series, or null when either
// side is flat (zero variance) and the statistic is undefined.
export function pearson(a: number[], b: number[]): number | null {
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  if (varA === 0 || varB === 0) return null;
  return cov / Math.sqrt(varA * varB);
}
