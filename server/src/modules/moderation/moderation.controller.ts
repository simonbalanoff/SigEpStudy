import type { RequestHandler } from "express";

import { CourseInstructor } from "../courses/course-instructor.model.js";
import { Professor } from "../courses/professor.model.js";
import { Resource } from "../resources/resource.model.js";
import { recordAuditEvent } from "../../services/audit.js";
import { AppError } from "../../utils/app-error.js";
import { normalizeName } from "../../utils/normalize.js";
import { requireObjectId } from "../../utils/object-id.js";
import { routeParam } from "../../utils/route-param.js";
import { AuditEvent } from "./audit-event.model.js";
import { Report } from "./report.model.js";
import {
    createReportSchema,
    moderationResourceQuerySchema,
    moderateResourceSchema,
    professorModerationQuerySchema,
    professorModerationSchema,
    reportQuerySchema,
    resolveReportSchema,
} from "./moderation.schemas.js";

export const createReport: RequestHandler = async (request, response) => {
    const user = request.auth?.user;
    if (!user)
        throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "You must sign in to continue.",
        );
    const input = createReportSchema.parse(request.body);
    const resourceId = requireObjectId(input.resourceId, "resourceId");
    if (!(await Resource.exists({ _id: resourceId, status: "approved" })))
        throw new AppError(
            404,
            "RESOURCE_NOT_FOUND",
            "The resource could not be found.",
        );
    if (
        await Report.exists({
            reporterId: user._id,
            resourceId,
            status: "open",
        })
    )
        throw new AppError(
            409,
            "REPORT_ALREADY_OPEN",
            "You already have an open report for this resource.",
        );
    const report = await Report.create({
        resourceId,
        reporterId: user._id,
        reason: input.reason,
        description: input.description,
        status: "open",
    });
    response.status(201).json({ report });
};

export const listModerationResources: RequestHandler = async (
    request,
    response,
) => {
    const input = moderationResourceQuerySchema.parse(request.query);
    const filter = { status: input.status };
    const skip = (input.page - 1) * input.limit;
    const [resources, total] = await Promise.all([
        Resource.find(filter)
            .select("-storedFileName")
            .populate("courseId", "displayCode title")
            .populate("professorId", "displayName status")
            .populate("uploaderId", "firstName lastName email")
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(input.limit),
        Resource.countDocuments(filter),
    ]);
    response.json({
        resources,
        pagination: {
            page: input.page,
            limit: input.limit,
            total,
            pages: Math.ceil(total / input.limit),
        },
    });
};

export const moderateResource: RequestHandler = async (request, response) => {
    const user = request.auth?.user;
    if (!user)
        throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "You must sign in to continue.",
        );
    const resourceId = requireObjectId(
        routeParam(request.params.resourceId, "resourceId"),
        "resourceId",
    );
    const input = moderateResourceSchema.parse(request.body);
    const resource = await Resource.findById(resourceId);
    if (!resource)
        throw new AppError(
            404,
            "RESOURCE_NOT_FOUND",
            "The resource could not be found.",
        );
    if (input.action !== "approve" && !input.note)
        throw new AppError(
            400,
            "MODERATION_NOTE_REQUIRED",
            "A moderation note is required for this action.",
        );
    const statusMap = {
        approve: "approved",
        request_changes: "changes_requested",
        reject: "rejected",
        remove: "removed",
    } as const;
    resource.status = statusMap[input.action];
    resource.moderationNote = input.note;
    resource.moderatedBy = user._id;
    resource.moderatedAt = new Date();
    if (input.action === "approve")
        resource.publishedAt = resource.publishedAt ?? new Date();
    await resource.save();
    await recordAuditEvent({
        actorId: user._id,
        action: `resource.${input.action}`,
        targetType: "Resource",
        targetId: resource._id,
        metadata: { note: input.note },
    });
    response.json({ resource });
};

export const listModerationProfessors: RequestHandler = async (
    request,
    response,
) => {
    const input = professorModerationQuerySchema.parse(request.query);
    const filter = { status: input.status };
    const skip = (input.page - 1) * input.limit;
    const [professors, total] = await Promise.all([
        Professor.find(filter)
            .populate("createdBy", "firstName lastName email")
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(input.limit),
        Professor.countDocuments(filter),
    ]);
    response.json({
        professors,
        pagination: {
            page: input.page,
            limit: input.limit,
            total,
            pages: Math.ceil(total / input.limit),
        },
    });
};

export const moderateProfessor: RequestHandler = async (request, response) => {
    const user = request.auth?.user;
    if (!user)
        throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "You must sign in to continue.",
        );
    const professorId = requireObjectId(
        routeParam(request.params.professorId, "professorId"),
        "professorId",
    );
    const input = professorModerationSchema.parse(request.body);
    const professor = await Professor.findById(professorId);
    if (!professor)
        throw new AppError(
            404,
            "PROFESSOR_NOT_FOUND",
            "The professor could not be found.",
        );
    if (input.action === "approve") {
        if (input.displayName) {
            professor.displayName = input.displayName;
            professor.normalizedName = normalizeName(input.displayName);
        }
        professor.status = "approved";
        professor.approvedBy = user._id;
        await professor.save();
        await CourseInstructor.updateMany(
            { professorId: professor._id },
            { status: "approved" },
        );
    }
    if (input.action === "reject") {
        professor.status = "rejected";
        await professor.save();
        await CourseInstructor.updateMany(
            { professorId: professor._id },
            { status: "rejected" },
        );
    }
    if (input.action === "merge") {
        if (!input.mergeIntoProfessorId)
            throw new AppError(
                400,
                "MERGE_TARGET_REQUIRED",
                "A merge target is required.",
            );
        const target = await Professor.findOne({
            _id: requireObjectId(
                input.mergeIntoProfessorId,
                "mergeIntoProfessorId",
            ),
            status: "approved",
        });
        if (!target || String(target._id) === String(professor._id))
            throw new AppError(
                400,
                "INVALID_MERGE_TARGET",
                "The merge target is invalid.",
            );
        const associations = await CourseInstructor.find({
            professorId: professor._id,
        });
        for (const association of associations) {
            await CourseInstructor.updateOne(
                { courseId: association.courseId, professorId: target._id },
                {
                    $set: { status: "approved" },
                    $setOnInsert: { createdBy: association.createdBy },
                },
                { upsert: true },
            );
        }
        await Promise.all([
            Resource.updateMany(
                { professorId: professor._id },
                { professorId: target._id },
            ),
            CourseInstructor.deleteMany({ professorId: professor._id }),
        ]);
        professor.status = "merged";
        professor.mergedIntoProfessorId = target._id;
        await professor.save();
    }
    await recordAuditEvent({
        actorId: user._id,
        action: `professor.${input.action}`,
        targetType: "Professor",
        targetId: professor._id,
        metadata: {
            displayName: input.displayName,
            mergeIntoProfessorId: input.mergeIntoProfessorId,
        },
    });
    response.json({ professor });
};

export const listReports: RequestHandler = async (request, response) => {
    const input = reportQuerySchema.parse(request.query);
    const filter = { status: input.status };
    const skip = (input.page - 1) * input.limit;
    const [reports, total] = await Promise.all([
        Report.find(filter)
            .populate("resourceId", "title status courseId")
            .populate("reporterId", "firstName lastName email")
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(input.limit),
        Report.countDocuments(filter),
    ]);
    response.json({
        reports,
        pagination: {
            page: input.page,
            limit: input.limit,
            total,
            pages: Math.ceil(total / input.limit),
        },
    });
};

export const resolveReport: RequestHandler = async (request, response) => {
    const user = request.auth?.user;
    if (!user)
        throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "You must sign in to continue.",
        );
    const reportId = requireObjectId(
        routeParam(request.params.reportId, "reportId"),
        "reportId",
    );
    const input = resolveReportSchema.parse(request.body);
    const report = await Report.findById(reportId);
    if (!report)
        throw new AppError(
            404,
            "REPORT_NOT_FOUND",
            "The report could not be found.",
        );
    report.status = input.status;
    report.resolutionNote = input.resolutionNote;
    report.resolvedBy = user._id;
    report.resolvedAt = new Date();
    await report.save();
    await recordAuditEvent({
        actorId: user._id,
        action: `report.${input.status}`,
        targetType: "Report",
        targetId: report._id,
        metadata: { resolutionNote: input.resolutionNote },
    });
    response.json({ report });
};

export const listAuditEvents: RequestHandler = async (request, response) => {
    const page = Math.max(1, Number(request.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(request.query.limit ?? 30)));
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
        AuditEvent.find()
            .populate("actorId", "firstName lastName email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        AuditEvent.countDocuments(),
    ]);
    response.json({
        events,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
};
