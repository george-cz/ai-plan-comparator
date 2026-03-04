import { CopilotClient, type CopilotSession, approveAll } from '@github/copilot-sdk';
import { CliError } from './errors.js';

const REQUEST_TIMEOUT_MS = 120_000;

export interface ModelCallOptions {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  verbose: boolean;
  dryRun: boolean;
}

export async function callModel(options: ModelCallOptions): Promise<string> {
  if (options.dryRun) {
    return `## Dry run\n\nModel: ${options.model}\n\nPrompt:\n\n${options.userPrompt}`;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new CliError('Missing GITHUB_TOKEN. Set it or run gh auth login.', 1);
  }

  const client = new CopilotClient({ githubToken: token, useLoggedInUser: false });
  let session: CopilotSession | undefined;

  try {
    await client.start();
    session = await client.createSession({
      model: options.model,
      systemMessage: {
        mode: 'replace',
        content: options.systemPrompt,
      },
      onPermissionRequest: approveAll,
      streaming: false,
    });

    const result = await session.sendAndWait({ prompt: options.userPrompt }, REQUEST_TIMEOUT_MS);
    const content = result?.data.content?.trim() ?? '';
    if (!content) {
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
    const message = (error as Error).message;
    if (/timeout|timed out/i.test(message)) {
      throw new CliError(`Request timeout for model ${options.model} after 120s.`, 3);
    }
    if (/unknown|unsupported|not found|invalid model/i.test(message)) {
      throw new CliError(`Unknown or unsupported model: ${options.model}`, 7);
    }
    throw new CliError(`Unexpected API error for model ${options.model}: ${message}`, 2);
  } finally {
    await session?.destroy().catch(() => undefined);
    await client.stop().catch(() => []);
  }
}

export function buildPlanUserPrompt(goal: string): string {
  return `Goal: ${goal}\n\nPlease produce a complete plan to achieve this goal.`;
}
