export type DependencyCheck = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

export type HealthReport = {
  version: string;
  ok: boolean;
  firebase: DependencyCheck;
  llm: DependencyCheck;
  s3: DependencyCheck;
};
