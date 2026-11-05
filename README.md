# Strudel Vibe Coder

Describe music in plain language and get live-coded [Strudel](https://strudel.cc/) patterns, with comments that show you how to tweak them and, if you like, Hydra visuals. The pattern opens in the Strudel player next to the chat, where you can play it, edit it and ask for changes.

- **Live:** https://ronnqvist.github.io/strudel-vibe-coder/
- **Grok edition:** https://strudel.grok.me/ is a separate app built on this idea, using a Grok subscription (with OpenRouter as an option). It has its own codebase.

## How it works

1. You bring your own [OpenRouter](https://openrouter.ai/) API key and pick a model. Everything runs in your browser; there is no server of ours.
2. You describe a sound ("acid techno bass"). The reply is streamed into the chat, and you can stop it at any time (button or Esc).
3. When the reply is complete and its code is valid JavaScript, the code is loaded into the player, which is strudel.cc shown in an iframe. Press play there. A reply that was cut off, interrupted, refused or failed is marked in the chat and does not replace the pattern that is playing.
4. Each chat has its own pattern. Switching chats shows that chat's pattern (and stops the music that was playing), and a reply that finishes in another chat stays in that chat. **Use this version** puts an earlier reply back in the player, and **Restore previous** undoes the last change.
5. Your next message asks the model to change the pattern that is in the player. Edits you make in the Strudel editor are not sent back to this app (it cannot read the player, by design). To continue from them, copy the code from the player and use **Use edited code**. **Fix an error** sends an error message from the player to the model.

**Settings > Music** sets whether the model adds Hydra visuals (by default only when you ask, or when the pattern already has them) and how much it explains. Under **Advanced** you can add your own music instructions; they are added to the app's instructions and do not switch off its checks.

The system prompt is put together for each request from a short output contract, the core Strudel guidance, and only the topic sections the request needs (synthesis, samples, harmony, arrangement, Hydra), picked by simple word rules. Its version is stored with each reply.

The code reaches the player exactly as it is shown in the chat. Only when a reply's code does not parse because the model used typographic quotes or dashes as JavaScript punctuation, the app straightens them, checks that the result parses, and says so.

The default model is `~x-ai/grok-latest`. The suggested models (`~anthropic/claude-opus-latest`, `~openai/gpt-sol-latest`, `~deepseek/deepseek-flash-latest`) are OpenRouter aliases that always point at the newest version of a family. Settings has a searchable list of every OpenRouter model, and you can type any model id.

## Your key and your data

- Your API key and chats stay in your browser's localStorage and go nowhere else. The key is sent only to `openrouter.ai`; chat text goes to OpenRouter and the model provider you chose.
- **Remember key on this device** (settings, on by default) can be turned off: the key then lives in memory for that tab only. **Forget key** removes it everywhere.
- **Temporary key in the address:** open `https://ronnqvist.github.io/strudel-vibe-coder/#sk-or-v1-YOUR-KEY`. The key is used for that visit only, is never stored, and is removed from the address bar immediately. Treat such a link like a password: anyone who has it can spend your credits, and it stays in whatever you used to share it (chat history, bookmarks, the history of the browser you first opened it in). Use a key with a spending limit.
- The player is `strudel.cc`. The code is in the URL fragment, which browsers do not send to servers, but strudel.cc's own page then runs it and loads sounds and Hydra from its own hosts.
- Chats can be exported and imported as JSON files (versioned; files from older versions still import). Browsers allow a few MB of localStorage in total, so export large chats instead of keeping everything. If saving fails, the app says so and offers an export.

## Development

Needs Node 22.12+ (as in CI). `CLAUDE.md` summarises the architecture, the licensing rules, the storage keys and the migration rules.

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run test:e2e   # end-to-end tests (Playwright) against the production build
npm run lint
npm run build      # production build into dist/
npm run licenses   # licences of every package that ends up in the bundle
```

The end-to-end tests need a browser: run `npx playwright install chromium` once (or set `PW_CHROMIUM_PATH` to an installed Chromium). They are hermetic: OpenRouter and strudel.cc are mocked, and every other host is blocked.

Layout: `src/components` (UI), `src/hooks` (state), `src/lib` (OpenRouter client, streaming, URL encoding for strudel.cc, chat files), `src/lib/prompt` (the system prompt and its modules), `src/config.js` (default models, URLs, starter prompts), `scripts/` (Content-Security-Policy and licence check), `e2e/` (Playwright).

The production build includes a strict Content-Security-Policy (`scripts/csp.js`). It allows only the app itself, `openrouter.ai` for requests and `strudel.cc` for the player. A `<meta>` policy cannot stop other sites from embedding the app (`frame-ancestors`); that needs HTTP headers, which GitHub Pages does not offer.

### Deployment

`.github/workflows/pages.yml` runs the checks on every change and publishes `main` to GitHub Pages (repository setting: Settings > Pages > Source = GitHub Actions). Build output is not committed.

## License

MIT, Copyright (c) 2025-2026 Simon Rönnqvist, from version 1.0.0 onwards. See [LICENSE](LICENSE).

Versions up to the tag `agpl-final` were published under AGPL-3.0-only (as declared in `package.json`); the LICENSE file in those versions contained a non-standard AGPL text.

[Strudel](https://strudel.cc/) is a separate project, licensed under AGPL-3.0 by the Strudel/TidalCycles community ([source](https://codeberg.org/uzu/strudel)). This app opens strudel.cc in an iframe; it does not distribute Strudel's code. Third-party software in the build is listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Credits

- [Strudel](https://strudel.cc/) and [TidalCycles](https://tidalcycles.org/) for the music engine and the pattern language, and [Hydra](https://hydra.ojack.xyz/) for the visuals.
- [OpenRouter](https://openrouter.ai/) for access to many models through one API.
- React, Vite, Tailwind CSS and Lucide icons (see the notices file).
