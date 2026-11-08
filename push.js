// Run with Node 18+ (fetch is built in)
// PowerShell:  $env:GITHUB_TOKEN="github_pat_xxx"; node push.js
const token = process.env.GITHUB_TOKEN;
const repo = "vansh0784/leetcode-solutions";
const path = "test.txt";
const text = `hello from my script, ${new Date().toLocaleString()}`; // changes every run

if (!token) {
  console.error("Set GITHUB_TOKEN first");
  process.exit(1);
}

const url = `https://api.github.com/repos/${repo}/contents/${path}`;
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
};

async function main() {
  // 1. Does the file already exist?
  const getRes = await fetch(url, { headers });

  let sha;
  if (getRes.status === 200) {
    const existing = await getRes.json();
    sha = existing.sha;
    console.log("File exists, updating. Current sha:", sha);
  } else if (getRes.status === 404) {
    console.log("File doesn't exist yet, creating it.");
  } else {
    console.error("GET failed:", getRes.status, await getRes.text());
    return;
  }

  // 2. Create or update it
  const putRes = await fetch(url, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: sha ? "Update test.txt" : "Create test.txt",
      content: Buffer.from(text).toString("base64"),
      sha, // left out automatically when undefined (create case)
    }),
  });

  const result = await putRes.json();
  if (!putRes.ok) {
    console.error("PUT failed:", putRes.status, result.message);
    return;
  }

  console.log(putRes.status, "OK, commit:", result.commit.html_url);
}

main();
