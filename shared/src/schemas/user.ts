import { z } from "zod";

const PHONE_BR_REGEX = /^\(\d{2}\) \d{4,5}-\d{4}$/;

export const updateMeSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(80),
  nickname: z.string().trim().max(30).optional(),
  phone: z
    .string()
    .regex(PHONE_BR_REGEX, "Formato inválido. Use (XX) XXXXX-XXXX")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  preferredPosition: z
    .enum(["Goleiro", "Defensor", "Meia", "Atacante"])
    .optional(),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
