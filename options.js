const $ = (id) => document.getElementById(id);

function showStatus(text, ok) {
  $("status").textContent = text;
  $("status").className = ok ? "ok" : "err";
}

// Accepts "owner/repo" or a pasted URL like https://github.com/owner/repo
function normalizeRepo(value) {
  return value
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
}

async function load() {
  const { token, repo, lastSync } = await chrome.storage.local.get([
    "token",
    "repo",
    "lastSync",
  ]);
  $("token").value = token || "";
  $("repo").value = repo || "";

  // Open the help section for first-time users
  if (!token) $("help").open = true;

  if (lastSync) {
    const when = new Date(lastSync.at).toLocaleString();
    $("last").textContent =
      `Last sync (${when}): ${lastSync.ok ? lastSync.text : "Failed: " + lastSync.error}`;
  }
}

async function save() {
  const token = $("token").value.trim();
  const repo = normalizeRepo($("repo").value);
  $("repo").value = repo;

  if (!token) {
    showStatus("Paste your GitHub token.", false);
    return false;
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    showStatus("Repository must look like your-username/repo-name.", false);
    return false;
  }

  await chrome.storage.local.set({ token, repo });
  showStatus("Saved.", true);
  return true;
}

$("save").addEventListener("click", save);

$("test").addEventListener("click", async () => {
  if (!(await save())) return;
  showStatus("Testing…", true);
  chrome.runtime.sendMessage({ type: "test" }, (reply) => {
    if (chrome.runtime.lastError || !reply) {
      showStatus("Couldn't reach the extension. Try reloading it.", false);
      return;
    }
    showStatus(
      reply.ok ? `${reply.text}. You're all set!` : reply.error,
      reply.ok,
    );
  });
});

load();
