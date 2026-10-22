import { Router, type IRouter } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { requireOrganizerRole } from "../../middlewares/roomRole.js";
import { handleGetWeights, handlePutWeights } from "./weights.controller.js";

const router: IRouter = Router();

router.get("/rooms/:id/weights", requireAuth, requireOrganizerRole, handleGetWeights);
router.put("/rooms/:id/weights", requireAuth, requireOrganizerRole, handlePutWeights);

export { router as weightsRouter };
