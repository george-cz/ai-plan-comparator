import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export interface ConfigFile {
  model_a?: string;
  model_b?: string;
  judge_model?: string;
  temperature?: number;
  max_tokens?: number;
  output_dir?: string;
  system_prompt?: string;
  judge_system_prompt?: string;
}

export function resolveDefaultConfigPath(): string {
  return path.join(os.homedir(), '.ai-plan-comparator.json');
}

export async function loadConfig(pathToConfig: string): Promise<ConfigFile> {
  try {
    const raw = await readFile(pathToConfig, 'utf8');
    return JSON.parse(raw) as ConfigFile;
  } catch {
    return {};
  }
}
