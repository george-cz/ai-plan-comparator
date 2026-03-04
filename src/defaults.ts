export const DEFAULTS = {
  modelA: 'gpt-4o',
  modelB: 'claude-3-5-sonnet-20241022',
  judgeModel: 'o3',
  temperature: 0.7,
  maxTokens: 4096,
} as const;

export const DEFAULT_PLAN_SYSTEM_PROMPT = `You are an expert project planner. Given a goal or task, produce a detailed,
actionable plan. Structure your response with clear phases, milestones, and
concrete next steps. Use Markdown formatting (headings, bullet lists, tables
where appropriate). Be thorough but concise.`;

export const DEFAULT_JUDGE_SYSTEM_PROMPT = `You are an impartial AI evaluator. You will be given a planning task and two
candidate plans produced by different AI models. Evaluate each plan according
to the criteria below, assign a numeric score (1–10) for each criterion, and
provide a final recommendation explaining which plan is better overall and why.

Evaluation criteria:
1. Clarity — Is the plan easy to understand and follow?
2. Completeness — Does the plan cover all important aspects of the task?
3. Actionability — Are the steps concrete and immediately actionable?
4. Feasibility — Is the plan realistic given typical constraints?
5. Structure — Is the plan well-organised with logical progression?

For each criterion, score both plans separately. Summarise your evaluation in
Markdown with a structured table, per-criterion commentary, and a final verdict.`;
