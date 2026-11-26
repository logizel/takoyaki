export type Feature = {
  id: string;
  label: string;
  note: string;
  desc: string;
};

export type CommandItem = {
  id: string;
  command: string;
  note: string;
  price: string;
};

/** Feature copy follows the Logizel/takoyaki README. */
export const features: Feature[] = [
  {
    id: "pings",
    label: "Real-time pings",
    note: "Pushes, PRs, issues, CI",
    desc: "Get notified the moment someone pushes, opens a pull request, files an issue, or a CI/CD workflow completes. Each event links straight to the relevant GitHub page. Private repos stay anonymous.",
  },
  {
    id: "stats",
    label: "Contribution stats",
    note: "/stats me",
    desc: "Pull live data straight from GitHub: total counts, daily averages, and side-by-side comparisons with teammates.",
  },
  {
    id: "streak",
    label: "Streak heatmap",
    note: "/stats streak",
    desc: "Six months of commit history rendered as an ANSI heatmap, right inside Discord. No dashboard, no context switch.",
  },
  {
    id: "leaderboards",
    label: "Leaderboards",
    note: "/stats top",
    desc: "Rank the server by commits today or all year. Good-natured bragging rights, updated automatically.",
  },
  {
    id: "compare",
    label: "Compare",
    note: "/stats compare",
    desc: "Line your trailing-year commit count up against any teammate in the server.",
  },
  {
    id: "topday",
    label: "Top day",
    note: "/stats top-day",
    desc: "A daily leaderboard of who has the most commits today.",
  },
  {
    id: "modes",
    label: "Personal & org modes",
    note: "/setchannel",
    desc: "Standard mode pings linked users; Org mode tracks a whole organisation, anonymised.",
  },
  {
    id: "setup",
    label: "Easy setup",
    note: "/github link",
    desc: "Install the GitHub App and link your account in one command — no per-repo webhooks.",
  },
];

export const commands: CommandItem[] = [
  { id: "link", command: "/github link", note: "Install the app & link your account.", price: "free" },
  { id: "unlink", command: "/github unlink", note: "Remove your GitHub link.", price: "free" },
  { id: "setchannel", command: "/setchannel", note: "Pick a channel, Standard or Org mode. Admin only.", price: "admin" },
  { id: "me", command: "/stats me", note: "Your commits today and over the past 365 days.", price: "auto" },
  { id: "streak", command: "/stats streak", note: "Your commit streak chart for the past year.", price: "auto" },
  { id: "compare", command: "/stats compare", note: "Compare your commits with another user.", price: "auto" },
  { id: "top", command: "/stats top", note: "The server leaderboard for the past 365 days.", price: "auto" },
  { id: "topday", command: "/stats top-day", note: "Who has the most commits today.", price: "auto" },
];

export const setupSteps = [
  {
    num: "01",
    title: "Install the GitHub App",
    body: "Add Takoyaki to your personal account or organization. For org tracking, install on the org directly.",
  },
  {
    num: "02",
    title: "Run /github link",
    body: "Connect your Discord account to your GitHub username via OAuth.",
  },
  {
    num: "03",
    title: "Run /setchannel",
    body: "Pick a channel and choose Standard Mode (personal pings) or Org Mode (anonymous org-wide events). Done.",
  },
];

export const bill = [
  { label: "Invite Takoyaki", value: "free" },
  { label: "/github link", value: "link your account" },
  { label: "/setchannel", value: "pick a channel" },
  { label: "Pings, stats & leaderboards", value: "included" },
];
