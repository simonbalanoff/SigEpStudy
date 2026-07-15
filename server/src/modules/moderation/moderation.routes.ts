import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import { authorize } from "../../middleware/authorize.js";
import {
  createReport,
  listAuditEvents,
  listModerationProfessors,
  listModerationResources,
  listReports,
  moderateProfessor,
  moderateResource,
  resolveReport
} from "./moderation.controller.js";

export const reportRouter = Router();
export const moderationRouter = Router();

reportRouter.use(requireAuth);
reportRouter.post("/", createReport);

moderationRouter.use(requireAuth, authorize("moderator", "admin"));
moderationRouter.get("/resources", listModerationResources);
moderationRouter.patch("/resources/:resourceId", moderateResource);
moderationRouter.get("/professors", listModerationProfessors);
moderationRouter.patch("/professors/:professorId", moderateProfessor);
moderationRouter.get("/reports", listReports);
moderationRouter.patch("/reports/:reportId", resolveReport);
moderationRouter.get("/audit", authorize("admin"), listAuditEvents);
