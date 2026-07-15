import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, LockKeyhole, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { Brand } from "../components/Brand";
import { Button, Card, Field, Input, LoadingState } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { ApiError, request } from "../lib/api";
import { formatDate } from "../lib/format";

const loginSchema = z.object({
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(1, "Enter your password."),
});

const registrationSchema = z
    .object({
        firstName: z.string().trim().min(1, "Enter your first name."),
        lastName: z.string().trim().min(1, "Enter your last name."),
        email: z.string().email("Enter a valid email address."),
        password: z.string().min(10, "Use at least 10 characters."),
        confirmPassword: z.string(),
    })
    .refine((value) => value.password === value.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

const forgotSchema = z.object({
    email: z.string().email("Enter a valid email address."),
});
const resetSchema = z
    .object({
        password: z.string().min(10, "Use at least 10 characters."),
        confirmPassword: z.string(),
    })
    .refine((value) => value.password === value.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

type LoginValues = z.infer<typeof loginSchema>;
type RegistrationValues = z.infer<typeof registrationSchema>;
type ForgotValues = z.infer<typeof forgotSchema>;
type ResetValues = z.infer<typeof resetSchema>;

function AuthLayout({
    children,
    message,
}: {
    children: React.ReactNode;
    message: string;
}) {
    return (
        <main className="auth-page">
            <section className="auth-brand-panel">
                <Brand />
                <div className="auth-copy">
                    <span className="eyebrow">
                        Colorado Gamma · Colorado State University
                    </span>
                    <h1>Study smarter. Share what helps.</h1>
                    <p>{message}</p>
                    <div className="auth-points">
                        <span>
                            <CheckCircle2 size={18} /> Resources organized by
                            course
                        </span>
                        <span>
                            <CheckCircle2 size={18} /> Every submission is
                            reviewed
                        </span>
                        <span>
                            <CheckCircle2 size={18} /> Private to invited
                            members
                        </span>
                    </div>
                </div>
            </section>
            <section className="auth-form-panel">{children}</section>
        </main>
    );
}

export function LoginPage() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    if (user) return <Navigate to="/" replace />;

    const submit = form.handleSubmit(async (values) => {
        try {
            await login(values.email, values.password);
            navigate("/", { replace: true });
        } catch (error) {
            form.setError("root", {
                message:
                    error instanceof ApiError
                        ? error.message
                        : "Sign in failed.",
            });
        }
    });

    return (
        <AuthLayout message="A simple, private library of notes, guides, and practice materials shared by Colorado Gamma members.">
            <Card className="auth-card">
                <div className="auth-card-heading">
                    <h2>Welcome back</h2>
                    <p>Sign in to access the study bank.</p>
                </div>
                <form onSubmit={submit} className="form-stack">
                    <Field
                        label="Email"
                        error={form.formState.errors.email?.message}
                    >
                        <div className="input-with-icon">
                            <Mail size={18} />
                            <Input
                                type="email"
                                autoComplete="email"
                                {...form.register("email")}
                            />
                        </div>
                    </Field>
                    <Field
                        label="Password"
                        error={form.formState.errors.password?.message}
                    >
                        <div className="input-with-icon">
                            <LockKeyhole size={18} />
                            <Input
                                type="password"
                                autoComplete="current-password"
                                {...form.register("password")}
                            />
                        </div>
                    </Field>
                    {form.formState.errors.root?.message ? (
                        <div className="form-alert error">
                            {form.formState.errors.root.message}
                        </div>
                    ) : null}
                    <Button
                        type="submit"
                        size="lg"
                        loading={form.formState.isSubmitting}
                    >
                        Sign in <ArrowRight size={18} />
                    </Button>
                    <Link className="text-link centered" to="/forgot-password">
                        Forgot your password?
                    </Link>
                </form>
                <div className="invite-note">
                    Accounts are created through a private invitation link from
                    a chapter administrator.
                </div>
            </Card>
        </AuthLayout>
    );
}

export function RegisterPage() {
    const { token = "" } = useParams();
    const { user, register } = useAuth();
    const navigate = useNavigate();
    const invitationQuery = useQuery({
        queryKey: ["invitation", token],
        queryFn: () =>
            request<{
                invitation: { valid: true; label?: string; expiresAt?: string };
            }>(`/invitations/${encodeURIComponent(token)}`),
        retry: false,
        enabled: Boolean(token),
    });
    const form = useForm<RegistrationValues>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    if (user) return <Navigate to="/" replace />;

    if (invitationQuery.isLoading) {
        return (
            <AuthLayout message="Validating your private invitation.">
                <Card className="auth-card">
                    <LoadingState label="Checking invitation" />
                </Card>
            </AuthLayout>
        );
    }

    if (invitationQuery.isError || !token) {
        return (
            <AuthLayout message="This private invitation may have expired or been deactivated.">
                <Card className="auth-card invalid-invite">
                    <h2>This invitation is not available</h2>

                    <p>
                        It may have expired or been deactivated. Ask a chapter
                        administrator for an active invitation link.
                    </p>

                    <Button type="button" onClick={() => navigate("/login")}>
                        Go to sign in
                    </Button>
                </Card>
            </AuthLayout>
        );
    }

    const submit = form.handleSubmit(async (values) => {
        try {
            await register({
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                password: values.password,
                inviteToken: token,
            });
            navigate("/", { replace: true });
        } catch (error) {
            form.setError("root", {
                message:
                    error instanceof ApiError
                        ? error.message
                        : "Account creation failed.",
            });
        }
    });

    const invitation = invitationQuery.data?.invitation;

    return (
        <AuthLayout message="Create your private Colorado Gamma Study Bank account.">
            <Card className="auth-card">
                <div className="auth-card-heading">
                    <h2>Create your account</h2>
                    <p>
                        {invitation?.label
                            ? invitation.label
                            : "You were invited to join the study bank."}
                    </p>
                    {invitation?.expiresAt ? (
                        <small>
                            Link expires {formatDate(invitation.expiresAt)}
                        </small>
                    ) : null}
                </div>
                <form onSubmit={submit} className="form-stack">
                    <div className="two-column-fields">
                        <Field
                            label="First name"
                            error={form.formState.errors.firstName?.message}
                        >
                            <Input
                                autoComplete="given-name"
                                {...form.register("firstName")}
                            />
                        </Field>
                        <Field
                            label="Last name"
                            error={form.formState.errors.lastName?.message}
                        >
                            <Input
                                autoComplete="family-name"
                                {...form.register("lastName")}
                            />
                        </Field>
                    </div>
                    <Field
                        label="Email"
                        error={form.formState.errors.email?.message}
                    >
                        <Input
                            type="email"
                            autoComplete="email"
                            {...form.register("email")}
                        />
                    </Field>
                    <Field
                        label="Password"
                        hint="Use at least 10 characters."
                        error={form.formState.errors.password?.message}
                    >
                        <Input
                            type="password"
                            autoComplete="new-password"
                            {...form.register("password")}
                        />
                    </Field>
                    <Field
                        label="Confirm password"
                        error={form.formState.errors.confirmPassword?.message}
                    >
                        <Input
                            type="password"
                            autoComplete="new-password"
                            {...form.register("confirmPassword")}
                        />
                    </Field>
                    {form.formState.errors.root?.message ? (
                        <div className="form-alert error">
                            {form.formState.errors.root.message}
                        </div>
                    ) : null}
                    <Button
                        type="submit"
                        size="lg"
                        loading={form.formState.isSubmitting}
                    >
                        Create account <ArrowRight size={18} />
                    </Button>
                </form>
            </Card>
        </AuthLayout>
    );
}

export function ForgotPasswordPage() {
    const form = useForm<ForgotValues>({
        resolver: zodResolver(forgotSchema),
        defaultValues: { email: "" },
    });
    const mutation = useMutation({
        mutationFn: (values: ForgotValues) =>
            request<{ message: string }>("/auth/forgot-password", {
                method: "POST",
                body: JSON.stringify(values),
            }),
    });

    const submit = form.handleSubmit(async (values) => {
        try {
            await mutation.mutateAsync(values);
            toast.success("Check your email for a password reset link.");
            form.reset();
        } catch (error) {
            form.setError("root", {
                message:
                    error instanceof ApiError
                        ? error.message
                        : "The request failed.",
            });
        }
    });

    return (
        <AuthLayout message="Reset access to your private study bank account.">
            <Card className="auth-card">
                <div className="auth-card-heading">
                    <h2>Reset your password</h2>
                    <p>
                        Enter your account email and we will send a reset link.
                    </p>
                </div>
                <form onSubmit={submit} className="form-stack">
                    <Field
                        label="Email"
                        error={form.formState.errors.email?.message}
                    >
                        <Input
                            type="email"
                            autoComplete="email"
                            {...form.register("email")}
                        />
                    </Field>
                    {form.formState.errors.root?.message ? (
                        <div className="form-alert error">
                            {form.formState.errors.root.message}
                        </div>
                    ) : null}
                    <Button
                        type="submit"
                        size="lg"
                        loading={mutation.isPending}
                    >
                        Send reset link
                    </Button>
                    <Link className="text-link centered" to="/login">
                        Back to sign in
                    </Link>
                </form>
            </Card>
        </AuthLayout>
    );
}

export function ResetPasswordPage() {
    const { token = "" } = useParams();
    const navigate = useNavigate();
    const form = useForm<ResetValues>({
        resolver: zodResolver(resetSchema),
        defaultValues: { password: "", confirmPassword: "" },
    });
    const mutation = useMutation({
        mutationFn: (values: ResetValues) =>
            request<{ message: string }>("/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({ token, newPassword: values.password }),
            }),
    });

    const submit = form.handleSubmit(async (values) => {
        try {
            await mutation.mutateAsync(values);
            toast.success("Your password has been reset.");
            navigate("/login", { replace: true });
        } catch (error) {
            form.setError("root", {
                message:
                    error instanceof ApiError
                        ? error.message
                        : "The reset link is invalid or expired.",
            });
        }
    });

    return (
        <AuthLayout message="Choose a new password for your study bank account.">
            <Card className="auth-card">
                <div className="auth-card-heading">
                    <h2>Choose a new password</h2>
                    <p>Use at least 10 characters.</p>
                </div>
                <form onSubmit={submit} className="form-stack">
                    <Field
                        label="New password"
                        error={form.formState.errors.password?.message}
                    >
                        <Input
                            type="password"
                            autoComplete="new-password"
                            {...form.register("password")}
                        />
                    </Field>
                    <Field
                        label="Confirm password"
                        error={form.formState.errors.confirmPassword?.message}
                    >
                        <Input
                            type="password"
                            autoComplete="new-password"
                            {...form.register("confirmPassword")}
                        />
                    </Field>
                    {form.formState.errors.root?.message ? (
                        <div className="form-alert error">
                            {form.formState.errors.root.message}
                        </div>
                    ) : null}
                    <Button
                        type="submit"
                        size="lg"
                        loading={mutation.isPending}
                    >
                        Reset password
                    </Button>
                </form>
            </Card>
        </AuthLayout>
    );
}
