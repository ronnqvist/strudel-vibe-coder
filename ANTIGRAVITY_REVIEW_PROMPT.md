# Independent review, pass 2: Strudel Vibe Coder (upstream) and strudel.grok.me (downstream)

Run this pass after strudel.grok.me has been updated from `HANDOFF_GROK_BUILD.md`. Pass 1, `ANTIGRAVITY_REVIEW_PROMPT_UPSTREAM.md`, reviews upstream alone before the handoff. If its reports exist (pass 1a, and pass 1b if that was run; see `REVIEW_WORKFLOW.md`), read them first and check whether its findings were fixed, both upstream and in the downstream port.

You are an independent reviewer. Review the **finished state** of two related apps after a round of reliability and prompt work. Report what is still wrong or risky now; do not re-review issues that are already closed. Your output will be filed as GitHub issues, so every finding must stand on its own.

## What you are reviewing

- **Upstream (MIT, open source):** https://github.com/ronnqvist/strudel-vibe-coder. Review `main`; the work under review landed in merged PRs #9–#12, plus any fixes made after pass 1. Record the exact commit you reviewed.
- **Upstream live site:** https://ronnqvist.github.io/strudel-vibe-coder/ (GitHub Pages, deployed by `.github/workflows/pages.yml`).
- **Downstream:** https://strudel.grok.me/ is a separate codebase built in Grok Build, synced from upstream using `HANDOFF_GROK_BUILD.md`. Its server code is not public. Review only what the deployed client shows, and say so.
- **Background:** read `CLAUDE.md`, `README.md` and `HANDOFF_GROK_BUILD.md` in the upstream repository first. Closed issues #5, #6, #7 and #8 describe what was already fixed.

## Rules

1. **Read-only.** Do not push, open pull requests, comment on or close issues, or change any settings. Write your report as a file or in your reply.
2. **No paid calls without approval.**
   - Do not call OpenRouter, xAI or any other model API with a real key.
   - Do not use the Grok path of strudel.grok.me in a way that spends its quota.
   - The upstream tests and the evaluation harness run fully mocked; use those.
   - If a finding can only be confirmed with a live call, describe the call and mark the finding **unverified**.
3. **Reproduce before you report.** Each finding needs reproduction steps that you actually ran: a failing test, a command and its output, or a browser script with what you saw.
4. **Back every claim with a location.** Give file and line references, as a permalink to the commit you reviewed, or a URL plus the bundle file name for the downstream.
5. **Label what you did not verify.** Anything you could not reproduce is labelled **unverified**, with what would verify it. Do not present guesses as findings.
6. **Licensing:** quote Strudel's AGPL documentation only briefly and in your own words, and never suggest copying Strudel code into the MIT app.

## Commands (upstream, Node 22.12+)

```bash
npm ci
npm run lint
npm test
npm run build
npm run licenses
npx playwright install chromium   # or set PW_CHROMIUM_PATH to an installed Chromium
npm run test:e2e
npm run eval:mock
```

The tests are hermetic: OpenRouter and strudel.cc are mocked, and every other host is blocked. You may open https://strudel.cc yourself to check that a Strudel example evaluates. Headless checks cannot judge the sound.

## Focus areas

1. **State, revision and stream handling.**
   - Does only a `completed`, valid reply ever reach the player? Try every stream ending: `[DONE]` alone, `finish_reason` alone, both, neither, `length`, `content_filter`, a mid-stream `error`, an abort, and a JSON body.
   - Can a reply, a notice or a "new pattern" mark end up in the wrong chat?
   - Do edits, renames, imports and deletions made during generation survive?
   - Are revisions, the selection and "Restore previous" correct?
   - Is the migration from `openrouter_current_code` idempotent and rollback-safe?
   - Does the export and import cycle (formats 1, 2 and 3) lose or trust anything it shouldn't?
   - Downstream: the same questions, plus the `svc.*` key migration.
2. **Accuracy of the system prompt against strudel.cc docs.**
   - Check every API claim in `src/lib/prompt/` against current https://strudel.cc/learn/ pages.
   - Check that the module-selection rules (`select.js`) send the right modules, and that the composed prompt for common requests is coherent and not contradictory.
   - Is the request context (the pattern on stage) used correctly?
3. **Security and privacy.**
   - API key handling: storage, "remember", the key in the URL hash, the referer, and the logs.
   - The Content-Security-Policy, both upstream (`<meta>`) and downstream (HTTP header, `'unsafe-inline'`).
   - What reaches the strudel.cc iframe.
   - Data in localStorage and in exports.
   - The custom music instructions: limits, and where they are sent.
   - Downstream: what the `/api/grok-stream` request exposes.
4. **Accessibility and mobile UX.**
   - Keyboard paths: dialogs, the iframe kept out of the Tab order, "Open in Strudel".
   - Screen-reader announcements for background replies and errors.
   - Contrast, axe-core results, and focus management.
   - Phone viewports: the Chat/Stage tabs, and auto-scroll while reading.
5. **Test gaps.** Name behaviour that has no test, or tests that pass for the wrong reason (for example, mocks that do not match what OpenRouter actually sends).
6. **Licensing boundaries.** The MIT app must use AGPL Strudel only through the strudel.cc iframe:
   - no `@strudel/embed`
   - no bundled Strudel code
   - no large copied documentation text
   - `THIRD_PARTY_NOTICES.md`, the SPDX headers and `npm run licenses` all correct
7. **Musical-workflow usability.**
   - Is the loop from describing a sound, to hearing it, to changing it, to editing it in Strudel and bringing the edit back clear?
   - Is the behaviour where switching chats stops the music understandable?
   - Are "Use this version", "Restore previous", "Use edited code" and "Fix an error" discoverable?
   - Do not claim that the music is better or worse without listening, and say how you listened.

## Output format

Start with:
- the commits and URLs reviewed
- the tools and browsers used
- the commands run, with pass or fail results

Then list the findings, highest priority first. Use this shape for each one, so it can be pasted into a GitHub issue:

```markdown
### [P1|P2|P3] <short title>

- **Area:** state / prompt / security / accessibility / tests / licensing / workflow
- **Where:** <permalink(s) with line numbers, or URL + bundle file>
- **Status:** reproduced | unverified (what would verify it)
- **What happens:** <one paragraph>
- **Steps to reproduce:** <numbered, exact commands or clicks>
- **Expected:** <what should happen, with the doc link for Strudel facts>
- **Suggested fix:** <smallest change that would fix it>
- **Acceptance:** <the test that should fail now and pass after the fix>
```

Priorities:
- **P1:** data loss, a wrong pattern reaching the player, key exposure, or a licence violation.
- **P2:** wrong Strudel facts, missing error handling, or accessibility blockers.
- **P3:** polish and test gaps.

End with a short list of the things you checked that were fine, so they are not rechecked next time.
