// generate.js — entry point. Run with: GITHUB_TOKEN=xxx node scripts/generate.js <username>
const fs = require("fs");
const path = require("path");
const {
  fetchProfile,
  fetchContributionYears,
  computeStreaks,
  computeTopLanguages,
} = require("./fetch-data");
const { renderStatsCard, renderLangsCard, renderStreakCard, renderTrophyCard } = require("./render-svg");

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const username = process.argv[2] || process.env.GH_USERNAME;

  if (!token) throw new Error("Missing GITHUB_TOKEN env var");
  if (!username) throw new Error("Usage: node generate.js <github-username>");

  console.log(`Fetching data for ${username}...`);
  const profile = await fetchProfile(token, username);

  const totalStars = profile.repositories.nodes.reduce((sum, r) => sum + r.stargazerCount, 0);

  const { totalCommits, totalContributions, allDays } = await fetchContributionYears(
    token,
    username,
    profile.createdAt
  );
  const { current, longest } = computeStreaks(allDays);
  const topLanguages = computeTopLanguages(profile.repositories.nodes);

  const stats = {
    stars: totalStars,
    commits: totalCommits,
    prs: profile.pullRequests.totalCount,
    issues: profile.issues.totalCount,
    followers: profile.followers.totalCount,
    repos: profile.repositories.totalCount,
    longestStreak: longest,
  };

  const outDir = path.join(__dirname, "..", "profile");
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, "stats.svg"), renderStatsCard({ username, ...stats }));
  fs.writeFileSync(path.join(outDir, "top-langs.svg"), renderLangsCard({ username, languages: topLanguages }));
  fs.writeFileSync(
    path.join(outDir, "streak-stats.svg"),
    renderStreakCard({ username, totalContributions, currentStreak: current, longestStreak: longest })
  );
  fs.writeFileSync(path.join(outDir, "trophy.svg"), renderTrophyCard(stats));

  console.log("Done. Cards written to /profile:");
  console.log(stats);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
