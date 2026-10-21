import { v2 as cloudinaryV2 } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";
import { env } from "../env.js";
import { LIMITS } from "@fut/shared";

cloudinaryV2.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export async function uploadAvatar(buffer: Buffer, mimetype: string): Promise<string> {
  if (!(LIMITS.AVATAR_ALLOWED_TYPES as readonly string[]).includes(mimetype)) {
    const error = new Error(
      `Tipo de arquivo inválido. Permitidos: ${LIMITS.AVATAR_ALLOWED_TYPES.join(", ")}.`,
    ) as Error & { status: number; code: string };
    error.status = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (buffer.length > LIMITS.AVATAR_MAX_BYTES) {
    const maxMb = LIMITS.AVATAR_MAX_BYTES / (1024 * 1024);
    const error = new Error(
      `Arquivo muito grande. Tamanho máximo: ${maxMb}MB.`,
    ) as Error & { status: number; code: string };
    error.status = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinaryV2.uploader.upload_stream(
      { folder: "fut/avatars", resource_type: "image" },
      (err, uploadResult) => {
        if (err || !uploadResult) {
          reject(err ?? new Error("Upload falhou sem resposta."));
        } else {
          resolve(uploadResult);
        }
      },
    );
    stream.end(buffer);
  });

  return result.secure_url;
}
