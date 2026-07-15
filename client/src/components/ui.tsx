import type {
    ButtonHTMLAttributes,
    HTMLAttributes,
    InputHTMLAttributes,
    ReactNode,
    SelectHTMLAttributes,
    TextareaHTMLAttributes,
} from "react";
import { LoaderCircle, X } from "lucide-react";

export function cx(
    ...values: Array<string | false | null | undefined>
): string {
    return values.filter(Boolean).join(" ");
}

export function Button({
    className,
    variant = "primary",
    size = "md",
    loading,
    children,
    disabled,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg" | "icon";
    loading?: boolean;
}) {
    return (
        <button
            className={cx(
                "button",
                `button-${variant}`,
                `button-${size}`,
                className,
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? <LoaderCircle className="spin" size={18} /> : null}
            {children}
        </button>
    );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cx("card", className)} {...props} />;
}

export function Input({
    className,
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return <input className={cx("input", className)} {...props} />;
}

export function Textarea({
    className,
    ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea className={cx("textarea", className)} {...props} />;
}

export function Select({
    className,
    children,
    ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select className={cx("select", className)} {...props}>
            {children}
        </select>
    );
}

export function Field({
    label,
    hint,
    error,
    required,
    children,
    className,
    htmlFor,
}: {
    label: string;
    hint?: string;
    error?: string;
    required?: boolean;
    children: ReactNode;
    className?: string;
    htmlFor?: string;
}) {
    const labelContent = (
        <>
            {label}
            {required ? <span aria-hidden="true"> *</span> : null}
        </>
    );

    return (
        <div className={cx("field", className)}>
            {htmlFor ? (
                <label className="field-label" htmlFor={htmlFor}>
                    {labelContent}
                </label>
            ) : (
                <div className="field-label">{labelContent}</div>
            )}

            {children}

            {error ? (
                <span className="field-error" role="alert">
                    {error}
                </span>
            ) : hint ? (
                <span className="field-hint">{hint}</span>
            ) : null}
        </div>
    );
}

export function PageHeader({
    title,
    description,
    action,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="page-header">
            <div>
                <h1>{title}</h1>
                {description ? <p>{description}</p> : null}
            </div>
            {action ? <div className="page-header-action">{action}</div> : null}
        </div>
    );
}

export function EmptyState({
    icon,
    title,
    description,
    action,
}: {
    icon?: ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="empty-state">
            {icon ? <div className="empty-icon">{icon}</div> : null}
            <h2>{title}</h2>
            <p>{description}</p>
            {action ? <div>{action}</div> : null}
        </div>
    );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
    return (
        <div className="loading-state" role="status">
            <LoaderCircle className="spin" size={24} />
            <span>{label}</span>
        </div>
    );
}

export function StatusBadge({ status }: { status: string }) {
    return (
        <span className={cx("status-badge", `status-${status}`)}>
            {status.replaceAll("_", " ")}
        </span>
    );
}

export function Modal({
    open,
    title,
    description,
    children,
    onClose,
}: {
    open: boolean;
    title: string;
    description?: string;
    children: ReactNode;
    onClose: () => void;
}) {
    if (!open) return null;
    return (
        <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={onClose}
        >
            <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="modal-header">
                    <div>
                        <h2>{title}</h2>
                        {description ? <p>{description}</p> : null}
                    </div>
                    <button
                        className="icon-button"
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
}

export function PaginationControls({
    page,
    pages,
    onChange,
}: {
    page: number;
    pages: number;
    onChange: (page: number) => void;
}) {
    if (pages <= 1) return null;
    return (
        <div className="pagination">
            <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => onChange(page - 1)}
            >
                Previous
            </Button>
            <span>
                Page {page} of {pages}
            </span>
            <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => onChange(page + 1)}
            >
                Next
            </Button>
        </div>
    );
}
