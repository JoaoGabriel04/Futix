import type { NextFunction, Request, Response } from "express";
import { createInvite, getInvitePreview, useInvite } from "./invites.service.js";

export async function handleCreateInvite(
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
    const result = await createInvite(req.userId, roomId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleGetInvitePreview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.params["token"];

  if (!token) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Token ausente." } });
    return;
  }

  try {
    const result = await getInvitePreview(token);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleUseInvite(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.params["token"];

  if (!token) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Token ausente." } });
    return;
  }

  try {
    const result = await useInvite(token, req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
