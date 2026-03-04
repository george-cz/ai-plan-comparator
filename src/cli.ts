#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import { DEFAULT_JUDGE_SYSTEM_PROMPT, DEFAULT_PLAN_SYSTEM_PROMPT, DEFAULTS } from './defaults.js';
import { CliError } from './errors.js';
import { buildPlanUserPrompt, callModel } from './agents.js';
import { loadConfig, resolveDefaultConfigPath } from './config.js';
import { resolvePrompt } from './prompt.js';
import { createTimestampedOutputDir, ensureWritableDir, extractSummary, formatEvaluationMarkdown, formatPlanMarkdown, writeOutputs } from './output.js';
import { evaluatePlans } from './judge.js';

interface Options {
  promptFile?: string;
  modelA?: string;
  modelB?: string;
  judgeModel?: string;
  outputDir?: string;
  config?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  judgeSystemPrompt?: string;
  verbose?: boolean;
  dryRun?: boolean;
}

async function run(): Promise<void> {
  const program = new Command();
  program
    .name('ai-plan-comparator')
    .argument('[prompt]', 'planning prompt')
    .option('-f, --prompt-file <path>', 'read prompt from file')
    .option('--model-a <model>', 'model identifier for agent A')
    .option('--model-b <model>', 'model identifier for agent B')
    .option('--judge-model <model>', 'judge model identifier')
    .option('-o, --output-dir <path>', 'output directory')
    .option('-c, --config <path>', 'config file path')
    .option('--temperature <number>', 'sampling temperature', Number)
    .option('--max-tokens <number>', 'max output tokens', Number)
    .option('--system-prompt <prompt>', 'override planner system prompt')
    .option('--judge-system-prompt <prompt>', 'override judge system prompt')
    .option('-v, --verbose', 'verbose output', false)
    .option('--dry-run', 'print prompts but do not call APIs', false)
    .version('0.1.0');

  program.parse(process.argv);
  const promptArg = program.args[0] as string | undefined;
  const cli = program.opts<Options>();

  const config = await loadConfig(cli.config ?? resolveDefaultConfigPath());

  const modelA = cli.modelA ?? config.model_a ?? DEFAULTS.modelA;
  const modelB = cli.modelB ?? config.model_b ?? DEFAULTS.modelB;
  const judgeModel = cli.judgeModel ?? config.judge_model ?? DEFAULTS.judgeModel;
  const temperature = cli.temperature ?? config.temperature ?? DEFAULTS.temperature;
  const maxTokens = cli.maxTokens ?? config.max_tokens ?? DEFAULTS.maxTokens;
  const systemPrompt = cli.systemPrompt ?? config.system_prompt ?? DEFAULT_PLAN_SYSTEM_PROMPT;
  const judgeSystemPrompt = cli.judgeSystemPrompt ?? config.judge_system_prompt ?? DEFAULT_JUDGE_SYSTEM_PROMPT;

  const prompt = await resolvePrompt(promptArg, cli.promptFile);
  const outputDir = cli.outputDir
    ? path.resolve(cli.outputDir)
    : createTimestampedOutputDir(path.resolve(config.output_dir ?? './output'));

  await ensureWritableDir(outputDir);

  const planPrompt = buildPlanUserPrompt(prompt);
  const [planARaw, planBRaw] = await Promise.all([
    callModel({
      model: modelA,
      systemPrompt,
      userPrompt: planPrompt,
      temperature,
      maxTokens,
      verbose: Boolean(cli.verbose),
      dryRun: Boolean(cli.dryRun),
    }),
    callModel({
      model: modelB,
      systemPrompt,
      userPrompt: planPrompt,
      temperature,
      maxTokens,
      verbose: Boolean(cli.verbose),
      dryRun: Boolean(cli.dryRun),
    }),
  ]);

  if (!planARaw.trim()) {
    throw new CliError(`Empty response from model: ${modelA}`, 4);
  }
  if (!planBRaw.trim()) {
    throw new CliError(`Empty response from model: ${modelB}`, 4);
  }

  const evaluationRaw = await evaluatePlans({
    prompt,
    planA: planARaw,
    planB: planBRaw,
    modelA,
    modelB,
    judgeModel,
    judgeSystemPrompt,
    temperature,
    maxTokens,
    verbose: Boolean(cli.verbose),
    dryRun: Boolean(cli.dryRun),
  });

  const generated = new Date().toISOString();
  const planA = formatPlanMarkdown(modelA, prompt, generated, planARaw);
  const planB = formatPlanMarkdown(modelB, prompt, generated, planBRaw);
  const evaluation = formatEvaluationMarkdown(prompt, modelA, modelB, judgeModel, generated, evaluationRaw);

  await writeOutputs(outputDir, planA, planB, evaluation);

  const { winner, totals } = extractSummary(evaluationRaw);
  console.log(`Comparison complete.\nOutput directory: ${outputDir}\nTotals: ${totals}\nWinner: ${winner}`);
}

run().catch((error: unknown) => {
  const cliError = error instanceof CliError ? error : new CliError((error as Error).message, 2);
  console.error(cliError.message);
  process.exit(cliError.exitCode);
});
