import type { NextFunction, Request, Response } from "express";
import type { AuthProvider } from "@prisma/client";
import { updateMeSchema } from "@fut/shared";
import { getMe, updateMe, updateAvatar, deleteConnection } from "./users.service.js";

export async function getMeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await getMe(req.userId);
    const { providerId: _, provider: __, authIdentities: ___, passwordHash: ____, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    next(err);
  }
}

export async function updateMeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const parsed = updateMeSchema.safeParse(req.body);
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
    const user = await updateMe(req.userId, parsed.data);
    const { providerId: _, provider: __, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    next(err);
  }
}

export async function updateAvatarHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.file) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Nenhum arquivo enviado." },
    });
    return;
  }

  try {
    const user = await updateAvatar(req.userId, req.file.buffer, req.file.mimetype);
    const { providerId: _, provider: __, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    next(err);
  }
}

export async function deleteMeConnectionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const providerRaw = req.params["provider"];
  if (typeof providerRaw !== "string") {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Provider inválido." } });
    return;
  }

  const provider = providerRaw.toUpperCase() as AuthProvider;
  if (provider !== "GOOGLE" && provider !== "DISCORD") {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Provider inválido. Use 'google' ou 'discord'." } });
    return;
  }

  try {
    await deleteConnection(req.userId, provider);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
