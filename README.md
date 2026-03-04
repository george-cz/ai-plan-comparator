# ai-plan-comparator

`ai-plan-comparator` is a TypeScript CLI that compares two AI-generated plans for the same goal and uses a judge model to score both plans and pick a winner.

It writes three Markdown artifacts per run:
- `plan_a.md`
- `plan_b.md`
- `evaluation.md`

## Requirements

- Node.js 20+ (recommended)
- A `GITHUB_TOKEN` environment variable for live model calls

## Install

```bash
npm install
npm run build
```

## Quick start

```bash
export GITHUB_TOKEN=YOUR_TOKEN
npm start -- "Plan a 30-day Python learning roadmap"
```

Example output:

```text
Comparison complete.
Output directory: /.../output/2026-01-01T00-00-00-000Z
Totals: A=41, B=38
Winner: Plan A
```

## CLI usage

```text
ai-plan-comparator [OPTIONS] [PROMPT]
```

Provide a prompt either:
- as positional `PROMPT`, or
- with `--prompt-file <path>`

### Options

- `-f, --prompt-file <path>`: read prompt from file
- `--model-a <model>`: model for Agent A (default: `gpt-4o`)
- `--model-b <model>`: model for Agent B (default: `claude-3-5-sonnet-20241022`)
- `--judge-model <model>`: judge model (default: `o3`)
- `-o, --output-dir <path>`: output directory (default: timestamped directory under `./output`)
- `-c, --config <path>`: config file path (default: `~/.ai-plan-comparator.json`)
- `--temperature <number>`: sampling temperature (default: `0.7`)
- `--max-tokens <number>`: max output tokens (default: `4096`)
- `--system-prompt <prompt>`: override planner system prompt
- `--judge-system-prompt <prompt>`: override judge system prompt
- `-v, --verbose`: verbose output
- `--dry-run`: print prompts instead of calling APIs
- `-h, --help`: help
- `--version`: version

## Configuration file

By default, config is loaded from:

```text
~/.ai-plan-comparator.json
```

Config keys (snake_case):

```json
{
  "model_a": "gpt-4o",
  "model_b": "claude-3-5-sonnet-20241022",
  "judge_model": "o3",
  "temperature": 0.7,
  "max_tokens": 4096,
  "output_dir": "./output",
  "system_prompt": "Custom planner prompt",
  "judge_system_prompt": "Custom judge prompt"
}
```

CLI options take precedence over config values.

## Dry-run mode

Use dry-run to validate prompt wiring and output file generation flow without API calls:

```bash
npm start -- --dry-run "Plan a weekend city break in Prague"
```

## Output files

Each run writes:
- `plan_a.md`: formatted output from model A
- `plan_b.md`: formatted output from model B
- `evaluation.md`: judge response plus metadata

## Development

```bash
npm test
npm run build
```

## Detailed specification

For architecture and behavior details, see:
- [`spec.md`](./spec.md)
