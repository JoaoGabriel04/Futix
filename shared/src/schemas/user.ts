import { z } from "zod";

export const updateMeSchema = z.object({
  name: z.string().min(1).max(100),
  nickname: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  preferredPosition: z.string().max(50).optional(),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
