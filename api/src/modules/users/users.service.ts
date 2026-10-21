import type { User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { uploadAvatar } from "../../lib/cloudinary.js";
import { prisma } from "../../lib/prisma.js";
import type { UpdateMeInput } from "@fut/shared";

export async function getMe(userId: string): Promise<User> {
  try {
    return await prisma.user.findUniqueOrThrow({ where: { id: userId } });
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
  const avatarUrl = await uploadAvatar(buffer, mimetype);
  return prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
}
