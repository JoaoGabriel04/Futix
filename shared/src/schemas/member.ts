import { z } from "zod";

export const joinRoomSchema = z.object({
  playRole: z.enum(["LINE", "GOALKEEPER"]),
});

export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
