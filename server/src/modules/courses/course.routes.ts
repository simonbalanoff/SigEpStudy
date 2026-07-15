import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import {
  createCourseProfessor,
  getCourse,
  listCourseProfessors,
  searchCourses,
  searchProfessors
} from "./course.controller.js";

export const courseRouter = Router();

courseRouter.use(requireAuth);
courseRouter.get("/search", searchCourses);
courseRouter.get("/:courseId", getCourse);
courseRouter.get("/:courseId/professors", listCourseProfessors);
courseRouter.post("/:courseId/professors", createCourseProfessor);

export const professorRouter = Router();
professorRouter.use(requireAuth);
professorRouter.get("/search", searchProfessors);
