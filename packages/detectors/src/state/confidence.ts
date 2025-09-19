export interface ConfidenceInputs {
  hasTitle: boolean;
  hasRate: boolean;
  hasLocationOrRemote: boolean;
  stackCount: number;
  descriptionLength: number;
  hasContract: boolean;
}

export function computeConfidence(params: ConfidenceInputs): number {
  let score = 0.25;
  if (params.hasTitle) score += 0.2;
  if (params.hasRate) score += 0.15;
  if (params.hasLocationOrRemote) score += 0.15;
  if (params.stackCount >= 2) score += 0.1;
  else if (params.stackCount === 1) score += 0.05;
  if (params.descriptionLength >= 180) score += 0.1;
  else if (params.descriptionLength >= 60) score += 0.05;
  if (params.hasContract) score += 0.05;
  return Math.min(1, Math.max(0, score));
}
