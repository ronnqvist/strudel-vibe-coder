# Review workflow

Independent reviews by other agents, and where each fits before and after a downstream sync to
strudel.grok.me. Every review is read-only, makes no paid model calls without the owner's
approval, and reproduces each finding with a file and line reference. Claude Code then triages
the findings and fixes the confirmed ones, with a failing test first.

## Order

1. **Pass 1a, upstream (Antigravity):** give it `ANTIGRAVITY_REVIEW_PROMPT_UPSTREAM.md`.
   Done for `main` at `9f11074`. Its 13 findings were fixed in the follow-up PR.
2. **Pass 1b, upstream (Codex, for example with GPT-6.1 Sol):** run it after those fixes are
   merged, with the same prompt (see below).
   - Run it **without** the pass 1a report, so it is independent and isn't steered by the first
     reviewer.
   - Bring both reports to Claude Code. It removes duplicates, confirms what reproduces, and fixes
     what is still open.
   - Done for `main` at `5a5b269`. Its 6 findings (G1–G6) were fixed in the follow-up PR.
3. **Optional fact check of the prompt (Perplexity):** see below. It is cheap with a subscription.
   It checks only the Strudel facts, not the code, because it cannot run the tests.
4. **Regenerate `HANDOFF_GROK_BUILD.md`** from the fixed commit, and give it to Grok Build.
5. **Pass 2, both apps (Antigravity):** give it `ANTIGRAVITY_REVIEW_PROMPT.md` and the pass 1
   reports, after strudel.grok.me has been updated.

Pass 1b goes before the handoff for the same reason as pass 1a: the downstream copies upstream
modules almost verbatim, so a defect is cheapest to fix before it has been ported.

Run every review in a **fresh clone** of the repository, never in a folder another agent has
used: pass 1a left uncommitted edits in its folder, which would have been mixed into the next
review and shown it the first reviewer's work.

## Pass 1b with Codex

Open the repository in Codex, check out `main`, and use this as the task. Paste the text of
`ANTIGRAVITY_REVIEW_PROMPT_UPSTREAM.md` where it says so.

```text
You are a second, independent reviewer. Another reviewer already looked at this repository, and
its findings have been fixed; you are not given its report. Review the current state of `main`
(record the commit) as instructed below. Run the commands it lists. Write your findings to a file
named review-pass1b.md in the repository root and do not commit it. Never use a real API key or
make live model calls. If something can only be confirmed that way, mark it unverified.

<paste ANTIGRAVITY_REVIEW_PROMPT_UPSTREAM.md here>
```

Cost: one read-only review, with the tests run locally, is a single session. Set a spending
limit on the API key you use for Codex.

## Optional: Strudel fact check with Perplexity

Perplexity can read public pages but cannot run the code, so use it only for the prompt's
Strudel facts. Paste this:

```text
Check every Strudel API claim in these two files against the current documentation at
https://strudel.cc/learn/ (effects, synths, samples, tonal, signals, mini-notation, factories,
time-modifiers, conditional-modifiers, accumulation, hydra):

https://raw.githubusercontent.com/ronnqvist/strudel-vibe-coder/main/src/lib/prompt/core.js
https://raw.githubusercontent.com/ronnqvist/strudel-vibe-coder/main/src/lib/prompt/modules.js

For each claim that is wrong, misleading or not documented, give: the line, what the file says,
what the docs say (paraphrased, with the URL), and a corrected wording. Also list any code
example whose result would differ from what the text says (for example a transposition that
does not change the pitch). Do not list claims that are correct. Say which pages you could not
open.
```

Claude Code checks each reported claim in the real strudel.cc REPL before changing the prompt.
