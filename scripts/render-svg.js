// render-svg.js — turns plain numbers into styled SVG cards. Pure string templates, no dependencies.

const THEME = {
  bg: "#0d1117",
  border: "#30363d",
  title: "#1abc9c",
  text: "#c9d1d9",
  icon: "#58a6ff",
};

function cardWrapper(width, height, title, innerContent) {
  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .title { font: 600 18px 'Segoe UI', Ubuntu, sans-serif; fill: ${THEME.title}; }
    .label { font: 400 13px 'Segoe UI', Ubuntu, sans-serif; fill: ${THEME.text}; }
    .value { font: 600 13px 'Segoe UI', Ubuntu, sans-serif; fill: ${THEME.text}; }
    .stagger { opacity: 0; animation: fadeIn 0.4s ease-in-out forwards; }
    @keyframes fadeIn { to { opacity: 1; } }
  </style>
  <rect x="0.5" y="0.5" rx="8" width="${width - 1}" height="${height - 1}" fill="${THEME.bg}" stroke="${THEME.border}" />
  <text x="25" y="35" class="title">${title}</text>
  ${innerContent}
</svg>`.trim();
}

function statRow(icon, label, value, x, y, delay) {
  return `
  <g class="stagger" style="animation-delay: ${delay}ms" transform="translate(${x}, ${y})">
    <text class="icon" x="0" y="0" font-size="14" fill="${THEME.icon}">${icon}</text>
    <text class="label" x="22" y="0">${label}:</text>
    <text class="value" x="${22 + label.length * 7 + 10}" y="0">${value}</text>
  </g>`;
}

function renderStatsCard({ username, stars, commits, prs, issues, followers, repos }) {
  const rows = [
    ["⭐", "Total Stars", stars],
    ["📦", "Commits", commits],
    ["🔀", "Pull Requests", prs],
    ["❗", "Issues", issues],
    ["👥", "Followers", followers],
    ["📁", "Public Repos", repos],
  ];
  const inner = rows
    .map(([icon, label, value], i) => statRow(icon, label, value, 25, 65 + i * 27, i * 100))
    .join("\n");
  return cardWrapper(420, 65 + rows.length * 27 + 15, `${username}'s GitHub Stats`, inner);
}

function renderLangsCard({ username, languages }) {
  let y = 55;
  const barWidth = 320;
  const rows = languages
    .map((lang, i) => {
      const filled = Math.max(4, (lang.percent / 100) * barWidth);
      const row = `
  <g class="stagger" style="animation-delay: ${i * 100}ms" transform="translate(25, ${y})">
    <text class="label" x="0" y="0">${lang.name}</text>
    <text class="value" x="${barWidth}" y="0" text-anchor="end">${lang.percent.toFixed(1)}%</text>
    <rect x="0" y="8" width="${barWidth}" height="6" rx="3" fill="#30363d" />
    <rect x="0" y="8" width="${filled}" height="6" rx="3" fill="${lang.color}" />
  </g>`;
      y += 34;
      return row;
    })
    .join("\n");
  return cardWrapper(370, y + 10, "Most Used Languages", rows);
}

function renderStreakCard({ username, totalContributions, currentStreak, longestStreak }) {
  const cols = [
    { label: "Total Contributions", value: totalContributions, x: 60 },
    { label: "Current Streak", value: currentStreak, x: 220 },
    { label: "Longest Streak", value: longestStreak, x: 380 },
  ];
  const width = 500;
  const height = 150;
  const inner = cols
    .map(
      (c, i) => `
  <g class="stagger" style="animation-delay: ${i * 150}ms" text-anchor="middle" transform="translate(${c.x}, 90)">
    <text x="0" y="0" font-size="28" font-weight="700" fill="${THEME.title}">${c.value}</text>
    <text x="0" y="22" class="label">${c.label}</text>
  </g>`
    )
    .join("\n");
  const dividers = `
  <line x1="150" y1="45" x2="150" y2="120" stroke="${THEME.border}" />
  <line x1="310" y1="45" x2="310" y2="120" stroke="${THEME.border}" />`;
  return cardWrapper(width, height, `${username}'s Streak Stats`, inner + dividers);
}

// Simple custom trophy/achievement badges based on thresholds we define ourselves
const TROPHY_DEFS = [
  { key: "stars", label: "Stars", thresholds: [1, 10, 50, 200] },
  { key: "commits", label: "Commits", thresholds: [10, 100, 500, 2000] },
  { key: "followers", label: "Followers", thresholds: [1, 10, 50, 200] },
  { key: "repos", label: "Repos", thresholds: [1, 5, 15, 40] },
  { key: "prs", label: "Pull Requests", thresholds: [1, 5, 20, 100] },
  { key: "longestStreak", label: "Longest Streak", thresholds: [3, 14, 30, 100] },
];
const RANKS = ["C", "B", "A", "S"];
const RANK_COLORS = { C: "#8b949e", B: "#3fb950", A: "#58a6ff", S: "#f0b90b" };

function rankFor(value, thresholds) {
  let rank = null;
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) rank = RANKS[i];
  }
  return rank; // null if below the first threshold
}

function renderTrophyCard(stats) {
  const boxW = 110;
  const boxH = 110;
  const perRow = 6;
  const earned = TROPHY_DEFS.map((def) => ({ ...def, rank: rankFor(stats[def.key] ?? 0, def.thresholds) }));

  const inner = earned
    .map((t, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = 20 + col * boxW;
      const y = 55 + row * boxH;
      const color = t.rank ? RANK_COLORS[t.rank] : "#484f58";
      const rankText = t.rank || "—";
      return `
  <g class="stagger" style="animation-delay: ${i * 80}ms" transform="translate(${x}, ${y})">
    <circle cx="${boxW / 2 - 10}" cy="30" r="26" fill="none" stroke="${color}" stroke-width="3" />
    <text x="${boxW / 2 - 10}" y="38" text-anchor="middle" font-size="20" font-weight="700" fill="${color}">${rankText}</text>
    <text x="${boxW / 2 - 10}" y="78" text-anchor="middle" class="label">${t.label}</text>
  </g>`;
    })
    .join("\n");

  const rows = Math.ceil(earned.length / perRow);
  return cardWrapper(perRow * boxW + 10, 55 + rows * boxH, "GitHub Trophies", inner);
}

module.exports = { renderStatsCard, renderLangsCard, renderStreakCard, renderTrophyCard };
