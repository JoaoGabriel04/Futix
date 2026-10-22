import { Router, type IRouter } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { requireOrganizerRole } from "../../middlewares/roomRole.js";
import { handleStartRoom, handleDrawTeams, handleGetLatestDraw } from "./draws.controller.js";

const router: IRouter = Router();

router.post("/rooms/:id/start", requireAuth, requireOrganizerRole, handleStartRoom);
router.post("/rooms/:id/draw", requireAuth, requireOrganizerRole, handleDrawTeams);
router.get("/rooms/:id/draw", requireAuth, handleGetLatestDraw);

export { router as drawsRouter };
