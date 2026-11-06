# Independent review, pass 1: upstream only (Strudel Vibe Coder)

This prompt works with any agent that can clone the repository and run its commands: Antigravity for pass 1a, Codex for pass 1b. `REVIEW_WORKFLOW.md` gives the order.

You are an independent reviewer. Review the **current state** of the upstream app before its changes are handed to the downstream app. The downstream (strudel.grok.me) has **not** been updated yet, so it is out of scope for this pass. A second pass (`ANTIGRAVITY_REVIEW_PROMPT.md`) covers both apps after the downstream sync.

This pass matters because the downstream will copy upstream modules almost verbatim, from the source listings in `HANDOFF_GROK_BUILD.md`. Anything wrong here would be carried over. Report what is still wrong or risky now. Do not re-review the closed issues #5–#8, except to report a regression.

## What you are reviewing

- **Repository (MIT):** https://github.com/ronnqvist/strudel-vibe-coder, branch `main`. Record the exact commit you review. The work under review landed in merged PRs #9–#12 and the review-fix PRs after them (#14 and later).
- **Live site:** https://ronnqvist.github.io/strudel-vibe-coder/ (GitHub Pages, deployed from `main` by `.github/workflows/pages.yml`).
- **Read first:** `CLAUDE.md`, `README.md`, `eval/README.md` and `HANDOFF_GROK_BUILD.md`.
- **Out of scope:** strudel.grok.me itself. Do not open its Grok path or review its bundle in this pass.

## Rules

1. **Read-only.** Do not edit, create or delete any file in the repository, except your report file if you are asked to write one. Do not commit, push, open pull requests, comment on or close issues, or change any settings. Temporary scripts go outside the repository. Write your report as a file or in your reply.
2. **No paid calls without approval.** Do not call OpenRouter or any other model API with a real key. Use the mocked tests and `npm run eval:mock`; the eval harness's live mode stays off. If a finding can only be confirmed with a live call, describe the call and mark the finding **unverified**.
3. **Reproduce before you report.** Each finding needs reproduction steps that you actually ran: a failing test, a command and its output, or a browser script and what you saw.
4. **Back every claim with a location.** Give file and line references as permalinks to the commit you reviewed.
5. **Label what you did not verify.** Anything you could not reproduce is labelled **unverified**, with what would verify it.
6. **Licensing:** paraphrase Strudel's AGPL documentation briefly, and never suggest copying Strudel code into the MIT app.

## Commands (Node 22.12+)

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

The tests are hermetic: OpenRouter and strudel.cc are mocked, and every other host is blocked. You may open https://strudel.cc to check that a Strudel example evaluates. Headless checks cannot judge the sound.

## Focus areas

1. **The modules the downstream will copy.** These are the highest priority, because a defect here is ported:
   - `src/lib/openrouter.js` and `src/lib/generation.js`: stream end states.
   - `src/lib/strudelUrl.js`, `src/lib/codeRepair.js` and `src/lib/patternCheck.js`: encoding and repair.
   - `src/lib/revisions.js`, `src/lib/chats.js`, `src/hooks/useRequests.js`, `src/hooks/useChats.js`, `src/lib/chatFile.js` and `src/lib/saveStatus.js`.
   - `src/lib/prompt/` and `src/lib/systemPrompt.js`.
   - `src/App.jsx`: the wiring.

   For each module, look for wrong behaviour, unhandled inputs, and assumptions that would break on another provider. The Grok path may not send `finish_reason` or `[DONE]`.
2. **State, revision and stream handling.**
   - Does only a `completed`, valid reply ever reach the player? Try every ending: `[DONE]` only, `finish_reason` only, both, neither, `length`, `content_filter`, a mid-stream `error`, an abort, and a JSON body.
   - Can a reply, a notice or a "new pattern" mark land in the wrong chat?
   - Do edits, renames, imports and deletions made during generation survive?
   - Are revisions, the selection and "Restore previous" correct?
   - Is the migration from `openrouter_current_code` idempotent and rollback-safe?
   - Does an export and import round trip, in formats 1, 2 and 3, lose data or trust input it shouldn't?
3. **The system prompt against the strudel.cc docs.**
   - Check every API claim in `src/lib/prompt/` against current https://strudel.cc/learn/ pages, and run the examples in the real REPL where you can.
   - Check that the module rules (`select.js`) choose sensible modules for common requests, and that composed prompts are coherent and free of contradictions between the preferences, the custom instructions and the contract.
4. **The handoff document.**
   - Do the source listings in `HANDOFF_GROK_BUILD.md` match the code at the implementation commit it names?
   - Is any module or behaviour that the downstream needs missing from it?
   - Are its migration rules for the `svc.*` keys (`svc.code`, `cutOff`) correct and complete?
   - Are its acceptance tests sufficient?

   Report gaps as findings, with the section of the handoff they concern.
5. **Security and privacy.**
   - API key handling: storage, the "remember" setting, the key in the URL hash, the referer, and logs.
   - The `<meta>` Content-Security-Policy.
   - What reaches the strudel.cc iframe.
   - Data kept in localStorage and in exports.
   - Custom music instructions: their limits, and where they are sent.
6. **Accessibility and mobile UX.**
   - Keyboard paths and focus management.
   - Screen-reader announcements for background replies and errors.
   - Contrast and axe-core results.
   - Phone viewports, the Chat/Stage tabs, and auto-scroll while reading.
7. **Test gaps.** Find behaviour without a test, and tests that pass for the wrong reason, for example mocks that differ from what OpenRouter really sends.
8. **Licensing boundaries.**
   - No `@strudel/embed` and no bundled Strudel code.
   - No large copied passages from the docs.
   - `THIRD_PARTY_NOTICES.md`, the SPDX headers and `npm run licenses` are correct.
9. **Musical-workflow usability.** Is the loop clear: describe, hear, change, edit in Strudel, bring the edit back? Is it clear that switching chats stops the music? Don't judge musical quality without listening, and if you do listen, say how.

## Output format

Start with:
- the commit and URL reviewed
- the tools and browser you used
- the commands you ran, each with pass or fail

Then list the findings, highest priority first. Use this shape for each, so it can be pasted into a GitHub issue:

```markdown
### [P1|P2|P3] <short title>

- **Area:** state / prompt / handoff / security / accessibility / tests / licensing / workflow
- **Where:** <permalink(s) with line numbers>
- **Ported downstream?** yes (module named in HANDOFF_GROK_BUILD.md section …) / no
- **Status:** reproduced | unverified (what would verify it)
- **What happens:** <one paragraph>
- **Steps to reproduce:** <numbered, exact commands or clicks>
- **Expected:** <what should happen, with the doc link for Strudel facts>
- **Suggested fix:** <smallest change that would fix it>
- **Acceptance:** <the test that should fail now and pass after the fix>
```

Priorities:
- **P1:** data loss, a wrong pattern reaching the player, key exposure, a licence violation, or a defect in a module the handoff ports.
- **P2:** wrong Strudel facts, missing error handling, accessibility blockers, or a gap in the handoff.
- **P3:** polish and test gaps.

End with two lists: the things you checked that were fine, and anything the downstream pass should look at specifically.
