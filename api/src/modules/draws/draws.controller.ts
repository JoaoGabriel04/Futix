import type { NextFunction, Request, Response } from "express";
import { startRoom, drawTeams, getLatestDraw } from "./draws.service.js";

export async function handleStartRoom(
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
    const result = await startRoom(req.userId, roomId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

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
      // Strip level and weightTotal for non-organizer members
      const memberRole = req.memberRole;
      if (memberRole === "ORGANIZER" || memberRole === "CO_ORGANIZER") {
        res.json(result);
      } else {
        // Strip level from players and weightTotal from teams
        const filtered = {
          ...result,
          teams: result.teams.map((team) => {
            const { weightTotal: _wt, ...teamWithoutWeight } = team;
            return {
              ...teamWithoutWeight,
              players: team.players.map((p) => {
                const { level: _l, ...playerWithoutLevel } = p;
                return playerWithoutLevel;
              }),
            };
          }),
          leftoverPlayers: result.leftoverPlayers.map((p) => {
            const { level: _l, ...playerWithoutLevel } = p;
            return playerWithoutLevel;
          }),
        };
        res.json(filtered);
      }
    }
  } catch (err) {
    next(err);
  }
}
