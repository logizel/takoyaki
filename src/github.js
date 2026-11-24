import crypto from "crypto";

const API_BASE = "https://api.github.com";
const API_VERSION = "2022-11-28";
const REQUEST_TIMEOUT_MS = 10_000;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

let privateKey = null;
let privateKeySource = null;
const installationIds = new Map();
const installationTokens = new Map();

export class GitHubError extends Error {
  constructor(code, message, status = null) {
    super(message);
    this.name = "GitHubError";
    this.code = code;
    this.status = status;
  }
}

export function isGitHubAppConfigured() {
  return Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
}

function getPrivateKey() {
  const source = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!source) {
    throw new GitHubError("NOT_CONFIGURED", "GITHUB_APP_PRIVATE_KEY is not set.");
  }

  if (privateKey && privateKeySource === source) return privateKey;

  let pem = source.trim();
  // Hosting providers often store multiline secrets with escaped newlines.
  if (pem.includes("\\n")) pem = pem.replace(/\\n/g, "\n");

  // Also accept a base64-encoded PEM, which is easier to store in some setups.
  if (!pem.includes("-----BEGIN")) {
    const decoded = Buffer.from(pem, "base64").toString("utf8");
    if (decoded.includes("-----BEGIN")) pem = decoded;
  }

  try {
    privateKey = crypto.createPrivateKey(pem);
    privateKeySource = source;
    return privateKey;
  } catch {
    throw new GitHubError("NOT_CONFIGURED", "GITHUB_APP_PRIVATE_KEY is not a valid PEM private key.");
  }
}

function createAppJwt() {
  const appId = process.env.GITHUB_APP_ID;
  if (!appId) {
    throw new GitHubError("NOT_CONFIGURED", "GITHUB_APP_ID is not set.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iat: now - 60,
    exp: now + 9 * 60,
    iss: /^\d+$/.test(appId) ? Number(appId) : appId,
  };

  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const signingInput = `${encode(header)}.${encode(payload)}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(signingInput), getPrivateKey())
    .toString("base64url");

  return `${signingInput}.${signature}`;
}

async function githubFetch(path, { token = null, jwt = null, method = "GET" } = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VERSION,
    "User-Agent": "Takoyaki",
  };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  else if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new GitHubError("TIMEOUT", "GitHub API request timed out.");
    }
    throw new GitHubError("NETWORK", "Could not reach GitHub.");
  }

  if (!response.ok) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    let apiMessage = "";
    try {
      const body = await response.json();
      apiMessage = typeof body?.message === "string" ? body.message : "";
    } catch {
      // Response body was not JSON; use a generic message below.
    }

    if ((response.status === 403 || response.status === 429) && remaining === "0") {
      throw new GitHubError(
        "RATE_LIMITED",
        apiMessage || "GitHub API rate limit exceeded.",
        response.status
      );
    }

    const code =
      response.status === 404
        ? "NOT_FOUND"
        : response.status === 401
          ? "UNAUTHORIZED"
          : "API_ERROR";
    throw new GitHubError(
      code,
      apiMessage || `GitHub API returned ${response.status}.`,
      response.status
    );
  }

  if (response.status === 204) return null;
  return response.json();
}

async function getInstallationId(org) {
  const cacheKey = org.toLowerCase();
  if (installationIds.has(cacheKey)) return installationIds.get(cacheKey);

  const jwt = createAppJwt();
  const encodedOrg = encodeURIComponent(org);
  const paths = [`/orgs/${encodedOrg}/installation`, `/users/${encodedOrg}/installation`];

  for (const path of paths) {
    try {
      const data = await githubFetch(path, { jwt });
      if (data?.id) {
        installationIds.set(cacheKey, data.id);
        return data.id;
      }
    } catch (error) {
      if (error instanceof GitHubError && error.code === "NOT_FOUND") continue;
      throw error;
    }
  }

  throw new GitHubError("NOT_INSTALLED", `The GitHub App is not installed on ${org}.`);
}

async function getInstallationToken(org) {
  const installationId = await getInstallationId(org);
  const cached = installationTokens.get(installationId);
  const now = Date.now();
  if (cached && cached.expiresAt - TOKEN_REFRESH_BUFFER_MS > now) {
    return cached.token;
  }

  const jwt = createAppJwt();
  const data = await githubFetch(`/app/installations/${installationId}/access_tokens`, {
    jwt,
    method: "POST",
  });

  if (!data?.token) {
    throw new GitHubError("UNAUTHORIZED", "GitHub did not return an installation token.");
  }

  const expiresAt = Date.parse(data.expires_at);
  installationTokens.set(installationId, {
    token: data.token,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : now + 50 * 60 * 1000,
  });

  return data.token;
}

async function installationRequest(org, path) {
  let token = await getInstallationToken(org);

  try {
    return await githubFetch(path, { token });
  } catch (error) {
    // A cached token may have been revoked (for example, after a reinstall).
    // Drop both caches so the installation ID is looked up again.
    if (error instanceof GitHubError && error.status === 401) {
      const cacheKey = org.toLowerCase();
      const installationId = installationIds.get(cacheKey);
      if (installationId) installationTokens.delete(installationId);
      installationIds.delete(cacheKey);
      token = await getInstallationToken(org);
      return githubFetch(path, { token });
    }
    throw error;
  }
}

export async function listOrgRepos(org, page = 1, perPage = 25) {
  const query = `type=all&sort=pushed&direction=desc&per_page=${perPage}&page=${page}`;
  const encodedOrg = encodeURIComponent(org);

  let raw;
  try {
    raw = await installationRequest(org, `/orgs/${encodedOrg}/repos?${query}`);
  } catch (error) {
    // Org mode tracks repository owners, which may be user accounts rather than
    // organizations. Fall back to the user repositories endpoint in that case.
    if (error instanceof GitHubError && error.code === "NOT_FOUND") {
      raw = await installationRequest(org, `/users/${encodedOrg}/repos?${query}`);
    } else {
      throw error;
    }
  }

  const items = (Array.isArray(raw) ? raw : [])
    .filter((repo) => !repo.archived && !repo.disabled)
    .map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner?.login || org,
      private: Boolean(repo.private),
      pushedAt: repo.pushed_at,
      htmlUrl: repo.html_url,
      description: repo.description || "",
    }));

  return {
    items,
    hasNext: Array.isArray(raw) && raw.length >= perPage,
  };
}

export async function listOpenPullRequests(owner, repo, page = 1, perPage = 25) {
  const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=open&sort=updated&direction=desc&per_page=${perPage}&page=${page}`;
  const raw = await installationRequest(owner, path);

  const items = (Array.isArray(raw) ? raw : []).map((pr) => ({
    number: pr.number,
    title: pr.title || "",
    htmlUrl: pr.html_url,
    updatedAt: pr.updated_at,
    createdAt: pr.created_at,
    draft: Boolean(pr.draft),
    user: pr.user?.login || "unknown",
  }));

  return {
    items,
    hasNext: Array.isArray(raw) && raw.length >= perPage,
  };
}