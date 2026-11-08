// Service worker: the ONLY place that reads the token and talks to GitHub.
// Token and repo come from the settings page (chrome.storage.local), so every
// user pushes to their own repo with their own token.

const API = "https://api.github.com";

const EXT = {
  cpp: "cpp",
  c: "c",
  java: "java",
  python: "py",
  python3: "py",
  pythondata: "py",
  javascript: "js",
  typescript: "ts",
  golang: "go",
  rust: "rs",
  kotlin: "kt",
  swift: "swift",
  csharp: "cs",
  ruby: "rb",
  scala: "scala",
  php: "php",
  dart: "dart",
  racket: "rkt",
  erlang: "erl",
  elixir: "ex",
  bash: "sh",
  mysql: "sql",
  mssql: "sql",
  oraclesql: "sql",
  postgresql: "sql",
};

// Browsers have no Buffer. btoa() alone breaks on non-English characters,
// so convert to UTF-8 bytes first.
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64) {
  const binary = atob(b64.replace(/\s/g, ""));
  return new TextDecoder().decode(
    Uint8Array.from(binary, (c) => c.charCodeAt(0)),
  );
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function getSettings() {
  const { token, repo } = await chrome.storage.local.get(["token", "repo"]);
  if (!token || !repo) {
    throw new Error(
      "Not set up yet. Click the extension icon and add your token and repo.",
    );
  }
  return { token, repo };
}

function setBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

async function pushSolution(s) {
  const { token, repo } = await getSettings();
  const headers = githubHeaders(token);

  const ext = EXT[s.lang] || "txt";
  // 0001-two-sum/two-sum.cpp (falls back to two-sum/ if the number is unknown)
  const folder = s.frontendId
    ? `${String(s.frontendId).padStart(4, "0")}-${s.slug}`
    : s.slug;
  const path = `${folder}/${s.slug}.${ext}`;
  const url = `${API}/repos/${repo}/contents/${path}`;

  // 1. Does the file already exist?
  const getRes = await fetch(url, { headers });
  let sha;
  if (getRes.status === 200) {
    const existing = await getRes.json();
    sha = existing.sha;
    // Same code as last time? Skip, so we don't make empty commits.
    if (existing.content && fromBase64(existing.content) === s.code) {
      return `${path} unchanged, nothing to push`;
    }
  } else if (getRes.status !== 404) {
    throw new Error(`GitHub ${getRes.status}: ${await getRes.text()}`);
  }

  // 2. Create or update it
  const name = s.frontendId ? `#${s.frontendId} ${s.title}` : s.title || s.slug;
  const message = [name, s.difficulty, s.runtime, s.memory]
    .filter(Boolean)
    .join(" | ");

  const putRes = await fetch(url, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: toBase64(s.code), sha }),
  });
  if (!putRes.ok)
    throw new Error(`GitHub ${putRes.status}: ${await putRes.text()}`);

  return `Pushed ${path}`;
}

// Used by the settings page's "Test connection" button
async function testConnection() {
  const { token, repo } = await getSettings();
  const res = await fetch(`${API}/repos/${repo}`, {
    headers: githubHeaders(token),
  });
  if (res.status === 401) throw new Error("Token is invalid or expired.");
  if (res.status === 404)
    throw new Error("Repo not found, or the token doesn't have access to it.");
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);

  const info = await res.json();
  if (info.permissions && !info.permissions.push) {
    throw new Error(
      "Token can read the repo but not write. Give it Contents: Read and write.",
    );
  }
  return `Connected to ${info.full_name}`;
}

async function saveLastSync(result) {
  await chrome.storage.local.set({ lastSync: { ...result, at: Date.now() } });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg) return;

  if (msg.type === "push") {
    pushSolution(msg.solution)
      .then(async (text) => {
        setBadge("✓", "#2da44e");
        await saveLastSync({ ok: true, text });
        sendResponse({ ok: true, text });
      })
      .catch(async (err) => {
        setBadge("!", "#cf222e");
        await saveLastSync({ ok: false, error: err.message });
        sendResponse({ ok: false, error: err.message });
      });
    return true; // keeps the channel open while we wait for GitHub
  }

  if (msg.type === "test") {
    testConnection()
      .then((text) => sendResponse({ ok: true, text }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});

// Clicking the toolbar icon opens settings and clears the badge
chrome.action.onClicked.addListener(() => {
  setBadge("", "#2da44e");
  chrome.runtime.openOptionsPage();
});

// First install: open settings so new users know where to start
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") chrome.runtime.openOptionsPage();
});
