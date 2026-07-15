import { useMutation } from "@tanstack/react-query";
import {
    ClipboardList,
    LogOut,
    Save,
    ShieldCheck,
    UserCog,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button, Card, Field, Input, PageHeader } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { ApiError, request } from "../lib/api";
import { ROLE_LABELS } from "../lib/constants";
import type { User } from "../types";

export function ProfilePage() {
    const { user, setUser, logout, logoutAll } = useAuth();
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState(user?.firstName || "");
    const [lastName, setLastName] = useState(user?.lastName || "");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [profileError, setProfileError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [isSigningOutEverywhere, setIsSigningOutEverywhere] = useState(false);

    const profileMutation = useMutation({
        mutationFn: () =>
            request<{ user: User }>("/auth/me", {
                method: "PATCH",
                body: JSON.stringify({ firstName, lastName }),
            }),
    });
    const passwordMutation = useMutation({
        mutationFn: () =>
            request<{ message: string }>("/auth/change-password", {
                method: "POST",
                body: JSON.stringify({ currentPassword, newPassword }),
            }),
    });

    if (!user) return null;

    const saveProfile = async (event: FormEvent) => {
        event.preventDefault();
        setProfileError("");
        try {
            const result = await profileMutation.mutateAsync();
            setUser(result.user);
            toast.success("Profile updated.");
        } catch (error) {
            setProfileError(
                error instanceof ApiError
                    ? error.message
                    : "Your profile could not be updated.",
            );
        }
    };

    const changePassword = async (event: FormEvent) => {
        event.preventDefault();
        setPasswordError("");
        if (newPassword.length < 10) {
            setPasswordError(
                "Use at least 10 characters for the new password.",
            );
            return;
        }
        try {
            await passwordMutation.mutateAsync();
            setCurrentPassword("");
            setNewPassword("");
            toast.success("Password changed.");
        } catch (error) {
            setPasswordError(
                error instanceof ApiError
                    ? error.message
                    : "Your password could not be changed.",
            );
        }
    };

    const signOut = async () => {
        try {
            await logout();
            navigate("/login", { replace: true });
        } catch (error) {
            toast.error(
                error instanceof ApiError
                    ? error.message
                    : "Could not sign out.",
            );
        }
    };

    const signOutEverywhere = async () => {
        setIsSigningOutEverywhere(true);

        try {
            await logoutAll();
            navigate("/login", { replace: true });
        } catch (error) {
            toast.error(
                error instanceof ApiError
                    ? error.message
                    : "Could not sign out all sessions.",
            );
        } finally {
            setIsSigningOutEverywhere(false);
        }
    };

    return (
        <div className="page">
            <PageHeader
                title="Profile"
                description={`${ROLE_LABELS[user.role]} account · ${user.email}`}
            />

            <div className="profile-layout">
                <div className="profile-main">
                    <Card className="profile-card">
                        <h2>Personal information</h2>
                        <form className="form-stack" onSubmit={saveProfile}>
                            <div className="two-column-fields">
                                <Field label="First name">
                                    <Input
                                        value={firstName}
                                        onChange={(event) =>
                                            setFirstName(event.target.value)
                                        }
                                        required
                                    />
                                </Field>
                                <Field label="Last name">
                                    <Input
                                        value={lastName}
                                        onChange={(event) =>
                                            setLastName(event.target.value)
                                        }
                                        required
                                    />
                                </Field>
                            </div>
                            {profileError ? (
                                <div className="form-alert error">
                                    {profileError}
                                </div>
                            ) : null}
                            <div>
                                <Button
                                    type="submit"
                                    loading={profileMutation.isPending}
                                >
                                    <Save size={17} /> Save changes
                                </Button>
                            </div>
                        </form>
                    </Card>

                    <Card className="profile-card">
                        <h2>Change password</h2>
                        <form className="form-stack" onSubmit={changePassword}>
                            <Field label="Current password">
                                <Input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(event) =>
                                        setCurrentPassword(event.target.value)
                                    }
                                    required
                                />
                            </Field>
                            <Field
                                label="New password"
                                hint="Use at least 10 characters."
                            >
                                <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(event) =>
                                        setNewPassword(event.target.value)
                                    }
                                    required
                                />
                            </Field>
                            {passwordError ? (
                                <div className="form-alert error">
                                    {passwordError}
                                </div>
                            ) : null}
                            <div>
                                <Button
                                    type="submit"
                                    loading={passwordMutation.isPending}
                                >
                                    Change password
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>

                <aside className="profile-sidebar">
                    <Card>
                        <h2>Your study bank</h2>
                        <div className="profile-links">
                            <Link to="/submissions">
                                <ClipboardList size={20} />
                                <span>
                                    <strong>Your submissions</strong>
                                    <small>Track review status</small>
                                </span>
                            </Link>
                            {user.role === "moderator" ||
                            user.role === "admin" ? (
                                <Link to="/moderation">
                                    <ShieldCheck size={20} />
                                    <span>
                                        <strong>Moderation center</strong>
                                        <small>
                                            Review resources and reports
                                        </small>
                                    </span>
                                </Link>
                            ) : null}
                            {user.role === "admin" ? (
                                <Link to="/admin">
                                    <UserCog size={20} />
                                    <span>
                                        <strong>Administrator tools</strong>
                                        <small>
                                            Invites, members, and audit log
                                        </small>
                                    </span>
                                </Link>
                            ) : null}
                        </div>
                    </Card>
                    <Card>
                        <h2>Sessions</h2>
                        <div className="form-stack">
                            <Button
                                variant="secondary"
                                onClick={() => void signOut()}
                            >
                                <LogOut size={17} /> Sign out
                            </Button>
                            <Button
                                variant="ghost"
                                loading={isSigningOutEverywhere}
                                onClick={() => void signOutEverywhere()}
                            >
                                Sign out on all devices
                            </Button>
                        </div>
                    </Card>
                </aside>
            </div>
        </div>
    );
}
