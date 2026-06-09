export const STAGE_IMAGE = "image" as const;
export const STAGE_REASONING = "reasoning" as const;

export type ModelStage = typeof STAGE_IMAGE | typeof STAGE_REASONING;
