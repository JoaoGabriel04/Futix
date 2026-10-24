import { Router, type IRouter } from "express";
import multer from "multer";
import { LIMITS } from "@fut/shared";
import { requireAuth } from "../../middlewares/auth.js";
import { requireSameOrigin } from "../../middlewares/sameOrigin.js";
import { getMeHandler, updateMeHandler, updateAvatarHandler, deleteMeConnectionHandler, changePasswordHandler, deleteAvatarHandler } from "./users.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LIMITS.AVATAR_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const isAllowed = (LIMITS.AVATAR_ALLOWED_TYPES as readonly string[]).includes(file.mimetype);
    cb(null, isAllowed);
  },
});

const router: IRouter = Router();

router.get("/me", requireAuth, getMeHandler);
router.patch("/me", requireAuth, requireSameOrigin, updateMeHandler);
router.post("/me/avatar", requireAuth, requireSameOrigin, upload.single("avatar"), updateAvatarHandler);
router.delete("/me/avatar", requireAuth, requireSameOrigin, deleteAvatarHandler);
router.post("/me/password", requireAuth, requireSameOrigin, changePasswordHandler);
router.delete("/me/connections/:provider", requireAuth, requireSameOrigin, deleteMeConnectionHandler);

export { router as usersRouter };
