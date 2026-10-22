import type { NextFunction, Request, Response } from "express";
import { putWeightsSchema } from "@fut/shared";
import { getWeights, putWeights } from "./weights.service.js";

export async function handleGetWeights(req: Request, res: Response, next: NextFunction): Promise<void> {
  const roomId = req.params["id"];
  if (!roomId) { res.status(400).json({ error: { code: "BAD_REQUEST", message: "ID ausente." } }); return; }
  try {
    const result = await getWeights(roomId, req.userId);
    res.json(result);
  } catch (err) { next(err); }
}

export async function handlePutWeights(req: Request, res: Response, next: NextFunction): Promise<void> {
  const roomId = req.params["id"];
  if (!roomId) { res.status(400).json({ error: { code: "BAD_REQUEST", message: "ID ausente." } }); return; }
  const parsed = putWeightsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", details: parsed.error.flatten() } });
    return;
  }
  try {
    const result = await putWeights(roomId, req.userId, parsed.data);
    res.json(result);
  } catch (err) { next(err); }
}
