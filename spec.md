# AI Plan Comparator — Specification

## 1. Overview

**ai-plan-comparator** is a command-line tool that benchmarks the plan-generation quality of different AI models. Given a planning prompt from the user, two independent AI agents each produce a plan. Their outputs are persisted as Markdown files, and a third "judge" agent evaluates both plans against a set of criteria, assigns scores, and declares a winner.

### Goals

- Provide a repeatable, automated way to compare AI planning outputs.
- Produce human-readable artefacts (Markdown files) that can be reviewed, committed, or shared.
- Give a concise, reasoned verdict that explains _why_ one plan is better than the other.

### Non-goals (v1)

- A graphical/web UI.
- Comparing more than two agents at once.
- Automated retries on agent failure beyond a single retry.
- Fine-tuning or training of any model.

---

## 2. Architecture & Workflow

```
User
 │
 │  $ ai-plan-comparator "Build a personal finance tracker app"
 │
 ▼
┌─────────────────────────────────────────────────────────────┐
│                        CLI Entry Point                       │
│  • Parses arguments                                          │
│  • Loads configuration                                       │
│  • Orchestrates the workflow                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │  same prompt
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐           ┌─────────────┐
       │   Agent A   │           │   Agent B   │
       │  (model A)  │           │  (model B)  │
       └──────┬──────┘           └──────┬──────┘
              │ plan_a.md               │ plan_b.md
              └────────────┬────────────┘
                           ▼
                  ┌─────────────────┐
                  │   Judge Agent   │
                  │  (judge model)  │
                  └────────┬────────┘
                           │ evaluation.md
                           ▼
                       Terminal output
                       + saved files
```

### Step-by-Step

1. **Parse input** — Read the planning prompt from the CLI argument (or `--prompt-file`).
2. **Spawn Agent A** — Send the prompt to the configured Model A via the appropriate API. Receive the generated plan.
3. **Spawn Agent B** — Send the same prompt to Model B. Receive the generated plan.
4. **Persist plans** — Write each plan to its own Markdown file inside the output directory.
5. **Judge** — Send both plans (along with the original prompt) to the judge agent. Receive a structured evaluation.
6. **Persist evaluation** — Write the judge's output to `evaluation.md` in the output directory.
7. **Report** — Print a summary to stdout (scores + winner). Exit with code `0` on success, non-zero on error.

Agents A and B **run in parallel** to reduce wall-clock time.

---

## 3. CLI Interface

### Usage

```
ai-plan-comparator [OPTIONS] [PROMPT]
```

`PROMPT` is the planning task as a quoted string.  
If omitted, `--prompt-file` must be provided.

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--prompt-file` | `-f` | path | — | Read the prompt from a file instead of an argument |
| `--model-a` | | string | `gpt-4o` | Model identifier for Agent A |
| `--model-b` | | string | `claude-3-5-sonnet-20241022` | Model identifier for Agent B |
| `--judge-model` | | string | `o3` | Model identifier for the Judge agent |
| `--output-dir` | `-o` | path | `./output/<timestamp>` | Directory where Markdown files are saved |
| `--config` | `-c` | path | `~/.ai-plan-comparator.json` | Path to a JSON config file |
| `--temperature` | | float | `0.7` | Sampling temperature for plan-generating agents |
| `--max-tokens` | | int | `4096` | Max tokens for each agent response |
| `--system-prompt` | | string | (built-in) | Override the system prompt sent to plan-generating agents |
| `--judge-system-prompt` | | string | (built-in) | Override the judge's system prompt |
| `--verbose` | `-v` | flag | false | Print raw API responses and timing info |
| `--dry-run` | | flag | false | Print prompts but do not call any APIs |
| `--help` | `-h` | flag | — | Show help text |
| `--version` | | flag | — | Show version |

### Examples

```bash
# Basic comparison using defaults
ai-plan-comparator "Plan a road trip from New York to Los Angeles"

# Custom models
ai-plan-comparator --model-a gpt-4-turbo --model-b gemini-1.5-pro \
  "Launch a developer-tools SaaS product in 90 days"

# Read prompt from file, save output to a specific directory
ai-plan-comparator -f prompt.txt -o ./results/run-1
```

---

## 4. Agent Design

### 4.1 Plan-Generating Agents (A & B)

Both agents receive identical inputs and are otherwise independent.

**System prompt (default):**

```
You are an expert project planner. Given a goal or task, produce a detailed,
actionable plan. Structure your response with clear phases, milestones, and
concrete next steps. Use Markdown formatting (headings, bullet lists, tables
where appropriate). Be thorough but concise.
```

**User message:**

```
Goal: <user prompt>

Please produce a complete plan to achieve this goal.
```

The agent's full response is written verbatim to its output Markdown file, with a small header prepended by the tool:

```markdown
# Plan — <model name>

> **Prompt:** <user prompt>
> **Generated:** <ISO timestamp>
> **Model:** <model name>

---

<agent response>
```

### 4.2 Judge Agent

The judge receives both plans and the original prompt.

**System prompt (default):**

```
You are an impartial AI evaluator. You will be given a planning task and two
candidate plans produced by different AI models. Evaluate each plan according
to the criteria below, assign a numeric score (1–10) for each criterion, and
provide a final recommendation explaining which plan is better overall and why.

Evaluation criteria:
1. Clarity — Is the plan easy to understand and follow?
2. Completeness — Does the plan cover all important aspects of the task?
3. Actionability — Are the steps concrete and immediately actionable?
4. Feasibility — Is the plan realistic given typical constraints?
5. Structure — Is the plan well-organised with logical progression?

For each criterion, score both plans separately. Summarise your evaluation in
Markdown with a structured table, per-criterion commentary, and a final verdict.
```

**User message:**

```
## Planning Task

<user prompt>

---

## Plan A (model: <model-a>)

<contents of plan_a.md>

---

## Plan B (model: <model-b>)

<contents of plan_b.md>

---

Please evaluate both plans according to the criteria and provide your verdict.
```

---

## 5. Output Files & Directory Structure

```
<output-dir>/
├── plan_a.md          # Plan produced by Agent A
├── plan_b.md          # Plan produced by Agent B
└── evaluation.md      # Judge's comparative evaluation
```

### evaluation.md format

The judge's response is written verbatim, with a header prepended:

```markdown
# Evaluation

> **Prompt:** <user prompt>
> **Agent A model:** <model-a>
> **Agent B model:** <model-b>
> **Judge model:** <judge-model>
> **Generated:** <ISO timestamp>

---

<judge response>
```

The expected structure of the judge response (enforced only via the system prompt, not parsed by the tool):

```markdown
## Scores

| Criterion      | Plan A | Plan B |
|----------------|--------|--------|
| Clarity        | X/10   | X/10   |
| Completeness   | X/10   | X/10   |
| Actionability  | X/10   | X/10   |
| Feasibility    | X/10   | X/10   |
| Structure      | X/10   | X/10   |
| **Total**      | **X**  | **X**  |

## Commentary

### Clarity
...

### Completeness
...

### Actionability
...

### Feasibility
...

### Structure
...

## Verdict

**Winner: Plan [A|B]**

<reasoned explanation>
```

---

## 6. Evaluation / Rating Criteria

The judge uses the following five criteria, each scored 1–10:

| Criterion | Description |
|-----------|-------------|
| **Clarity** | The plan is written in plain language, free of unnecessary jargon, with a logical narrative that a reader can follow without prior domain expertise. |
| **Completeness** | The plan addresses all major aspects of the task: who, what, when, how, and potential risks or blockers. Nothing important is omitted. |
| **Actionability** | Steps are specific enough to act on immediately. Vague phrases like "research the topic" are broken down into concrete tasks. |
| **Feasibility** | The plan is realistic: timelines are reasonable, resources are acknowledged, and constraints are considered. |
| **Structure** | The plan is well-organised, with clear phases, milestones, or sections. Headings, lists, and formatting aid navigation. |

The **total score** is the sum of the five criteria (maximum 50). The plan with the higher total wins. In case of a tie, the judge provides a qualitative tiebreaker.

---

## 7. Configuration

### Environment Variables

Authentication is handled by the **GitHub Copilot SDK**, which uses the user's GitHub Copilot subscription. No separate per-vendor API keys are required.

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub personal access token (or set via `gh auth login`); used by the Copilot SDK to authenticate all model calls |

### Config File (`~/.ai-plan-comparator.json`)

All CLI options can be persisted in a JSON config file. CLI flags override config file values.

```json
{
  "model_a": "gpt-4o",
  "model_b": "claude-3-5-sonnet-20241022",
  "judge_model": "o3",
  "temperature": 0.7,
  "max_tokens": 4096,
  "output_dir": "./output"
}
```

### Model Routing

Model selection is passed directly to the Copilot SDK, which routes requests to the appropriate underlying provider. Any model available through GitHub Copilot (e.g., `gpt-4o`, `claude-3.5-sonnet`, `gemini-1.5-pro`, `o3`) can be used by specifying its identifier via the CLI flags.

---

## 8. Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Missing `GITHUB_TOKEN` | Exit with error code `1`; print a human-readable message directing the user to set the token or run `gh auth login`. |
| API rate-limit (429) | Retry once after the `Retry-After` header delay (or 60 s if absent). Fail with code `2` on second failure. |
| API timeout | Default request timeout is 120 s. Fail with code `3` and a descriptive message. |
| Empty agent response | Fail with code `4` and explain which agent returned an empty result. |
| Output directory not writable | Fail with code `5` before calling any APIs. |
| `--prompt-file` not found | Fail with code `6` immediately. |
| Unknown model / provider | Warn and fail with code `7`. |

All error messages are printed to **stderr**. Successful output (the final summary) is printed to **stdout**.

---

## 9. Technology Stack (Proposed)

- **Language:** TypeScript (Node.js ≥ 20)
- **Package manager:** npm / pnpm
- **CLI framework:** `commander` or `yargs`
- **AI SDK:** [GitHub Copilot SDK](https://github.com/github/copilot-api) (`@github/copilot-api`) — used as the primary SDK for all model calls (Agent A, Agent B, and the Judge). The Copilot SDK provides a unified interface across models and handles authentication via the user's GitHub Copilot subscription, removing the need for separate per-vendor API keys.
- **Markdown writing:** plain `fs.writeFile` (no external dependency needed)
- **Parallelism:** `Promise.all` for concurrent agent calls

---

## 10. Future Improvements (Out of Scope for v1)

- Support for more than two agents (N-way comparison).
- Interactive mode: the user can iteratively refine the prompt and re-run comparisons.
- A `--rounds N` flag to run multiple comparisons and average scores.
- HTML report output in addition to Markdown.
- Plugin system for custom judge rubrics.
- Cost tracking (tokens used, estimated API cost per run).
- Local / offline model support (e.g., Ollama).
- Automated regression tests using a golden dataset of prompts.
