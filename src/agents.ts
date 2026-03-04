import { setTimeout as sleep } from 'node:timers/promises';
import { CliError } from './errors.js';

const REQUEST_TIMEOUT_MS = 120_000;
const COPILOT_URL = 'https://api.githubcopilot.com/chat/completions';

interface ModelCallOptions {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  verbose: boolean;
  dryRun: boolean;
}

function getContent(message: unknown): string {
  if (!message || typeof message !== 'object' || !("content" in message)) {
    return '';
  }
  const content = (message as { content: unknown }).content;
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === 'string' ? part : '')).join('\n').trim();
  }
  return '';
}

export async function callModel(options: ModelCallOptions): Promise<string> {
  if (options.dryRun) {
    return `## Dry run\n\nModel: ${options.model}\n\nPrompt:\n\n${options.userPrompt}`;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new CliError('Missing GITHUB_TOKEN. Set it or run gh auth login.', 1);
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(COPILOT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: options.model,
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: options.userPrompt },
          ],
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        }),
        signal: controller.signal,
      });

      if (response.status === 429 && attempt === 0) {
        const retryAfter = Number(response.headers.get('retry-after') ?? '60');
        await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : 60_000);
        continue;
      }

      if (response.status === 429) {
        throw new CliError('Rate-limit hit after retry.', 2);
      }

      if (response.status === 400 || response.status === 404) {
        throw new CliError(`Unknown or unsupported model: ${options.model}`, 7);
      }

      if (!response.ok) {
        throw new CliError(`Model call failed (${response.status}): ${await response.text()}`, 2);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: unknown }>;
      };
      const content = getContent(data.choices?.[0]?.message);
      if (!content.trim()) {
        throw new CliError(`Empty response from model: ${options.model}`, 4);
      }

      if (options.verbose) {
        console.error(`[verbose] ${options.model} response length: ${content.length}`);
      }

      return content;
    } catch (error) {
      if (error instanceof CliError) {
        throw error;
      }
      if ((error as Error).name === 'AbortError') {
        throw new CliError(`Request timeout for model ${options.model} after 120s.`, 3);
      }
      throw new CliError(`Unexpected API error for model ${options.model}: ${(error as Error).message}`, 2);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new CliError('Unexpected request flow.', 2);
}

export function buildPlanUserPrompt(goal: string): string {
  return `Goal: ${goal}\n\nPlease produce a complete plan to achieve this goal.`;
}
