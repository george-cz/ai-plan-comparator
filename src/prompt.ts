import { readFile } from 'node:fs/promises';
import { CliError } from './errors.js';

export async function resolvePrompt(promptArg: string | undefined, promptFile: string | undefined): Promise<string> {
  if (promptArg && promptArg.trim()) {
    return promptArg.trim();
  }
  if (!promptFile) {
    throw new CliError('Either PROMPT argument or --prompt-file must be provided.', 6);
  }
  try {
    const prompt = await readFile(promptFile, 'utf8');
    if (!prompt.trim()) {
      throw new CliError('Prompt is empty.', 6);
    }
    return prompt.trim();
  } catch {
    throw new CliError(`Prompt file not found: ${promptFile}`, 6);
  }
}
