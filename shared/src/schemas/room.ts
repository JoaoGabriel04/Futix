import { z } from "zod";

export const createRoomSchema = z.object({
  title: z.string().min(1).max(100),
  location: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  lineSlots: z.number().int().min(2),
  teamSize: z.number().int().min(1),
  goalkeeperSlots: z.number().int().min(0),
  requireApproval: z.boolean().default(true),
  playRole: z.enum(["LINE", "GOALKEEPER"]),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  location: z.string().min(1).max(200).optional(),
  startsAt: z.string().datetime().optional(),
  lineSlots: z.number().int().min(2).optional(),
  teamSize: z.number().int().min(1).optional(),
  goalkeeperSlots: z.number().int().min(0).optional(),
  requireApproval: z.boolean().optional(),
});

export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
