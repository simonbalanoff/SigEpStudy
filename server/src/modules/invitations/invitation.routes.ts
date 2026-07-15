import { Router } from "express";
import rateLimit from "express-rate-limit";

import { requireAuth } from "../../middleware/auth.js";
import { authorize } from "../../middleware/authorize.js";
import {
    createInvitation,
    deactivateInvitation,
    listInvitations,
    listUsers,
    resolveInvitation,
    updateUser,
} from "./invitation.controller.js";

export const invitationPublicRouter = Router();
export const invitationAdminRouter = Router();

const invitationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 250,
    standardHeaders: true,
    legacyHeaders: false,
});

invitationPublicRouter.get("/:token", invitationLimiter, resolveInvitation);
invitationAdminRouter.use(requireAuth, authorize("admin"));
invitationAdminRouter.get("/invitations", listInvitations);
invitationAdminRouter.post("/invitations", createInvitation);
invitationAdminRouter.patch(
    "/invitations/:invitationId/deactivate",
    deactivateInvitation,
);
invitationAdminRouter.get("/users", listUsers);
invitationAdminRouter.patch("/users/:userId", updateUser);
