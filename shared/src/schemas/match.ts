import { z } from "zod";

export const createGoalSchema = z.object({
  teamId: z.string().min(1),
  scorerId: z.string().min(1),
  assistId: z.string().min(1).optional(),
  ownGoal: z.boolean().optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const matchStateSchema = z.object({
  matchId: z.string(),
  status: z.enum(["LIVE", "PAUSED", "FINISHED"]),
  elapsedSeconds: z.number(),
  startedAt: z.string().datetime(),
  limitSeconds: z.number(),
  serverNow: z.string().datetime(),
  scoreA: z.number(),
  scoreB: z.number(),
});

export type MatchState = z.infer<typeof matchStateSchema>;

export const rotationSchema = z.object({
  kind: z.enum(["WIN", "DRAW", "WIN_LIMIT", "NONE"]),
  swaps: z.array(
    z.object({
      teamId: z.string(),
      withTeamId: z.string(),
      outPlayerIds: z.array(z.string()),
      inPlayerIds: z.array(z.string()),
    }),
  ),
  courtAfter: z.array(z.string()),
  queueAfter: z.array(z.string()),
});

export type Rotation = z.infer<typeof rotationSchema>;

export const summarySchema = z.object({
  totalMatches: z.number(),
  totalGoals: z.number(),
  totalPlaySeconds: z.number(),
  scorers: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      goals: z.number(),
    }),
  ),
  assists: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      assists: z.number(),
    }),
  ),
  matchesPlayed: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      matches: z.number(),
    }),
  ),
  matchList: z.array(
    z.object({
      number: z.number(),
      scoreA: z.number(),
      scoreB: z.number(),
      teamAName: z.string(),
      teamBName: z.string(),
      endReason: z.string(),
    }),
  ),
});

export type Summary = z.infer<typeof summarySchema>;
