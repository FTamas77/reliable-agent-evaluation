export type ExecutionState = "SUCCESS" | "ERROR" | "INCOMPLETE" | "SKIPPED";
export type Score = "PASS" | "PARTIAL" | "FAIL";

export interface Scenario {
  id: string;
  title: string;
  category: string;
  rule_ids: string[];
  source_ids: string[];
  user_turns: string[];
  expected_behaviour: string[];
  critical_failures: string[];
}

export interface Link {
  text: string;
  href: string;
}

export interface TurnRecord {
  turn: number;
  user: string;
  agent: string | null;
  links: Link[];
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  warnings: string[];
}

export interface Attempt {
  attempt: number;
  state: ExecutionState;
  started_at: string;
  duration_ms: number;
  session_id_hash: string | null;
  turns: TurnRecord[];
  error: string | null;
  screenshot: string | null;
}

export interface EvaluationStub {
  correctness: "PENDING_REVIEW";
  note: string;
  expected_behaviour: string[];
  critical_failures: string[];
  baseline_score: Score | null;
  manual_v1_score: Score | null;
}

/** One file per scenario; `turns` come from the last attempt, all attempts stay listed. */
export interface ScenarioResult {
  schema_version: "1.0.0";
  test_id: string;
  title: string;
  run_id: string;
  agent_config_label: string;
  execution_state: ExecutionState;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  isolation: { fresh_session_verified: boolean; session_id_hash: string | null };
  turns: TurnRecord[];
  error: string | null;
  attempts: Attempt[];
  evaluation: EvaluationStub;
}

export interface RunSummary {
  schema_version: "1.0.0";
  run_id: string;
  agent_config_label: string;
  suite: string;
  started_at: string;
  finished_at: string;
  total_duration_ms: number;
  environment: { node: string; playwright_core: string; browser: string; locale: string; browser_default_language: string | null };
  agent_preview_url_hash: string;
  planned: string[];
  counts: Record<ExecutionState, number>;
  results: { test_id: string; execution_state: ExecutionState; duration_ms: number; file: string }[];
  notes: string[];
}

export interface Review {
  test_id: string;
  score: Score | "UNCERTAIN";
  reviewer: string;
  reviewer_kind: "HUMAN" | "AI_ASSISTED";
  reviewed_on: string;
  justification: string;
  criteria_notes?: string;
  needs_human_review?: boolean;
  /** The project author manually reviewed and confirmed this previously AI-assisted score. */
  author_confirmed?: boolean;
  author_reviewed_on?: string;
  /** Second-pass reviews keep the first-pass score separately; the original review file stays untouched. */
  original_score?: Score | "UNCERTAIN";
  second_pass?: "UPHELD" | "REVISED";
}
