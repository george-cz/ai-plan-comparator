import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSummary, formatEvaluationMarkdown, formatPlanMarkdown } from '../src/output.js';

test('formatPlanMarkdown includes required header fields', () => {
  const md = formatPlanMarkdown('gpt-4o', 'Build app', '2026-01-01T00:00:00Z', 'Plan body');
  assert.match(md, /# Plan — gpt-4o/);
  assert.match(md, /> \*\*Prompt:\*\* Build app/);
  assert.match(md, /Plan body/);
});

test('formatEvaluationMarkdown includes required header fields', () => {
  const md = formatEvaluationMarkdown('Build app', 'gpt-4o', 'claude', 'o3', '2026-01-01T00:00:00Z', 'Judge body');
  assert.match(md, /# Evaluation/);
  assert.match(md, /> \*\*Agent A model:\*\* gpt-4o/);
  assert.match(md, /> \*\*Judge model:\*\* o3/);
});

test('extractSummary parses totals and winner', () => {
  const result = extractSummary(`| **Total** | **42** | **38** |\n\n**Winner: Plan A**`);
  assert.equal(result.winner, 'Plan A');
  assert.equal(result.totals, 'A=42, B=38');
});
