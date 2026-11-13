import { oracleAssessmentSchema, type MilestoneRequest, type OracleAssessment } from "./schema";

/**
 * Safe local fallback for the hackathon UI. It does not fetch arbitrary URLs
 * and does not call a model until a provider adapter is deliberately configured.
 */
export async function assessMilestone(input: MilestoneRequest): Promise<OracleAssessment> {
  const criteria = input.criteria.map((criterion) => ({
    criterion,
    passed: false,
    evidence: "No independent evidence connector is configured. Human review is required."
  }));

  return oracleAssessmentSchema.parse({
    decision: "needs_human_review",
    confidence: 0.15,
    summary: "The evidence was received, but this environment has no configured evidence verifier. Do not release funds based on this assessment.",
    criteria
  });
}
