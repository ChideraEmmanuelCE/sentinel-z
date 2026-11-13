import { z } from "zod";

export const milestoneRequestSchema = z.object({
  escrowId: z.string().min(1).max(100),
  evidence: z.string().min(20).max(5000),
  criteria: z.array(z.string().min(3).max(300)).min(1).max(12)
});

export const oracleAssessmentSchema = z.object({
  decision: z.enum(["pass", "fail", "needs_human_review"]),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(1200),
  criteria: z.array(z.object({
    criterion: z.string().min(1).max(300),
    passed: z.boolean(),
    evidence: z.string().min(1).max(600)
  })).max(12)
}).strict();

export type MilestoneRequest = z.infer<typeof milestoneRequestSchema>;
export type OracleAssessment = z.infer<typeof oracleAssessmentSchema>;
