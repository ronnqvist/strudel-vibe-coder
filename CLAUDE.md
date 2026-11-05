# CLAUDE.md

Strudel Vibe Coder: a browser-only React app. The user describes music, an OpenRouter model
writes a Strudel pattern, and the pattern plays in strudel.cc shown in an iframe. There is no
server of ours. Deployed to GitHub Pages by `.github/workflows/pages.yml` (Node 22).

## Licensing rules (do not break)

- The app is **MIT**. Strudel is a separate **AGPL-3.0** project, used only by opening
  `https://strudel.cc/#<base64>` in a cross-origin iframe (`src/components/StrudelFrame.jsx`).
- Never add `@strudel/embed` or any Strudel package, never bundle or copy Strudel engine code,
  never copy large parts of Strudel's documentation (write facts in your own words), and never
  read or script the iframe's contents. CI fails the build if `strudel-repl` or `@strudel/embed`
  appears in `dist/`.
- Keep the SPDX header on every source file, `THIRD_PARTY_NOTICES.md`, the licensing history in
  the README, and `npm run licenses` passing.

## Commands (run all of them after a change; stop at the first failure)

```bash
npm ci
npm run lint
npm test            # Vitest (needs Node 22.12+)
npm run build
npm run licenses    # licences of everything in the bundle
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome npm run test:e2e
```

The e2e tests build the app and serve it at `http://localhost:4173/strudel-vibe-coder/`. In a
sandbox with a preinstalled Chromium, set `PW_CHROMIUM_PATH` to it (find it with
`ls -d /opt/pw-browsers/chromium*/chrome-linux*/chrome`); otherwise run
`npx playwright install chromium`. They are hermetic: OpenRouter and strudel.cc are mocked
(`e2e/helpers.js`) and every other host is blocked.

Tests use mocked providers only. Never make paid model calls, never commit keys or secrets.

## Layout

- `src/lib/openrouter.js`: request and streaming. Returns `{ status, ... }` with status
  `completed | interrupted | truncated | aborted | refused | error`; never throws after the request.
- `src/lib/generation.js`: what each status means (only `completed` auto-loads), the stored reply
  message, the API conversation (failed replies left out), the current-pattern context.
- `src/lib/patternCheck.js` (`preparePattern`) + `src/lib/codeRepair.js`: validate with acorn,
  repair typography only if needed and only if the repair parses. The returned string is exactly
  what is stored and played.
- `src/lib/strudelUrl.js`: lossless UTF-8 → base64 encoding for the strudel.cc URL fragment.
- `src/lib/revisions.js`: per-chat pattern revisions and selection (pure functions).
- `src/lib/chats.js`, `src/lib/chatFile.js`: chat state helpers, startup migration, export/import.
- `src/hooks/useChats.js` (state + persistence), `useRequests.js` (one request per chat, own
  AbortController), `useSettings.js`, `useModelCatalog.js`.
- `src/lib/prompt/`: the system prompt, composed per request: `contract.js` → `core.js` →
  modules (`modules.js`, chosen by the rules in `select.js`, never by a model call) →
  `preferences.js` → the user's own instructions. `request.js` attaches the pattern on stage to
  the newest message and trims old code from long chats. Bump `PROMPT_VERSION` (and the hash in
  `prompt.test.js`) on any text change. Every API fact must match strudel.cc/learn; check new
  examples in the real REPL. `src/lib/systemPrompt.js` is the full prompt, used by the tests.
- `scripts/csp.js`: the Content-Security-Policy for the build.

## State rules

- Write chat state only through `updateChatWith(id, fn)` after any `await`, so that edits,
  renames and other chats' changes made meanwhile are never overwritten.
- The stage shows the selected revision of the chat being viewed. A reply changes only the chat
  that asked for it.

## localStorage keys and migrations

| Key | Content |
|---|---|
| `openrouter_chats` | JSON array of chats (messages, `revisions`, `selectedRevisionId`, `previousRevisionId`) |
| `openrouter_current_chat_id` | id of the chat being viewed |
| `openrouter_current_code` | mirror of the viewed chat's stage pattern (read by earlier versions) |
| `openrouter_api_key`, `openrouter_remember_key` | key (only while "remember" is on) and that setting |
| `openrouter_model`, `openrouter_saved_models` | selected model and bookmarks |
| `openrouter_prompt_prefs` | `{ visuals, explanation }`: `auto`, `always` or `never`; `none`, `brief` or `teaching` |
| `openrouter_custom_instructions` | the user's own music instructions (max 2,000 characters) |

Migration rules:

- Never rename or remove a key. Never change what an existing field means.
- New fields are optional and additive. Older versions must still load the data (rollback).
- Migrations run at startup, are idempotent, and remove nothing. Example:
  `openrouter_current_code` becomes the current chat's selected revision when it differs from it.
- Keep writing the fields older versions read (`stopped`, `truncated`, `openrouter_current_code`).
- Export files are versioned (`CHAT_FILE_VERSION`). Every older format must keep importing, and
  import must clean every field (never trust a file).

## What cannot be verified here

Real audio playback, anything inside the cross-origin strudel.cc iframe beyond its URL, and real
provider streaming behaviour (only mocks run in tests).
