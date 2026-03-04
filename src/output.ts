import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { CliError } from './errors.js';

export function createTimestampedOutputDir(base = './output'): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(base, stamp);
}

export async function ensureWritableDir(outputDir: string): Promise<void> {
  try {
    await mkdir(outputDir, { recursive: true });
    await access(outputDir, constants.W_OK);
  } catch {
    throw new CliError(`Output directory is not writable: ${outputDir}`, 5);
  }
}

export function formatPlanMarkdown(model: string, prompt: string, generated: string, response: string): string {
  return `# Plan — ${model}\n\n> **Prompt:** ${prompt}\n> **Generated:** ${generated}\n> **Model:** ${model}\n\n---\n\n${response}\n`;
}

export function formatEvaluationMarkdown(prompt: string, modelA: string, modelB: string, judgeModel: string, generated: string, response: string): string {
  return `# Evaluation\n\n> **Prompt:** ${prompt}\n> **Agent A model:** ${modelA}\n> **Agent B model:** ${modelB}\n> **Judge model:** ${judgeModel}\n> **Generated:** ${generated}\n\n---\n\n${response}\n`;
}

export async function writeOutputs(outputDir: string, planA: string, planB: string, evaluation: string): Promise<void> {
  await Promise.all([
    writeFile(path.join(outputDir, 'plan_a.md'), planA, 'utf8'),
    writeFile(path.join(outputDir, 'plan_b.md'), planB, 'utf8'),
    writeFile(path.join(outputDir, 'evaluation.md'), evaluation, 'utf8'),
  ]);
}

export function extractSummary(evaluationResponse: string): { winner: string; totals: string } {
  const winnerMatch = evaluationResponse.match(/\*\*Winner:\s*Plan\s*([AB])\*\*/i);
  const totalMatch = evaluationResponse.match(/\|\s*\*\*Total\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|/i);
  const winner = winnerMatch ? `Plan ${winnerMatch[1].toUpperCase()}` : 'Unknown';
  const totals = totalMatch ? `A=${totalMatch[1]}, B=${totalMatch[2]}` : 'Unavailable';
  return { winner, totals };
}
