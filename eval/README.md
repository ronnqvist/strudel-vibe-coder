# Prompt evaluation (offline)

A small harness that compares the **legacy** system prompt (frozen in `prompts/legacy.js`, as it was before the prompt work) with the **current** composed prompt (`src/lib/prompt/`). Each run goes through the app's own request path: `generateStrudelCode` with its stream end states, code extraction, and `preparePattern` (validation and typography repair).

```bash
npm run eval:mock                       # all tasks, both prompts, 3 runs each, canned replies (free, offline)
node --import ./eval/register.mjs eval/run.mjs --provider mock --runs 3 --split heldout --prompt current
node --import ./eval/register.mjs eval/listening.mjs eval/out/<run>/results.json   # blind A/B listening sheet
```

Results go to `eval/out/<timestamp>/` (`results.json`, `report.md`), which is not committed. `npm test` also runs a smoke test of the whole harness (`eval.test.js`).

## Tasks

`tasks/dev.js` (used while working on the prompt) and `tasks/heldout.js` (kept out of prompt work, to see whether a change generalises) hold four kinds of task:

- **draft**: a first pattern from a short description.
- **constraint**: explicit requirements (tempo, drum machine, key, no visuals, echo time, separate orbits, length).
- **revision**: change one thing in an existing pattern. `preserve` lists parts that must come back unchanged.
- **failure**: how the app handles a reply that is interrupted, cut off, refused, failed, uses curly quotes, or breaks a rule.

Each task has regex `checks` on the playable code, and `mock` replies for mock mode.

## Scores

Per run:
- whether the reply ended as expected
- whether its code parses
- whether the app would load it into the player
- whether it needed typography repair
- the share of constraints met, and of required parts preserved
- latency, reply size and system prompt size
- tokens and cost, when the provider reports them

The report shows mean ± standard deviation per prompt, with the dev and held-out tasks separated.

## What this does not tell you

- **Mock mode does not compare the prompts.** Both prompts get the same canned replies, so mock mode tests the harness and the pipeline. Only the system prompt size differs.
- **No score measures musical quality.** A parser, a regex or an LLM judge can't tell whether a pattern sounds good. Use `listening.mjs`: it makes a sheet of strudel.cc links with the two prompts' patterns shown as A and B in random order, with the key in a separate file. Rate them blind.

## Live runs (paid)

Live runs call OpenRouter and cost money. Run one only with the owner's approval of the model, the number of requests and the spend. The live provider refuses to start unless it gets all of these: `--provider openrouter`, `--live`, an `OPENROUTER_API_KEY` environment variable, and `--max-requests <n>`.

```bash
OPENROUTER_API_KEY=... node --import ./eval/register.mjs eval/run.mjs \
  --provider openrouter --live --model <model-id> --max-requests 60 --runs 3 --split dev
```

Add model-specific prompt changes only if live results show a repeatable need.
