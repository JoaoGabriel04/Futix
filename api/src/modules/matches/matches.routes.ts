import { Router, type IRouter } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { requireOrganizerRole } from "../../middlewares/roomRole.js";
import {
  handleStartMatch,
  handleGetMatchesForRoom,
  handleGetMatch,
  handlePauseMatch,
  handleResumeMatch,
  handleEndMatch,
  handleAddGoal,
  handleUndoLastGoal,
} from "./matches.controller.js";

// Router for /rooms/:id/matches — mounted at /rooms in app.ts
const roomMatchesRouter: IRouter = Router();

roomMatchesRouter.post("/:id/matches", requireAuth, requireOrganizerRole, handleStartMatch);
roomMatchesRouter.get("/:id/matches", requireAuth, handleGetMatchesForRoom);

// Router for /matches/:matchId — mounted at /matches in app.ts
const matchesRouter: IRouter = Router();

matchesRouter.get("/:matchId", requireAuth, handleGetMatch);
matchesRouter.post("/:id/pause", requireAuth, handlePauseMatch);
matchesRouter.post("/:id/resume", requireAuth, handleResumeMatch);
matchesRouter.post("/:id/end", requireAuth, handleEndMatch);
matchesRouter.post("/:id/goals", requireAuth, handleAddGoal);
matchesRouter.delete("/:id/goals/last", requireAuth, handleUndoLastGoal);

export { roomMatchesRouter, matchesRouter };
