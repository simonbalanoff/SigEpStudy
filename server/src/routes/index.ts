import { Router } from "express";

import { authRouter } from "../modules/auth/auth.routes.js";
import { courseRouter, professorRouter } from "../modules/courses/course.routes.js";
import { healthRouter } from "../modules/health/health.routes.js";
import { invitationAdminRouter, invitationPublicRouter } from "../modules/invitations/invitation.routes.js";
import { moderationRouter, reportRouter } from "../modules/moderation/moderation.routes.js";
import { resourceRouter } from "../modules/resources/resource.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/invitations", invitationPublicRouter);
apiRouter.use("/courses", courseRouter);
apiRouter.use("/professors", professorRouter);
apiRouter.use("/resources", resourceRouter);
apiRouter.use("/reports", reportRouter);
apiRouter.use("/moderation", moderationRouter);
apiRouter.use("/admin", invitationAdminRouter);
