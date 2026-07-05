// fetch-data.js — pulls raw GitHub data via GraphQL + REST. No third-party action, just our own calls.

const API = "https://api.github.com/graphql";

async function gql(token, query, variables = {}) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error("GraphQL error: " + JSON.stringify(json.errors));
  }
  return json.data;
}

// Basic profile + repo + language info
async function fetchProfile(token, login) {
  const query = `
    query($login: String!) {
      user(login: $login) {
        name
        login
        createdAt
        followers { totalCount }
        following { totalCount }
        pullRequests(states: [OPEN, MERGED, CLOSED]) { totalCount }
        issues { totalCount }
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
          totalCount
          nodes {
            name
            stargazerCount
            forkCount
            primaryLanguage { name color }
            languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
              edges { size node { name color } }
            }
          }
        }
      }
    }
  `;
  const data = await gql(token, query, { login });
  return data.user;
}

// Contribution calendar + commit totals, looped year-by-year since account creation
// (GitHub's API only allows a max 1-year window per query)
async function fetchContributionYears(token, login, createdAt) {
  const startYear = new Date(createdAt).getFullYear();
  const endYear = new Date().getFullYear();
  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          restrictedContributionsCount
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  let totalCommits = 0;
  let totalContributions = 0;
  const allDays = [];

  for (let year = startYear; year <= endYear; year++) {
    const from = `${year}-01-01T00:00:00Z`;
    const toDate = year === endYear ? new Date().toISOString() : `${year}-12-31T23:59:59Z`;
    const data = await gql(token, query, { login, from, to: toDate });
    const cc = data.user.contributionsCollection;
    totalCommits += cc.totalCommitContributions + cc.restrictedContributionsCount;
    totalContributions += cc.contributionCalendar.totalContributions;
    for (const week of cc.contributionCalendar.weeks) {
      for (const day of week.contributionDays) {
        allDays.push(day);
      }
    }
  }

  allDays.sort((a, b) => new Date(a.date) - new Date(b.date));
  return { totalCommits, totalContributions, allDays };
}

// Compute current streak + longest streak from a sorted list of {date, contributionCount}
function computeStreaks(days) {
  let longest = 0;
  let current = 0;
  let running = 0;

  const today = new Date().toISOString().slice(0, 10);

  for (const day of days) {
    if (day.contributionCount > 0) {
      running += 1;
      if (running > longest) longest = running;
    } else {
      running = 0;
    }
  }

  // current streak = walk backwards from the most recent day
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i];
    if (day.date === today && day.contributionCount === 0) {
      // today has no contribution yet — don't break the streak, just skip it
      continue;
    }
    if (day.contributionCount > 0) {
      current += 1;
    } else {
      break;
    }
  }

  return { current, longest };
}

// Aggregate top languages by byte size across all owned repos
function computeTopLanguages(repos, limit = 6) {
  const totals = {};
  for (const repo of repos) {
    for (const edge of repo.languages.edges) {
      const name = edge.node.name;
      if (!totals[name]) totals[name] = { size: 0, color: edge.node.color || "#8884d8" };
      totals[name].size += edge.size;
    }
  }
  const sorted = Object.entries(totals)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, limit);
  const grandTotal = sorted.reduce((sum, [, v]) => sum + v.size, 0);
  return sorted.map(([name, v]) => ({
    name,
    color: v.color,
    percent: grandTotal ? (v.size / grandTotal) * 100 : 0,
  }));
}

module.exports = {
  fetchProfile,
  fetchContributionYears,
  computeStreaks,
  computeTopLanguages,
};
