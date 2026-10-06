import { Resvg } from "@resvg/resvg-js";

export const STREAK_COLORS = {
  empty: "#151b23",
  greens: ["#0e4429", "#006d32", "#26a641", "#39d353"],
  bg: "#0d1117",
  text: "#8b949e",
};

export function levelColor(count) {
  if (count === 0) return STREAK_COLORS.empty;
  if (count <= 2) return STREAK_COLORS.greens[0];
  if (count <= 5) return STREAK_COLORS.greens[1];
  if (count <= 9) return STREAK_COLORS.greens[2];
  return STREAK_COLORS.greens[3];
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// cells: 7 rows x N cols of contribution counts (or null for out-of-range
// days in partial edge weeks, rendered blank).
// startMonday: UTC Date of the Monday heading column 0.
export function renderStreakPng(cells, startMonday) {
  const ROWS = 7;
  const COLS = cells[0].length;
  const CELL_W = 16;
  const CELL_H = 32;
  const GAP = 6;
  const R = 4;
  const LABEL_W = 56;
  const MONTH_H = 30;
  const PAD = 22;
  const LEGEND_H = 40;
  const SCALE = 2;

  const gridW = COLS * CELL_W + (COLS - 1) * GAP;
  const gridH = ROWS * CELL_H + (ROWS - 1) * GAP;
  const W = PAD * 2 + LABEL_W + gridW;
  const H = PAD * 2 + MONTH_H + gridH + LEGEND_H;
  const gx = PAD + LABEL_W;
  const gy = PAD + MONTH_H;

  const parts = [];

  // Month ticks: label the column where the month changes.
  let prevMonth = -1;
  for (let col = 0; col < COLS; col++) {
    const d = new Date(startMonday.getTime() + col * 7 * 86400000);
    const m = d.getUTCMonth();
    if (m !== prevMonth) {
      prevMonth = m;
      const x = gx + col * (CELL_W + GAP);
      parts.push(
        `<text x="${x}" y="${PAD + 19}" font-family="sans-serif" font-size="16" fill="${STREAK_COLORS.text}">${MONTHS[m]}</text>`,
      );
    }
  }

  // Day labels + cells.
  DAYS.forEach((name, r) => {
    const cy = gy + r * (CELL_H + GAP) + CELL_H / 2 + 5.5;
    parts.push(
      `<text x="${PAD}" y="${cy}" font-family="sans-serif" font-size="16" fill="${STREAK_COLORS.text}">${name}</text>`,
    );
  });
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (cells[r][c] == null) continue;
      const x = gx + c * (CELL_W + GAP);
      const y = gy + r * (CELL_H + GAP);
      parts.push(
        `<rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" rx="${R}" fill="${levelColor(cells[r][c])}"/>`,
      );
    }
  }

  // Legend, bottom-right like GitHub (mini-bars match cell ratio).
  const sw = 14;
  const sh = 28;
  const sgap = 5;
  const legendW = 46 + 5 * (sw + sgap) + 50;
  let lx = PAD + LABEL_W + gridW - legendW;
  const ly = PAD + MONTH_H + gridH + 12;
  parts.push(
    `<text x="${lx}" y="${ly + 19}" font-family="sans-serif" font-size="14" fill="${STREAK_COLORS.text}">Less</text>`,
  );
  lx += 46;
  for (const sample of [0, 1, 4, 7, 12]) {
    parts.push(
      `<rect x="${lx}" y="${ly}" width="${sw}" height="${sh}" rx="3" fill="${levelColor(sample)}"/>`,
    );
    lx += sw + sgap;
  }
  parts.push(
    `<text x="${lx + 2}" y="${ly + 19}" font-family="sans-serif" font-size="14" fill="${STREAK_COLORS.text}">More</text>`,
  );

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" rx="10" fill="${STREAK_COLORS.bg}"/>` +
    parts.join("") +
    `</svg>`;

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: W * SCALE },
  });
  return resvg.render().asPng();
}
