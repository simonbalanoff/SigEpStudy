import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Clipboard,
    Link2,
    ScrollText,
    UserCog,
    Users,
    XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
    Button,
    Card,
    EmptyState,
    Field,
    Input,
    LoadingState,
    Modal,
    PageHeader,
    PaginationControls,
    Select,
    StatusBadge,
} from "../components/ui";
import { ApiError, queryString, request } from "../lib/api";
import { actionLabel, formatDateTime, fullName, getId } from "../lib/format";
import { ROLE_LABELS } from "../lib/constants";
import type {
    AuditEvent,
    Invitation,
    Pagination,
    User,
    UserRole,
    UserStatus,
} from "../types";

type AdminTab = "invites" | "members" | "audit";

export function AdminPage() {
    const [tab, setTab] = useState<AdminTab>("invites");

    return (
        <div className="page">
            <PageHeader
                title="Administrator tools"
                description="Manage access and membership for the Colorado Gamma Study Bank."
            />
            <div className="tab-bar" role="tablist">
                <button
                    className={tab === "invites" ? "active" : ""}
                    onClick={() => setTab("invites")}
                >
                    <Link2 size={18} /> Invite links
                </button>
                <button
                    className={tab === "members" ? "active" : ""}
                    onClick={() => setTab("members")}
                >
                    <Users size={18} /> Members
                </button>
                <button
                    className={tab === "audit" ? "active" : ""}
                    onClick={() => setTab("audit")}
                >
                    <ScrollText size={18} /> Audit log
                </button>
            </div>
            {tab === "invites" ? <InvitationsPanel /> : null}
            {tab === "members" ? <MembersPanel /> : null}
            {tab === "audit" ? <AuditPanel /> : null}
        </div>
    );
}

function InvitationsPanel() {
    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [label, setLabel] = useState("");
    const [expiresAt, setExpiresAt] = useState("");
    const [newInvite, setNewInvite] = useState<Invitation | null>(null);
    const [error, setError] = useState("");

    const invitationsQuery = useQuery({
        queryKey: ["admin", "invitations"],
        queryFn: () =>
            request<{ invitations: Invitation[] }>("/admin/invitations"),
    });

    const createMutation = useMutation({
        mutationFn: () =>
            request<{ invitation: Invitation }>("/admin/invitations", {
                method: "POST",
                body: JSON.stringify({
                    label: label.trim() || undefined,
                    expiresAt: expiresAt
                        ? new Date(expiresAt).toISOString()
                        : undefined,
                }),
            }),
    });

    const deactivateMutation = useMutation({
        mutationFn: (id: string) =>
            request<{ invitation: Invitation }>(
                `/admin/invitations/${id}/deactivate`,
                {
                    method: "PATCH",
                },
            ),
    });

    const createInvite = async () => {
        setError("");

        try {
            const result = await createMutation.mutateAsync();

            setNewInvite(result.invitation);
            setLabel("");
            setExpiresAt("");

            await queryClient.invalidateQueries({
                queryKey: ["admin", "invitations"],
            });
        } catch (nextError) {
            setError(
                nextError instanceof ApiError
                    ? nextError.message
                    : "The invite link could not be created.",
            );
        }
    };

    const deactivate = async (id: string) => {
        try {
            await deactivateMutation.mutateAsync(id);

            await queryClient.invalidateQueries({
                queryKey: ["admin", "invitations"],
            });

            toast.success("Invite link deactivated.");
        } catch (nextError) {
            toast.error(
                nextError instanceof ApiError
                    ? nextError.message
                    : "The invite link could not be deactivated.",
            );
        }
    };

    const copyLink = async () => {
        if (!newInvite?.inviteUrl) {
            return;
        }

        await navigator.clipboard.writeText(newInvite.inviteUrl);

        toast.success("Invite link copied.");
    };

    return (
        <section className="admin-panel">
            <div className="panel-toolbar">
                <div>
                    <h2>Invite links</h2>
                    <p>Create reusable signup links for chapter members.</p>
                </div>

                <Button
                    onClick={() => {
                        setCreateOpen(true);
                        setNewInvite(null);
                        setError("");
                    }}
                >
                    <Link2 size={18} />
                    Create invite link
                </Button>
            </div>

            {invitationsQuery.isLoading ? (
                <LoadingState label="Loading invitations" />
            ) : null}

            {!invitationsQuery.isLoading &&
            invitationsQuery.data?.invitations.length === 0 ? (
                <EmptyState
                    icon={<Link2 size={28} />}
                    title="No invite links yet"
                    description="Create a reusable private signup link for chapter members."
                />
            ) : null}

            {invitationsQuery.data?.invitations.length ? (
                <Card className="table-card">
                    <div className="responsive-table invitations-table">
                        <div className="table-head">
                            <span>Name</span>
                            <span>Status</span>
                            <span>Created</span>
                            <span>Signups</span>
                            <span></span>
                        </div>

                        {invitationsQuery.data.invitations.map((invitation) => {
                            const id = getId(invitation);

                            const expired = Boolean(
                                invitation.expiresAt &&
                                new Date(invitation.expiresAt) <= new Date(),
                            );

                            const status = !invitation.active
                                ? "inactive"
                                : expired
                                  ? "expired"
                                  : "active";

                            return (
                                <div className="table-row" key={id}>
                                    <span data-label="Name">
                                        <strong>
                                            {invitation.label ||
                                                "Unnamed invite"}
                                        </strong>

                                        {invitation.expiresAt ? (
                                            <small>
                                                Expires{" "}
                                                {formatDateTime(
                                                    invitation.expiresAt,
                                                )}
                                            </small>
                                        ) : (
                                            <small>No expiration</small>
                                        )}
                                    </span>

                                    <span data-label="Status">
                                        <StatusBadge status={status} />
                                    </span>

                                    <span data-label="Created">
                                        {formatDateTime(invitation.createdAt)}
                                    </span>

                                    <span data-label="Signups">
                                        {invitation.useCount ?? 0}
                                    </span>

                                    <span className="table-actions">
                                        {status === "active" ? (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                loading={
                                                    deactivateMutation.isPending
                                                }
                                                onClick={() =>
                                                    void deactivate(id)
                                                }
                                            >
                                                <XCircle size={16} />
                                                Deactivate
                                            </Button>
                                        ) : null}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            ) : null}

            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title={newInvite ? "Invite link created" : "Create invite link"}
                description={
                    newInvite
                        ? "Copy this link now. It will not be shown again after you close this window."
                        : "Anyone with this link can create an account until it expires or is deactivated."
                }
            >
                {newInvite?.inviteUrl ? (
                    <div className="form-stack">
                        <div className="copy-link-box">
                            <span>{newInvite.inviteUrl}</span>

                            <Button size="sm" onClick={() => void copyLink()}>
                                <Clipboard size={16} />
                                Copy
                            </Button>
                        </div>

                        <div className="form-alert success">
                            This link can be used by multiple chapter members
                            {newInvite.expiresAt
                                ? ` until ${formatDateTime(
                                      newInvite.expiresAt,
                                  )}`
                                : " until it is manually deactivated"}
                            .
                        </div>

                        <div className="modal-actions">
                            <Button onClick={() => setCreateOpen(false)}>
                                Done
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="form-stack">
                        <Field
                            label="Invite link name"
                            hint="Optional. Use a name that describes the group or signup period."
                        >
                            <Input
                                value={label}
                                onChange={(event) =>
                                    setLabel(event.target.value)
                                }
                                placeholder="Example: Fall 2026 chapter signup"
                            />
                        </Field>

                        <Field
                            label="Expiration"
                            hint="Optional. Leave blank for no expiration."
                        >
                            <Input
                                type="datetime-local"
                                value={expiresAt}
                                onChange={(event) =>
                                    setExpiresAt(event.target.value)
                                }
                            />
                        </Field>

                        {error ? (
                            <div className="form-alert error">{error}</div>
                        ) : null}

                        <div className="modal-actions">
                            <Button
                                variant="ghost"
                                onClick={() => setCreateOpen(false)}
                            >
                                Cancel
                            </Button>

                            <Button
                                loading={createMutation.isPending}
                                onClick={() => void createInvite()}
                            >
                                Create link
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </section>
    );
}

function MembersPanel() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const usersQuery = useQuery({
        queryKey: ["admin", "users", page],
        queryFn: () =>
            request<{ users: User[]; pagination: Pagination }>(
                `/admin/users${queryString({ page, limit: 30 })}`,
            ),
    });
    const updateMutation = useMutation({
        mutationFn: ({
            id,
            input,
        }: {
            id: string;
            input: { role?: UserRole; status?: UserStatus };
        }) =>
            request<{ user: User }>(`/admin/users/${id}`, {
                method: "PATCH",
                body: JSON.stringify(input),
            }),
    });

    const updateUser = async (
        user: User,
        input: { role?: UserRole; status?: UserStatus },
    ) => {
        try {
            await updateMutation.mutateAsync({ id: getId(user), input });
            await queryClient.invalidateQueries({
                queryKey: ["admin", "users"],
            });
            toast.success("Member updated.");
        } catch (error) {
            toast.error(
                error instanceof ApiError
                    ? error.message
                    : "The member could not be updated.",
            );
        }
    };

    return (
        <section className="admin-panel">
            <div className="panel-toolbar">
                <div>
                    <h2>Members</h2>
                    <p>Manage roles and suspend access when needed.</p>
                </div>
            </div>
            {usersQuery.isLoading ? (
                <LoadingState label="Loading members" />
            ) : null}
            {usersQuery.data?.users.length ? (
                <Card className="table-card">
                    <div className="responsive-table members-table">
                        <div className="table-head">
                            <span>Member</span>
                            <span>Role</span>
                            <span>Status</span>
                            <span>Joined</span>
                        </div>
                        {usersQuery.data.users.map((member) => (
                            <div className="table-row" key={getId(member)}>
                                <span data-label="Member">
                                    <strong>{fullName(member)}</strong>
                                    <small>{member.email}</small>
                                </span>
                                <span data-label="Role">
                                    <Select
                                        value={member.role}
                                        onChange={(event) =>
                                            void updateUser(member, {
                                                role: event.target
                                                    .value as UserRole,
                                            })
                                        }
                                    >
                                        {Object.entries(ROLE_LABELS).map(
                                            ([value, label]) => (
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </option>
                                            ),
                                        )}
                                    </Select>
                                </span>
                                <span data-label="Status">
                                    <Select
                                        value={member.status}
                                        onChange={(event) =>
                                            void updateUser(member, {
                                                status: event.target
                                                    .value as UserStatus,
                                            })
                                        }
                                    >
                                        <option value="active">Active</option>
                                        <option value="suspended">
                                            Suspended
                                        </option>
                                    </Select>
                                </span>
                                <span data-label="Joined">
                                    {formatDateTime(member.createdAt)}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            ) : null}
            <PaginationControls
                page={page}
                pages={usersQuery.data?.pagination.pages ?? 1}
                onChange={setPage}
            />
        </section>
    );
}

function AuditPanel() {
    const [page, setPage] = useState(1);
    const auditQuery = useQuery({
        queryKey: ["admin", "audit", page],
        queryFn: () =>
            request<{ events: AuditEvent[]; pagination: Pagination }>(
                `/moderation/audit${queryString({ page, limit: 40 })}`,
            ),
    });

    return (
        <section className="admin-panel">
            <div className="panel-toolbar">
                <div>
                    <h2>Audit log</h2>
                    <p>
                        A record of important administrative and moderation
                        actions.
                    </p>
                </div>
            </div>
            {auditQuery.isLoading ? (
                <LoadingState label="Loading audit history" />
            ) : null}
            {!auditQuery.isLoading && auditQuery.data?.events.length === 0 ? (
                <EmptyState
                    icon={<ScrollText size={28} />}
                    title="No audit activity"
                    description="Administrative actions will appear here."
                />
            ) : null}
            {auditQuery.data?.events.length ? (
                <Card className="audit-list">
                    {auditQuery.data.events.map((event) => (
                        <div className="audit-row" key={event._id}>
                            <span className="audit-icon">
                                <UserCog size={18} />
                            </span>
                            <span>
                                <strong>{actionLabel(event.action)}</strong>
                                <small>
                                    {fullName(event.actorId)} ·{" "}
                                    {event.targetType}
                                </small>
                            </span>
                            <time>{formatDateTime(event.createdAt)}</time>
                        </div>
                    ))}
                </Card>
            ) : null}
            <PaginationControls
                page={page}
                pages={auditQuery.data?.pagination.pages ?? 1}
                onChange={setPage}
            />
        </section>
    );
}
