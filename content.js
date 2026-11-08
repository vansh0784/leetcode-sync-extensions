// Isolated world: pairs a submit with its result, adds problem info,
// and asks background.js to push. Never sees the GitHub token.

// submissionId -> { slug, lang, questionId, code }
const pending = new Map();

window.addEventListener("message", async (event) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (!msg || msg.source !== "lc-sync" || !msg.data) return;

  const { type, data } = msg;

  if (type === "submit") {
    pending.set(data.submissionId, data);
    return;
  }

  if (type === "result") {
    const submission = pending.get(data.submissionId);
    if (!submission) return; // not one of our submits (e.g. a Run)
    pending.delete(data.submissionId); // handle each submission only once

    if (data.verdict !== "Accepted") {
      console.log(`[lc-sync] ${data.verdict}, not pushing`);
      return;
    }

    const problem = await fetchProblem(submission.slug);
    const solution = { ...submission, ...data, ...problem };
    pushToBackground(solution);
  }
});

// Gets the number shown on the site (questionFrontendId), title and difficulty.
// question_id from the submit payload is LeetCode's INTERNAL id, which often
// differs from the visible number, so we ask GraphQL for the real one.
async function fetchProblem(slug) {
  try {
    const res = await fetch("/graphql/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query q($titleSlug: String!) {
          question(titleSlug: $titleSlug) { questionFrontendId title difficulty }
        }`,
        variables: { titleSlug: slug },
      }),
    });
    const json = await res.json();
    const q = json && json.data && json.data.question;
    if (!q) return {};
    return {
      frontendId: q.questionFrontendId,
      title: q.title,
      difficulty: q.difficulty,
    };
  } catch {
    return {}; // still push, just without the number/title
  }
}

function pushToBackground(solution) {
  // After the extension is reloaded, this old copy of content.js is cut off.
  if (!chrome.runtime?.id) {
    console.warn(
      "[lc-sync] Extension was reloaded. Refresh this page to sync again.",
    );
    return;
  }

  try {
    chrome.runtime.sendMessage({ type: "push", solution }, (reply) => {
      if (chrome.runtime.lastError) {
        console.warn("[lc-sync]", chrome.runtime.lastError.message);
      } else if (reply && reply.ok) {
        console.log("[lc-sync]", reply.text);
      } else {
        console.warn("[lc-sync] Push failed:", reply && reply.error);
      }
    });
  } catch (err) {
    console.warn("[lc-sync] Could not reach the extension:", err.message);
  }
}
