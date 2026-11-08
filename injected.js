// Runs in LeetCode's page (world: MAIN), so it can see LeetCode's own fetch calls.
// It never sees the GitHub token. It only forwards submission data to content.js.

// Sends data to content.js (the isolated world)
function send(type, data) {
  window.postMessage({ source: "lc-sync", type, data }, location.origin);
}

const originalFetch = window.fetch;

// Defined once, outside the wrapper
const SUBMIT_RE = /^\/problems\/([^/]+)\/submit\/?$/; // ( ) captures the slug
const CHECK_RE = /^\/submissions\/detail\/\d+\/v2\/check\/?$/;

// Turns any fetch input (string, URL object, Request object) into a path.
// Returns "" if anything goes wrong, so nothing matches and nothing breaks.
function getPath(input) {
  let path = "";
  try {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    path = new URL(url, location.origin).pathname;
  } catch {
    // leave path as ""
  }
  return path;
}

// JSON.parse that returns null instead of throwing
function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

window.fetch = async function (...args) {
  const path = getPath(args[0]);

  // 1. Do the real request and keep the response
  const response = await originalFetch.apply(this, args);

  // 2. Submit: code is in the REQUEST, submission_id is in the RESPONSE
  const submitMatch = path.match(SUBMIT_RE);
  if (submitMatch) {
    const init = args[1];
    const sent =
      init && typeof init.body === "string" ? safeParse(init.body) : null;
    const received = safeParse(await response.clone().text());

    if (sent && received && received.submission_id) {
      send("submit", {
        submissionId: String(received.submission_id),
        slug: submitMatch[1], // e.g. "two-sum"
        lang: sent.lang,
        questionId: sent.question_id,
        code: sent.typed_code,
      });
    }
  }

  // 3. Check: only care about the final response (state === "SUCCESS")
  if (CHECK_RE.test(path)) {
    const data = safeParse(await response.clone().text());

    if (data && data.state === "SUCCESS") {
      send("result", {
        submissionId: String(data.submission_id),
        verdict: data.status_msg,
        runtime: data.status_runtime,
        memory: data.status_memory,
      });
    }
  }

  // 4. Give LeetCode its original, untouched response
  return response;
};
