# LeetCode Sync

A Chrome extension that pushes your **accepted** LeetCode solutions to your own GitHub repo. Solve once on LeetCode, and it shows up on GitHub.

- Only **Submit + Accepted** gets pushed. Wrong answers, errors and "Run" are ignored.
- Files land at `0001-two-sum/two-sum.cpp`, with commits like `#1 Two Sum | Easy | 3 ms | 15 MB`.
- Resubmitting a problem updates the file. Identical code is skipped.
- Works with any language LeetCode supports.

## Install

1. Download this repo (**Code → Download ZIP**) and unzip it, or `git clone` it.
2. Open `chrome://extensions` in Chrome (Edge and Brave work too).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this folder (the one containing `manifest.json`).
5. The settings page opens. Follow the steps below.

## Set up

1. **Create a repo** for your solutions, e.g. `leetcode-solutions`. Tick "Add a README".
2. **Create a fine-grained token:** GitHub → Settings → Developer settings → Personal access tokens → [Fine-grained tokens](https://github.com/settings/personal-access-tokens/new) → Generate new token.
   - **Repository access:** Only select repositories → your solutions repo
   - **Permissions → Repository permissions → Contents:** Read and write
   - Set an expiration
3. In the extension settings, paste the token and your repo (`your-username/leetcode-solutions`), then click **Test connection**.
4. Solve a problem on leetcode.com and click **Submit**. Done.

Open the settings again any time by clicking the extension icon (pin it via the puzzle-piece menu).

## Is my token safe?

- It's stored only in your browser's extension storage, never in any file and never sent anywhere except `api.github.com`.
- The script that runs inside LeetCode's page never sees it. Only the background script reads it.
- A fine-grained token limited to one repo with only Contents access means that, even in the worst case, it can only touch that one repo.

See [PRIVACY.md](PRIVACY.md) for details.

## Troubleshooting

| What you see                  | Fix                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| Badge shows **!**             | Click the icon. The settings page shows the last error.                                             |
| "Repo not found"              | Check the repo name, and that the token has access to that repo.                                    |
| "Token is invalid or expired" | Generate a new token and paste it in settings.                                                      |
| Nothing happens after Submit  | Refresh the LeetCode tab. If you just installed or updated the extension, open tabs need a refresh. |
| Still nothing                 | Open DevTools on the LeetCode tab → Console, look for `[lc-sync]` lines.                            |

## How it works

| File              | Role                                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `injected.js`     | Runs inside LeetCode's page. Wraps `fetch` to catch `/problems/<slug>/submit/` (your code) and `/submissions/detail/<id>/v2/check/` (the verdict). |
| `content.js`      | Pairs each submit with its verdict. If Accepted, fetches the problem number and title, then hands it to the background.                            |
| `background.js`   | Reads your token and repo, and creates or updates the file through the GitHub API.                                                                 |
| `options.html/js` | The settings page.                                                                                                                                 |

If LeetCode changes its endpoints, update the two regexes at the top of `injected.js`.

## Updating

Download the new version, replace the folder, then click the reload icon on the extension card in `chrome://extensions`. Your settings are kept.
