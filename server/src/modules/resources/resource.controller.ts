import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";

import type { RequestHandler } from "express";
import type { HydratedDocument, Types } from "mongoose";

import { Course, type ICourse } from "../courses/course.model.js";
import { Professor } from "../courses/professor.model.js";
import {
    deleteObjects,
    getObject,
    uploadObject,
} from "../../services/object-storage.js";
import { generatePdfPreview } from "../../services/pdf-preview.js";
import { AppError } from "../../utils/app-error.js";
import { requireObjectId } from "../../utils/object-id.js";
import { routeParam } from "../../utils/route-param.js";
import {
    escapeRegex,
    normalizeSearch,
    normalizeTopic,
} from "../../utils/normalize.js";
import { HelpfulResource } from "./helpful-resource.model.js";
import { Resource, type IResource } from "./resource.model.js";
import { SavedResource } from "./saved-resource.model.js";
import {
    createResourceSchema,
    listResourcesSchema,
    updateResourceSchema,
} from "./resource.schemas.js";

function cleanResource(
    resource: HydratedDocument<IResource>,
): Record<string, unknown> {
    const object = resource.toObject() as unknown as Record<string, unknown>;

    const hasPreview = object.storageKind === "file";

    delete object.fileObjectKey;
    delete object.previewObjectKey;
    delete object.storedFileName;
    delete object.previewFileName;

    return {
        ...object,
        hasPreview,
    };
}

async function addSavedState(
    resources: HydratedDocument<IResource>[],
    userId: Types.ObjectId,
): Promise<Array<Record<string, unknown>>> {
    if (resources.length === 0) {
        return [];
    }

    const savedRecords = await SavedResource.find({
        userId,
        resourceId: {
            $in: resources.map((resource) => resource._id),
        },
    }).select("resourceId");

    const savedIds = new Set(
        savedRecords.map((record) => String(record.resourceId)),
    );

    return resources.map((resource) => ({
        ...cleanResource(resource),
        isSaved: savedIds.has(String(resource._id)),
    }));
}

async function verifyRelations(input: {
    courseId: string;
    professorId?: string | null;
}): Promise<{
    course: HydratedDocument<ICourse>;
    professorId?: Types.ObjectId;
}> {
    const courseId = requireObjectId(input.courseId, "courseId");
    const course = await Course.findOne({ _id: courseId, active: true });
    if (!course)
        throw new AppError(
            400,
            "INVALID_COURSE",
            "The selected course is invalid.",
        );
    let professorId: Types.ObjectId | undefined;
    if (input.professorId) {
        const parsedProfessorId = requireObjectId(
            input.professorId,
            "professorId",
        );
        const professor = await Professor.findOne({
            _id: parsedProfessorId,
            status: { $in: ["pending", "approved"] },
        });
        if (!professor)
            throw new AppError(
                400,
                "INVALID_PROFESSOR",
                "The selected professor is invalid.",
            );
        professorId = professor._id;
    }
    return { course, professorId };
}

function buildSearchText(input: {
    title: string;
    description: string;
    topics: string[];
    courseCode: string;
    courseTitle: string;
}): string {
    return normalizeSearch(
        [
            input.title,
            input.description,
            ...input.topics,
            input.courseCode,
            input.courseTitle,
        ].join(" "),
    );
}

function canViewUnapproved(
    resource: HydratedDocument<IResource>,
    user: NonNullable<Express.Request["auth"]>["user"],
): boolean {
    return (
        String(resource.uploaderId) === String(user._id) ||
        user.role === "moderator" ||
        user.role === "admin"
    );
}

export const createResource: RequestHandler = async (request, response) => {
    const user = request.auth?.user;

    if (!user) {
        throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "You must sign in to continue.",
        );
    }

    const uploadedObjectKeys: string[] = [];

    try {
        const input = createResourceSchema.parse(request.body);
        const relations = await verifyRelations({
            courseId: input.courseId,
            professorId: input.professorId,
        });
        const isExternal = input.resourceType === "external_link";

        if (isExternal && !input.externalUrl) {
            throw new AppError(
                400,
                "EXTERNAL_URL_REQUIRED",
                "An external link is required for this resource type.",
            );
        }

        if (!isExternal && !request.file) {
            throw new AppError(400, "PDF_REQUIRED", "A PDF file is required.");
        }

        if (isExternal && request.file) {
            throw new AppError(
                400,
                "UNEXPECTED_FILE",
                "External-link resources cannot include a PDF upload.",
            );
        }

        let fileObjectKey: string | undefined;
        let previewObjectKey: string | undefined;

        if (request.file) {
            const objectDirectory = `resources/${randomUUID()}`;
            fileObjectKey = `${objectDirectory}/document.pdf`;
            previewObjectKey = `${objectDirectory}/preview.png`;

            const preview = await generatePdfPreview(request.file.buffer);
            uploadedObjectKeys.push(fileObjectKey, previewObjectKey);

            await Promise.all([
                uploadObject({
                    key: fileObjectKey,
                    body: request.file.buffer,
                    contentType: "application/pdf",
                }),
                uploadObject({
                    key: previewObjectKey,
                    body: preview,
                    contentType: "image/png",
                }),
            ]);
        }

        const topics = [...new Set(input.topics.map((topic) => topic.trim()))];
        const resource = await Resource.create({
            courseId: relations.course._id,
            professorId: relations.professorId,
            uploaderId: user._id,
            title: input.title,
            description: input.description,
            resourceType: input.resourceType,
            topics,
            normalizedTopics: topics.map(normalizeTopic),
            searchText: buildSearchText({
                title: input.title,
                description: input.description,
                topics,
                courseCode: relations.course.displayCode,
                courseTitle: relations.course.title,
            }),
            storageKind: isExternal ? "external" : "file",
            originalFileName: request.file?.originalname,
            fileObjectKey,
            previewObjectKey,
            mimeType: request.file?.mimetype,
            sizeBytes: request.file?.size,
            externalUrl: input.externalUrl,
            status: "pending",
            helpfulCount: 0,
        });

        response.status(201).json({ resource: cleanResource(resource) });
    } catch (error) {
        await deleteObjects(uploadedObjectKeys).catch((cleanupError) => {
            console.error("Failed to clean up R2 objects after upload error.", {
                uploadedObjectKeys,
                cleanupError,
            });
        });

        throw error;
    }
};

export const listResources: RequestHandler = async (request, response) => {
    const user = request.auth?.user;

    if (!user) {
        throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "You must sign in to continue.",
        );
    }

    const input = listResourcesSchema.parse(request.query);
    const filter: Record<string, unknown> = {
        status: "approved",
    };

    if (input.q) {
        filter.searchText = {
            $regex: escapeRegex(normalizeSearch(input.q)),
            $options: "i",
        };
    }

    if (input.courseId) {
        filter.courseId = requireObjectId(input.courseId, "courseId");
    }

    if (input.professorId) {
        filter.professorId = requireObjectId(input.professorId, "professorId");
    }

    if (input.resourceType) {
        filter.resourceType = input.resourceType;
    }

    if (input.topic) {
        filter.normalizedTopics = normalizeTopic(input.topic);
    }

    const sort: Record<string, 1 | -1> =
        input.sort === "oldest"
            ? { publishedAt: 1 }
            : input.sort === "helpful"
              ? { helpfulCount: -1, publishedAt: -1 }
              : { publishedAt: -1 };

    const skip = (input.page - 1) * input.limit;

    const [resourceDocuments, total] = await Promise.all([
        Resource.find(filter)
            .populate("courseId", "displayCode title")
            .populate("professorId", "displayName")
            .populate("uploaderId", "firstName lastName")
            .sort(sort)
            .skip(skip)
            .limit(input.limit),
        Resource.countDocuments(filter),
    ]);

    const resources = await addSavedState(resourceDocuments, user._id);

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

export const listMyResources: RequestHandler = async (request, response) => {
    const user = request.auth?.user;

    if (!user) {
        throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "You must sign in to continue.",
        );
    }

    const resourceDocuments = await Resource.find({
        uploaderId: user._id,
    })
        .populate("courseId", "displayCode title")
        .populate("professorId", "displayName")
        .sort({ createdAt: -1 });

    const resources = await addSavedState(resourceDocuments, user._id);

    response.json({ resources });
};

export const getResource: RequestHandler = async (request, response) => {
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
    const resource = await Resource.findById(resourceId);
    if (
        !resource ||
        (resource.status !== "approved" && !canViewUnapproved(resource, user))
    )
        throw new AppError(
            404,
            "RESOURCE_NOT_FOUND",
            "The resource could not be found.",
        );
    const [course, professor, saved, helpful] = await Promise.all([
        Course.findById(resource.courseId).select(
            "displayCode title description",
        ),
        resource.professorId
            ? Professor.findById(resource.professorId).select(
                  "displayName status",
              )
            : null,
        SavedResource.exists({ userId: user._id, resourceId: resource._id }),
        HelpfulResource.exists({ userId: user._id, resourceId: resource._id }),
    ]);
    response.json({
        resource: cleanResource(resource),
        course,
        professor,
        saved: Boolean(saved),
        markedHelpful: Boolean(helpful),
    });
};

export const openResourceFile: RequestHandler = async (request, response) => {
    const user = request.auth?.user;

    if (!user) {
        throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "You must sign in to continue.",
        );
    }

    const resourceId = requireObjectId(
        routeParam(request.params.resourceId, "resourceId"),
        "resourceId",
    );
    const resource = await Resource.findById(resourceId).select(
        "+fileObjectKey +previewObjectKey",
    );

    if (
        !resource ||
        (resource.status !== "approved" && !canViewUnapproved(resource, user))
    ) {
        throw new AppError(
            404,
            "RESOURCE_NOT_FOUND",
            "The resource could not be found.",
        );
    }

    if (resource.storageKind !== "file" || !resource.fileObjectKey) {
        throw new AppError(
            404,
            "RESOURCE_FILE_NOT_FOUND",
            "The uploaded PDF is not available in object storage.",
        );
    }

    const object = await getObject(resource.fileObjectKey);

    if (!object) {
        throw new AppError(
            404,
            "RESOURCE_FILE_NOT_FOUND",
            "The uploaded PDF could not be found.",
        );
    }

    response.setHeader(
        "Content-Type",
        object.contentType ?? resource.mimeType ?? "application/pdf",
    );
    response.setHeader(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(
            resource.originalFileName ?? "resource.pdf",
        )}`,
    );
    response.setHeader("Cache-Control", "private, max-age=3600");

    if (object.contentLength !== undefined) {
        response.setHeader("Content-Length", String(object.contentLength));
    }

    await pipeline(object.body, response);
};

export const openResourcePreview: RequestHandler = async (
    request,
    response,
) => {
    const user = request.auth?.user;

    if (!user) {
        throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "You must sign in to continue.",
        );
    }

    const resourceId = requireObjectId(
        routeParam(request.params.resourceId, "resourceId"),
        "resourceId",
    );
    const resource = await Resource.findById(resourceId).select(
        "+fileObjectKey +previewObjectKey",
    );

    if (
        !resource ||
        (resource.status !== "approved" && !canViewUnapproved(resource, user))
    ) {
        throw new AppError(
            404,
            "RESOURCE_NOT_FOUND",
            "The resource could not be found.",
        );
    }

    if (resource.storageKind !== "file" || !resource.previewObjectKey) {
        throw new AppError(
            404,
            "PREVIEW_NOT_FOUND",
            "This resource does not have a stored preview.",
        );
    }

    const object = await getObject(resource.previewObjectKey);

    if (!object) {
        throw new AppError(
            404,
            "PREVIEW_NOT_FOUND",
            "The resource preview could not be found.",
        );
    }

    response.setHeader("Content-Type", object.contentType ?? "image/png");
    response.setHeader("Cache-Control", "private, max-age=86400");

    if (object.contentLength !== undefined) {
        response.setHeader("Content-Length", String(object.contentLength));
    }

    await pipeline(object.body, response);
};

export const updateResource: RequestHandler = async (request, response) => {
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
    const input = updateResourceSchema.parse(request.body);
    const resource = await Resource.findById(resourceId);
    if (!resource)
        throw new AppError(
            404,
            "RESOURCE_NOT_FOUND",
            "The resource could not be found.",
        );
    if (
        String(resource.uploaderId) !== String(user._id) &&
        user.role === "member"
    )
        throw new AppError(
            403,
            "INSUFFICIENT_PERMISSION",
            "You cannot edit this resource.",
        );
    if (
        user.role === "member" &&
        !["pending", "changes_requested", "rejected"].includes(resource.status)
    )
        throw new AppError(
            400,
            "RESOURCE_NOT_EDITABLE",
            "This resource cannot currently be edited.",
        );
    const course = await Course.findById(resource.courseId);
    if (!course)
        throw new AppError(
            400,
            "INVALID_COURSE",
            "The resource course is unavailable.",
        );
    if (input.professorId !== undefined) {
        resource.professorId =
            input.professorId === null
                ? undefined
                : (
                      await verifyRelations({
                          courseId: String(resource.courseId),
                          professorId: input.professorId,
                      })
                  ).professorId;
    }
    if (input.title !== undefined) resource.title = input.title;
    if (input.description !== undefined)
        resource.description = input.description;
    if (input.resourceType !== undefined) {
        const changesStorageKind =
            (resource.storageKind === "file" &&
                input.resourceType === "external_link") ||
            (resource.storageKind === "external" &&
                input.resourceType !== "external_link");
        if (changesStorageKind)
            throw new AppError(
                400,
                "STORAGE_KIND_CHANGE_NOT_ALLOWED",
                "Create a new submission to change between PDF and external-link resources.",
            );
        resource.resourceType = input.resourceType;
    }
    if (input.topics !== undefined) {
        resource.topics = [...new Set(input.topics)];
        resource.normalizedTopics = resource.topics.map(normalizeTopic);
    }
    if (input.externalUrl !== undefined) {
        if (resource.storageKind !== "external")
            throw new AppError(
                400,
                "EXTERNAL_URL_NOT_ALLOWED",
                "PDF resources cannot have an external URL.",
            );
        resource.externalUrl = input.externalUrl ?? undefined;
    }
    if (resource.storageKind === "external" && !resource.externalUrl)
        throw new AppError(
            400,
            "EXTERNAL_URL_REQUIRED",
            "An external URL is required.",
        );
    resource.searchText = buildSearchText({
        title: resource.title,
        description: resource.description,
        topics: resource.topics,
        courseCode: course.displayCode,
        courseTitle: course.title,
    });
    resource.status = user.role === "member" ? "pending" : resource.status;
    resource.moderationNote = undefined;
    await resource.save();
    response.json({ resource: cleanResource(resource) });
};

export const deleteResource: RequestHandler = async (request, response) => {
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
    const resource = await Resource.findById(resourceId).select(
        "+fileObjectKey +previewObjectKey",
    );
    if (!resource)
        throw new AppError(
            404,
            "RESOURCE_NOT_FOUND",
            "The resource could not be found.",
        );
    if (
        String(resource.uploaderId) !== String(user._id) &&
        user.role === "member"
    )
        throw new AppError(
            403,
            "INSUFFICIENT_PERMISSION",
            "You cannot delete this resource.",
        );
    if (
        user.role === "member" &&
        !["pending", "changes_requested", "rejected"].includes(resource.status)
    )
        throw new AppError(
            400,
            "RESOURCE_NOT_DELETABLE",
            "This resource cannot currently be deleted.",
        );
    await Promise.all([
        Resource.deleteOne({ _id: resource._id }),
        SavedResource.deleteMany({ resourceId: resource._id }),
        HelpfulResource.deleteMany({ resourceId: resource._id }),
    ]);
    const objectKeys = [
        resource.fileObjectKey,
        resource.previewObjectKey,
    ].filter((key): key is string => Boolean(key));

    await deleteObjects(objectKeys).catch((error) => {
        console.error("Failed to delete R2 objects for resource.", {
            resourceId: String(resource._id),
            objectKeys,
            error,
        });
    });

    response.status(204).send();
};

export const saveResource: RequestHandler = async (request, response) => {
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
    if (!(await Resource.exists({ _id: resourceId, status: "approved" })))
        throw new AppError(
            404,
            "RESOURCE_NOT_FOUND",
            "The resource could not be found.",
        );
    await SavedResource.updateOne(
        { userId: user._id, resourceId },
        { $setOnInsert: { userId: user._id, resourceId } },
        { upsert: true },
    );
    response.status(204).send();
};

export const unsaveResource: RequestHandler = async (request, response) => {
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
    await SavedResource.deleteOne({ userId: user._id, resourceId });
    response.status(204).send();
};

export const listSavedResources: RequestHandler = async (request, response) => {
    const user = request.auth?.user;

    if (!user) {
        throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "You must sign in to continue.",
        );
    }

    const saved = await SavedResource.find({
        userId: user._id,
    }).sort({ createdAt: -1 });

    const order = new Map(
        saved.map((item, index) => [String(item.resourceId), index]),
    );

    const resourceDocuments = await Resource.find({
        _id: {
            $in: saved.map((item) => item.resourceId),
        },
        status: "approved",
    })
        .populate("courseId", "displayCode title")
        .populate("professorId", "displayName");

    resourceDocuments.sort(
        (a, b) =>
            (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0),
    );

    const resources = resourceDocuments.map((resource) => ({
        ...cleanResource(resource),
        isSaved: true,
    }));

    response.json({ resources });
};

export const markHelpful: RequestHandler = async (request, response) => {
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
    const resource = await Resource.findOne({
        _id: resourceId,
        status: "approved",
    });
    if (!resource)
        throw new AppError(
            404,
            "RESOURCE_NOT_FOUND",
            "The resource could not be found.",
        );
    if (!(await HelpfulResource.exists({ userId: user._id, resourceId }))) {
        await HelpfulResource.create({ userId: user._id, resourceId });
        resource.helpfulCount += 1;
        await resource.save();
    }
    response.json({ helpfulCount: resource.helpfulCount, markedHelpful: true });
};

export const unmarkHelpful: RequestHandler = async (request, response) => {
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
    const removed = await HelpfulResource.findOneAndDelete({
        userId: user._id,
        resourceId,
    });
    const resource = removed
        ? await Resource.findByIdAndUpdate(
              resourceId,
              { $inc: { helpfulCount: -1 } },
              { new: true },
          )
        : await Resource.findById(resourceId);
    if (!resource)
        throw new AppError(
            404,
            "RESOURCE_NOT_FOUND",
            "The resource could not be found.",
        );
    if (resource.helpfulCount < 0) {
        resource.helpfulCount = 0;
        await resource.save();
    }
    response.json({
        helpfulCount: resource.helpfulCount,
        markedHelpful: false,
    });
};
