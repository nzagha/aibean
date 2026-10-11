export const weights = {
  editorial: 0.2,
  context: 0.25,
  verification: 0.15,
  completeness: 0.1,
  freshness: 0.1,
  reviews: 0.1,
  popularity: 0.05,
  engagement: 0.05,
} as const;
export type RankingInputs = Record<keyof typeof weights, number> & {
  risk: number;
  adjustment: number;
};
export type RankingWeights = Record<keyof typeof weights, number>;
export function calculateToolScore(
  input: RankingInputs,
  configuration: { weights: RankingWeights; version: string } = {
    weights,
    version: "0.1",
  },
) {
  const explanation = Object.entries(configuration.weights).map(
    ([factor, weight]) => ({
      factor,
      contribution:
        Math.max(0, Math.min(100, input[factor as keyof typeof weights])) *
        weight,
    }),
  );
  const score =
    explanation.reduce((n, r) => n + r.contribution, 0) -
    Math.max(0, input.risk) +
    Math.max(-20, Math.min(20, input.adjustment));
  explanation.push(
    { factor: "risk", contribution: -Math.max(0, input.risk) },
    {
      factor: "manual adjustment",
      contribution: Math.max(-20, Math.min(20, input.adjustment)),
    },
  );
  return {
    score: Math.round(score * 100) / 100,
    version: configuration.version,
    explanation,
  };
}
// Claimed/paid/subscription/sponsorship fields are deliberately not accepted by the scorer.
