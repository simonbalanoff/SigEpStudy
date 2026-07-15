import type { RequestHandler } from "express";

import { env } from "../../config/env.js";
import { recordAuditEvent } from "../../services/audit.js";
import { AppError } from "../../utils/app-error.js";
import { createToken, hashToken } from "../../utils/crypto.js";
import { requireObjectId } from "../../utils/object-id.js";
import { parsePagination } from "../../utils/pagination.js";
import { routeParam } from "../../utils/route-param.js";
import { User } from "../auth/user.model.js";
import { Invitation } from "./invitation.model.js";
import {
  createInvitationSchema,
  updateUserSchema
} from "./invitation.schemas.js";

function activeInvitationFilter(
  tokenHash: string
): Record<string, unknown> {
  const now = new Date();

  return {
    tokenHash,
    active: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: now } }
    ]
  };
}

export const resolveInvitation: RequestHandler = async (
  request,
  response
) => {
  const token = routeParam(
    request.params.token,
    "token"
  );

  const invitation = await Invitation.findOne(
    activeInvitationFilter(hashToken(token))
  ).select("label expiresAt");

  if (!invitation) {
    throw new AppError(
      404,
      "INVITATION_INVALID",
      "This invitation link is invalid, expired, or deactivated."
    );
  }

  response.json({
    invitation: {
      valid: true,
      label: invitation.label,
      expiresAt: invitation.expiresAt
    }
  });
};

export const listInvitations: RequestHandler = async (
  _request,
  response
) => {
  const invitations = await Invitation.find()
    .select("-tokenHash")
    .populate(
      "createdBy",
      "firstName lastName email"
    )
    .populate(
      "lastUsedBy",
      "firstName lastName email"
    )
    .sort({ createdAt: -1 });

  response.json({ invitations });
};

export const createInvitation: RequestHandler = async (
  request,
  response
) => {
  const user = request.auth?.user;

  if (!user) {
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "You must sign in to continue."
    );
  }

  const input = createInvitationSchema.parse(
    request.body
  );

  const token = createToken(32);

  const invitation = await Invitation.create({
    tokenHash: hashToken(token),
    label: input.label,
    active: true,
    expiresAt: input.expiresAt
      ? new Date(input.expiresAt)
      : undefined,
    createdBy: user._id,
    useCount: 0
  });

  await recordAuditEvent({
    actorId: user._id,
    action: "invitation.created",
    targetType: "Invitation",
    targetId: invitation._id,
    metadata: {
      label: invitation.label,
      expiresAt: invitation.expiresAt,
      reusable: true
    }
  });

  response.status(201).json({
    invitation: {
      id: String(invitation._id),
      label: invitation.label,
      active: invitation.active,
      expiresAt: invitation.expiresAt,
      useCount: invitation.useCount,
      createdAt: invitation.createdAt,
      inviteUrl: `${env.APP_URL.replace(
        /\/$/,
        ""
      )}/register/${token}`
    }
  });
};

export const deactivateInvitation: RequestHandler =
  async (request, response) => {
    const user = request.auth?.user;

    if (!user) {
      throw new AppError(
        401,
        "AUTHENTICATION_REQUIRED",
        "You must sign in to continue."
      );
    }

    const invitationId = requireObjectId(
      routeParam(
        request.params.invitationId,
        "invitationId"
      ),
      "invitationId"
    );

    const invitation =
      await Invitation.findOneAndUpdate(
        {
          _id: invitationId,
          active: true
        },
        {
          active: false
        },
        {
          new: true
        }
      ).select("-tokenHash");

    if (!invitation) {
      throw new AppError(
        404,
        "INVITATION_NOT_FOUND",
        "The invitation could not be found or is already inactive."
      );
    }

    await recordAuditEvent({
      actorId: user._id,
      action: "invitation.deactivated",
      targetType: "Invitation",
      targetId: invitation._id
    });

    response.json({ invitation });
  };

export const listUsers: RequestHandler = async (
  request,
  response
) => {
  const { page, limit, skip } = parsePagination(
    request.query
  );

  const [users, total] = await Promise.all([
    User.find()
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments()
  ]);

  response.json({
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
};

export const updateUser: RequestHandler = async (
  request,
  response
) => {
  const actor = request.auth?.user;

  if (!actor) {
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "You must sign in to continue."
    );
  }

  const targetId = requireObjectId(
    routeParam(request.params.userId, "userId"),
    "userId"
  );

  const input = updateUserSchema.parse(
    request.body
  );

  const target = await User.findById(targetId);

  if (!target) {
    throw new AppError(
      404,
      "USER_NOT_FOUND",
      "The user could not be found."
    );
  }

  if (
    String(target._id) === String(actor._id) &&
    input.status === "suspended"
  ) {
    throw new AppError(
      400,
      "CANNOT_SUSPEND_SELF",
      "You cannot suspend your own account."
    );
  }

  if (
    target.role === "admin" &&
    input.role &&
    input.role !== "admin"
  ) {
    const adminCount = await User.countDocuments({
      role: "admin",
      status: "active"
    });

    if (adminCount <= 1) {
      throw new AppError(
        400,
        "LAST_ADMIN",
        "The study bank must retain at least one active administrator."
      );
    }
  }

  if (input.role) {
    target.role = input.role;
  }

  if (input.status) {
    target.status = input.status;
  }

  await target.save();

  await recordAuditEvent({
    actorId: actor._id,
    action: "user.updated",
    targetType: "User",
    targetId: target._id,
    metadata: input
  });

  response.json({ user: target });
};