import { Router, type IRouter } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { requireSameOrigin } from "../../middlewares/sameOrigin.js";
import { requireOrganizerRole } from "../../middlewares/roomRole.js";
import {
  createRoomHandler,
  listRoomsHandler,
  getRoomHandler,
  updateRoomHandler,
} from "./rooms.controller.js";

const router: IRouter = Router();

router.post("/rooms", requireAuth, requireSameOrigin, createRoomHandler);
router.get("/rooms", requireAuth, listRoomsHandler);
router.get("/rooms/:id", requireAuth, getRoomHandler);
router.patch("/rooms/:id", requireAuth, requireSameOrigin, requireOrganizerRole, updateRoomHandler);

export { router as roomsRouter };
