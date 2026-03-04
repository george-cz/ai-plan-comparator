import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolvePrompt } from '../src/prompt.js';
import { CliError } from '../src/errors.js';

test('resolvePrompt prefers prompt argument', async () => {
  const prompt = await resolvePrompt('  Hello  ', undefined);
  assert.equal(prompt, 'Hello');
});

test('resolvePrompt reads prompt file', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'apc-'));
  const file = path.join(dir, 'prompt.txt');
  await writeFile(file, '  Prompt from file  ', 'utf8');
  const prompt = await resolvePrompt(undefined, file);
  assert.equal(prompt, 'Prompt from file');
});

test('resolvePrompt throws CliError when file missing', async () => {
  await assert.rejects(
    () => resolvePrompt(undefined, '/definitely/missing/prompt.txt'),
    (error: unknown) => error instanceof CliError && error.exitCode === 6,
  );
});
