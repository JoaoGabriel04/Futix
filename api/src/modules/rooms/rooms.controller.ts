import type { NextFunction, Request, Response } from "express";
import { createRoomSchema, updateRoomSchema, updateRoomRulesSchema } from "@fut/shared";
import {
  createRoom,
  listRooms,
  getRoom,
  updateRoom,
  lockRoom,
  unlockRoom,
  cancelRoom,
  finishRoom,
  getRoomSession,
  getRoomSummary,
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
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "ID da sala ausente." } });
    return;
  }

  const formatParsed = updateRoomSchema.safeParse(req.body);
  if (!formatParsed.success) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", details: formatParsed.error.flatten() },
    });
    return;
  }

  const rulesParsed = updateRoomRulesSchema.safeParse(req.body);
  if (!rulesParsed.success) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", details: rulesParsed.error.flatten() },
    });
    return;
  }

  try {
    const room = await updateRoom(req.userId, roomId, formatParsed.data, rulesParsed.data);
    res.json(room);
  } catch (err) {
    next(err);
  }
}

export async function lockRoomHandler(
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
    const room = await lockRoom(req.userId, roomId);
    res.json(room);
  } catch (err) {
    next(err);
  }
}

export async function unlockRoomHandler(
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
    const room = await unlockRoom(req.userId, roomId);
    res.json(room);
  } catch (err) {
    next(err);
  }
}

export async function cancelRoomHandler(
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
    const room = await cancelRoom(req.userId, roomId);
    res.json(room);
  } catch (err) {
    next(err);
  }
}

export async function finishRoomHandler(
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
    await finishRoom(req.userId, roomId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getRoomSessionHandler(
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
    const session = await getRoomSession(req.userId, roomId);
    res.json(session);
  } catch (err) {
    next(err);
  }
}

export async function getRoomSummaryHandler(
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
    const summary = await getRoomSummary(req.userId, roomId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}
