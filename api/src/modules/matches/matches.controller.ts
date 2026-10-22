import type { NextFunction, Request, Response } from "express";
import { createGoalSchema } from "@fut/shared";
import {
  startMatch,
  pauseMatch,
  resumeMatch,
  addGoal,
  undoLastGoal,
  endMatch,
  getMatch,
  getMatchesForRoom,
} from "./matches.service.js";

export async function handleStartMatch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const roomId = req.params["id"];
  if (!roomId) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "ID da sala ausente." } });
    return;
  }
  try {
    const result = await startMatch(req.userId, roomId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleGetMatchesForRoom(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const roomId = req.params["id"];
  if (!roomId) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "ID da sala ausente." } });
    return;
  }
  try {
    const result = await getMatchesForRoom(req.userId, roomId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleGetMatch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const matchId = req.params["matchId"];
  if (!matchId) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "ID da partida ausente." } });
    return;
  }
  try {
    const result = await getMatch(req.userId, matchId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function handlePauseMatch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const matchId = req.params["id"];
  if (!matchId) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "ID da partida ausente." } });
    return;
  }
  try {
    const result = await pauseMatch(req.userId, matchId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleResumeMatch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const matchId = req.params["id"];
  if (!matchId) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "ID da partida ausente." } });
    return;
  }
  try {
    const result = await resumeMatch(req.userId, matchId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleEndMatch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const matchId = req.params["id"];
  if (!matchId) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "ID da partida ausente." } });
    return;
  }
  try {
    const result = await endMatch(req.userId, matchId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleAddGoal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const matchId = req.params["id"];
  if (!matchId) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "ID da partida ausente." } });
    return;
  }

  const parsed = createGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    const result = await addGoal(req.userId, matchId, parsed.data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleUndoLastGoal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const matchId = req.params["id"];
  if (!matchId) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "ID da partida ausente." } });
    return;
  }
  try {
    const result = await undoLastGoal(req.userId, matchId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
