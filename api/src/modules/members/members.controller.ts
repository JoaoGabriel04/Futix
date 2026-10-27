import type { NextFunction, Request, Response } from "express";
import { joinRoomSchema } from "@fut/shared";
import {
  joinRoom,
  leaveRoom,
  approveMember,
  rejectMember,
  promoteMember,
  removeMember,
  markAbsent,
  addCoOrganizer,
  removeCoOrganizer,
} from "./members.service.js";

export async function handleJoin(
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

  const parsed = joinRoomSchema.safeParse(req.body);
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
    const member = await joinRoom(req.userId, roomId, parsed.data);
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
}

export async function handleLeave(
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
    await leaveRoom(req.userId, roomId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function handleApprove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const roomId = req.params["id"];
  const memberId = req.params["memberId"];

  if (!roomId || !memberId) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "ID da sala ou membro ausente." },
    });
    return;
  }

  try {
    const member = await approveMember(req.userId, roomId, memberId);
    res.status(200).json(member);
  } catch (err) {
    next(err);
  }
}

export async function handleReject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const roomId = req.params["id"];
  const memberId = req.params["memberId"];

  if (!roomId || !memberId) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "ID da sala ou membro ausente." },
    });
    return;
  }

  try {
    const member = await rejectMember(req.userId, roomId, memberId);
    res.status(200).json(member);
  } catch (err) {
    next(err);
  }
}

export async function handlePromote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const roomId = req.params["id"];
  const memberId = req.params["memberId"];

  if (!roomId || !memberId) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "ID da sala ou membro ausente." },
    });
    return;
  }

  try {
    const member = await promoteMember(req.userId, roomId, memberId);
    res.status(200).json(member);
  } catch (err) {
    next(err);
  }
}

export async function handleRemove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const roomId = req.params["id"];
  const memberId = req.params["memberId"];

  if (!roomId || !memberId) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "ID da sala ou membro ausente." },
    });
    return;
  }

  try {
    await removeMember(req.userId, roomId, memberId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function handleMarkAbsent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const roomId = req.params["id"];
  const memberId = req.params["memberId"];

  if (!roomId || !memberId) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "ID da sala ou membro ausente." },
    });
    return;
  }

  try {
    const member = await markAbsent(req.userId, roomId, memberId);
    res.status(200).json(member);
  } catch (err) {
    next(err);
  }
}

export async function handleAddCoOrganizer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const roomId = req.params["id"];
  const userId = req.params["userId"];

  if (!roomId || !userId) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "ID da sala ou usuário ausente." },
    });
    return;
  }

  try {
    const member = await addCoOrganizer(req.userId, roomId, userId);
    res.status(200).json(member);
  } catch (err) {
    next(err);
  }
}

export async function handleRemoveCoOrganizer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const roomId = req.params["id"];
  const userId = req.params["userId"];

  if (!roomId || !userId) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "ID da sala ou usuário ausente." },
    });
    return;
  }

  try {
    const member = await removeCoOrganizer(req.userId, roomId, userId);
    res.status(200).json(member);
  } catch (err) {
    next(err);
  }
}
