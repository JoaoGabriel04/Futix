import type { NextFunction, Request, Response } from "express";
import type { AuthProvider } from "@prisma/client";
import { updateMeSchema } from "@fut/shared";
import { getMe, updateMe, updateAvatar, deleteConnection, changePassword } from "./users.service.js";
import { setAuthCookies } from "../auth/auth.service.js";

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

export async function changePasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const body = req.body as { currentPassword?: unknown; newPassword?: unknown };

  if (typeof body.newPassword !== "string" || body.newPassword.length === 0) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "newPassword é obrigatório." } });
    return;
  }

  const currentPassword =
    typeof body.currentPassword === "string" && body.currentPassword.length > 0
      ? body.currentPassword
      : undefined;

  try {
    const updatedUser = await changePassword(req.userId, currentPassword, body.newPassword);
    // Reissue cookies with the new sessionVersion so current session stays valid
    setAuthCookies(res, updatedUser.id, updatedUser.sessionVersion);
    res.json({ message: "Senha atualizada" });
  } catch (err) {
    next(err);
  }
}
