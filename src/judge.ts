import { callModel } from './agents.js';

interface JudgeParams {
  prompt: string;
  planA: string;
  planB: string;
  modelA: string;
  modelB: string;
  judgeModel: string;
  judgeSystemPrompt: string;
  temperature: number;
  maxTokens: number;
  verbose: boolean;
  dryRun: boolean;
}

export function buildJudgeUserPrompt(prompt: string, planA: string, planB: string, modelA: string, modelB: string): string {
  return `## Planning Task\n\n${prompt}\n\n---\n\n## Plan A (model: ${modelA})\n\n${planA}\n\n---\n\n## Plan B (model: ${modelB})\n\n${planB}\n\n---\n\nPlease evaluate both plans according to the criteria and provide your verdict.`;
}

export async function evaluatePlans(params: JudgeParams): Promise<string> {
  return callModel({
    model: params.judgeModel,
    systemPrompt: params.judgeSystemPrompt,
    userPrompt: buildJudgeUserPrompt(params.prompt, params.planA, params.planB, params.modelA, params.modelB),
    temperature: params.temperature,
    maxTokens: params.maxTokens,
    verbose: params.verbose,
    dryRun: params.dryRun,
  });
}
