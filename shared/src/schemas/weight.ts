import { z } from "zod";
import { MATCH_MINUTES } from "../constants.js";

export const weightLevelSchema = z.enum(["REGULAR", "GOOD", "STAR"]);
export type WeightLevel = z.infer<typeof weightLevelSchema>;

export const winnerRuleSchema = z.enum(["ALWAYS", "MAX_2_WINS"]);
export type WinnerRule = z.infer<typeof winnerRuleSchema>;

export const updateRoomRulesSchema = z.object({
  matchMinutes: z
    .number()
    .int()
    .min(MATCH_MINUTES.min)
    .max(MATCH_MINUTES.max)
    .optional(),
  winnerRule: winnerRuleSchema.optional(),
  maxStarsPerTeam: z.number().int().min(1).optional(),
});
export type UpdateRoomRulesInput = z.infer<typeof updateRoomRulesSchema>;

export const weightItemSchema = z.object({
  playerId: z.string().min(1),
  level: weightLevelSchema,
});

export const putWeightsSchema = z.object({
  items: z.array(weightItemSchema).min(1),
});
export type PutWeightsInput = z.infer<typeof putWeightsSchema>;
