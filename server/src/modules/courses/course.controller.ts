import type { RequestHandler } from "express";
import type { HydratedDocument } from "mongoose";

import { AppError } from "../../utils/app-error.js";
import { escapeRegex, normalizeName, normalizeSearch } from "../../utils/normalize.js";
import { requireObjectId } from "../../utils/object-id.js";
import { routeParam } from "../../utils/route-param.js";
import { CourseInstructor } from "./course-instructor.model.js";
import { Course } from "./course.model.js";
import { Professor, type IProfessor } from "./professor.model.js";
import { courseSearchSchema, createProfessorSchema, professorSearchSchema } from "./course.schemas.js";

export const searchCourses: RequestHandler = async (request, response) => {
  const input = courseSearchSchema.parse(request.query);
  const filter: Record<string, unknown> = { active: true };
  if (input.q) filter.searchText = { $regex: escapeRegex(normalizeSearch(input.q)), $options: "i" };
  const courses = await Course.find(filter).sort({ displayCode: 1 }).limit(input.limit);
  response.json({ courses });
};

export const getCourse: RequestHandler = async (request, response) => {
  const courseId = requireObjectId(routeParam(request.params.courseId, "courseId"), "courseId");
  const course = await Course.findOne({ _id: courseId, active: true });
  if (!course) throw new AppError(404, "COURSE_NOT_FOUND", "The course could not be found.");
  response.json({ course });
};

export const listCourseProfessors: RequestHandler = async (request, response) => {
  const courseId = requireObjectId(routeParam(request.params.courseId, "courseId"), "courseId");
  const course = await Course.findOne({ _id: courseId, active: true });
  if (!course) throw new AppError(404, "COURSE_NOT_FOUND", "The course could not be found.");
  const associations = await CourseInstructor.find({ courseId, status: "approved" }).select("professorId");
  const professors = await Professor.find({
    _id: { $in: associations.map((item) => item.professorId) },
    status: "approved"
  }).sort({ displayName: 1 });
  response.json({ professors });
};

export const searchProfessors: RequestHandler = async (request, response) => {
  const input = professorSearchSchema.parse(request.query);
  const filter: Record<string, unknown> = { status: "approved" };
  if (input.q) filter.normalizedName = { $regex: escapeRegex(normalizeName(input.q)), $options: "i" };
  if (input.courseId) {
    const courseId = requireObjectId(input.courseId, "courseId");
    const associations = await CourseInstructor.find({ courseId, status: "approved" }).select("professorId");
    filter._id = { $in: associations.map((item) => item.professorId) };
  }
  const professors = await Professor.find(filter).sort({ displayName: 1 }).limit(input.limit);
  response.json({ professors });
};

export const createCourseProfessor: RequestHandler = async (request, response) => {
  const user = request.auth?.user;
  if (!user) throw new AppError(401, "AUTHENTICATION_REQUIRED", "You must sign in to continue.");
  const courseId = requireObjectId(routeParam(request.params.courseId, "courseId"), "courseId");
  const input = createProfessorSchema.parse(request.body);
  const course = await Course.findOne({ _id: courseId, active: true });
  if (!course) throw new AppError(404, "COURSE_NOT_FOUND", "The course could not be found.");

  let professor: HydratedDocument<IProfessor> | null = null;
  if (input.professorId) {
    professor = await Professor.findOne({
      _id: requireObjectId(input.professorId, "professorId"),
      status: { $in: ["pending", "approved"] }
    });
  } else if (input.displayName) {
    const normalizedName = normalizeName(input.displayName);
    if (!input.forceCreate) {
      professor = await Professor.findOne({ normalizedName, status: { $in: ["pending", "approved"] } });
    }
    if (!professor) {
      professor = await Professor.create({
        displayName: input.displayName,
        normalizedName,
        aliases: [],
        status: "pending",
        createdBy: user._id
      });
    }
  }

  if (!professor) throw new AppError(400, "INVALID_PROFESSOR", "The selected professor is invalid.");
  const association = await CourseInstructor.findOneAndUpdate(
    { courseId, professorId: professor._id },
    {
      $set: { status: professor.status === "approved" ? "approved" : "pending" },
      $setOnInsert: { createdBy: user._id }
    },
    { upsert: true, new: true }
  );
  response.status(201).json({ professor, association });
};
