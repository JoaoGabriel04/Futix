import { Router, type IRouter } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { handleDrawTeams, handleGetLatestDraw } from "./draws.controller.js";

const router: IRouter = Router();

router.post("/rooms/:id/draw", requireAuth, handleDrawTeams);
router.get("/rooms/:id/draw", requireAuth, handleGetLatestDraw);

export { router as drawsRouter };
