import bcrypt from "bcryptjs";
import type { User, AuthProvider, AuthIdentity } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { uploadAvatar, deleteAvatar } from "../../lib/cloudinary.js";
import { prisma } from "../../lib/prisma.js";
import type { UpdateMeInput } from "@fut/shared";
import { assertPasswordStrength } from "../auth/auth.service.js";

export type UserWithConnections = User & {
  authIdentities: AuthIdentity[];
  connections: {
    google: boolean;
    discord: boolean;
    password: boolean;
  };
};

export async function getMe(userId: string): Promise<UserWithConnections> {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { authIdentities: true },
    });

    const connections = {
      google: user.authIdentities.some((i) => i.provider === "GOOGLE"),
      discord: user.authIdentities.some((i) => i.provider === "DISCORD"),
      password: user.passwordHash !== null,
    };

    return { ...user, connections };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      const notFound = new Error("Usuário não encontrado.") as Error & {
        status: number;
        code: string;
      };
      notFound.status = 404;
      notFound.code = "USER_NOT_FOUND";
      throw notFound;
    }
    throw err;
  }
}

function makeAppError(
  message: string,
  code: string,
  status: number,
): Error & { code: string; status: number } {
  const err = new Error(message) as Error & { code: string; status: number };
  err.code = code;
  err.status = status;
  return err;
}

export async function deleteConnection(
  userId: string,
  provider: AuthProvider,
): Promise<void> {
  // Count how many login methods the user has
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { authIdentities: true },
  });

  const identityCount = user.authIdentities.length;
  const hasPassword = user.passwordHash !== null ? 1 : 0;
  const totalMethods = identityCount + hasPassword;

  if (totalMethods <= 1) {
    throw makeAppError(
      "Você não pode remover o único método de login",
      "LAST_LOGIN_METHOD",
      400,
    );
  }

  await prisma.authIdentity.deleteMany({
    where: { userId, provider },
  });
}

export async function updateMe(userId: string, data: UpdateMeInput): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      ...(data.nickname !== undefined && { nickname: data.nickname }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.preferredPosition !== undefined && { preferredPosition: data.preferredPosition }),
    },
  });
}

export async function updateAvatar(
  userId: string,
  buffer: Buffer,
  mimetype: string,
): Promise<User> {
  // 1. Buscar avatarPublicId atual
  const currentUser = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { avatarPublicId: true },
  });

  // 2. Fazer upload novo
  const { url, publicId } = await uploadAvatar(buffer, mimetype);

  // 3. Apagar avatar anterior do Cloudinary (se existia)
  if (currentUser.avatarPublicId) {
    await deleteAvatar(currentUser.avatarPublicId).catch(() => {
      // log silently — don't fail the upload if delete fails
    });
  }

  // 4. Salvar ambos
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: url, avatarPublicId: publicId },
  });
}

export async function deleteUserAvatar(userId: string): Promise<User> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { avatarPublicId: true },
  });

  if (user.avatarPublicId) {
    await deleteAvatar(user.avatarPublicId).catch(() => {});
  }

  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null, avatarPublicId: null },
  });
}

/**
 * R43 — Create or change the password for the authenticated user.
 * Returns the updated user (with new sessionVersion).
 */
export async function changePassword(
  userId: string,
  currentPassword: string | undefined,
  newPassword: string,
): Promise<User> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, passwordHash: true, sessionVersion: true },
  });

  if (user.passwordHash !== null) {
    // Account already has a password — currentPassword is required
    if (currentPassword === undefined || currentPassword.length === 0) {
      throw makeAppError("Senha atual é obrigatória", "INVALID_CREDENTIALS", 400);
    }
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw makeAppError("Senha atual incorreta", "INVALID_CREDENTIALS", 401);
    }
  } else {
    // Social-only account — email is required to set a password
    if (user.email === null) {
      throw makeAppError(
        "Esta conta não tem e-mail. Adicione um e-mail para criar senha",
        "EMAIL_REQUIRED",
        400,
      );
    }
  }

  assertPasswordStrength(newPassword);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const newSessionVersion = user.sessionVersion + 1;

  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash, sessionVersion: newSessionVersion },
  });
}
