import type { NextFunction, Request, Response } from "express";
import { createRoomSchema, updateRoomSchema } from "@fut/shared";
import {
  createRoom,
  listRooms,
  getRoom,
  updateRoom,
} from "./rooms.service.js";

export async function createRoomHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados inválidos.",
        details: parsed.error.flatten(),
      },
    });
    return;
  }

  try {
    const room = await createRoom(req.userId, parsed.data);
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
}

export async function listRoomsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rooms = await listRooms(req.userId);
    res.json(rooms);
  } catch (err) {
    next(err);
  }
}

export async function getRoomHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const roomId = req.params["id"];

  if (!roomId) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "ID da sala ausente." },
    });
    return;
  }

  try {
    const room = await getRoom(roomId, req.userId);
    res.json(room);
  } catch (err) {
    next(err);
  }
}

export async function updateRoomHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const roomId = req.params["id"];

  if (!roomId) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "ID da sala ausente." },
    });
    return;
  }

  const parsed = updateRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados inválidos.",
        details: parsed.error.flatten(),
      },
    });
    return;
  }

  try {
    const room = await updateRoom(roomId, parsed.data);
    res.json(room);
  } catch (err) {
    next(err);
  }
}
