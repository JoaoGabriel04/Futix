import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados inválidos",
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  const status = (err as { status?: number }).status ?? 500;
  const code = (err as { code?: string }).code ?? "INTERNAL_ERROR";
  const message =
    status < 500 ? (err as Error).message : "Ocorreu um erro interno. Tente novamente.";

  res.status(status).json({ error: { code, message } });
};
