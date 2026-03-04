import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlanUserPrompt, callModel } from '../src/agents.js';

test('buildPlanUserPrompt formats prompt', () => {
  const prompt = buildPlanUserPrompt('Build app');
  assert.equal(prompt, 'Goal: Build app\n\nPlease produce a complete plan to achieve this goal.');
});

test('callModel returns dry-run output without API call', async () => {
  const response = await callModel({
    model: 'gpt-4o',
    systemPrompt: 'You are helpful.',
    userPrompt: 'Create a plan.',
    temperature: 0.7,
    maxTokens: 4096,
    verbose: false,
    dryRun: true,
  });
  assert.match(response, /## Dry run/);
  assert.match(response, /Model: gpt-4o/);
  assert.match(response, /Create a plan\./);
});
