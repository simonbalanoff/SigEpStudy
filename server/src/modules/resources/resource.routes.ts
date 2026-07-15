import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import { uploadPdf } from "../../middleware/upload.js";
import {
    createResource,
    deleteResource,
    getResource,
    listMyResources,
    listResources,
    listSavedResources,
    markHelpful,
    openResourceFile,
    openResourcePreview,
    saveResource,
    unmarkHelpful,
    unsaveResource,
    updateResource,
} from "./resource.controller.js";

export const resourceRouter = Router();

resourceRouter.use(requireAuth);
resourceRouter.get("/", listResources);
resourceRouter.get("/mine", listMyResources);
resourceRouter.get("/saved", listSavedResources);
resourceRouter.post("/", uploadPdf.single("file"), createResource);
resourceRouter.get("/:resourceId", getResource);
resourceRouter.get("/:resourceId/file", openResourceFile);
resourceRouter.patch("/:resourceId", updateResource);
resourceRouter.delete("/:resourceId", deleteResource);
resourceRouter.get("/:resourceId/preview", openResourcePreview);
resourceRouter.post("/:resourceId/save", saveResource);
resourceRouter.delete("/:resourceId/save", unsaveResource);
resourceRouter.post("/:resourceId/helpful", markHelpful);
resourceRouter.delete("/:resourceId/helpful", unmarkHelpful);
