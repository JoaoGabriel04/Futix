import type { NextFunction, Request, Response } from "express";
import { drawTeams, getLatestDraw } from "./draws.service.js";

export async function handleDrawTeams(
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
    const result = await drawTeams(req.userId, roomId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleGetLatestDraw(
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
    const result = await getLatestDraw(roomId, req.userId);
    if (result === null) {
      res.status(204).send();
    } else {
      res.json(result);
    }
  } catch (err) {
    next(err);
  }
}
