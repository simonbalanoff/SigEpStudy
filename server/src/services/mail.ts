import nodemailer from "nodemailer";

import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

const transporter = env.SMTP_HOST
    ? nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          auth:
              env.SMTP_USER && env.SMTP_PASS
                  ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
                  : undefined,
      })
    : null;

export async function sendPasswordResetEmail(
    email: string,
    token: string,
): Promise<void> {
    const resetUrl = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;

    if (!transporter) {
        if (env.NODE_ENV === "production") {
            throw new AppError(
                503,
                "EMAIL_NOT_CONFIGURED",
                "Email delivery is not configured.",
            );
        }
        console.log(`Password reset for ${email}: ${resetUrl}`);
        return;
    }

    await transporter.sendMail({
        from: env.SMTP_FROM,
        to: email,
        subject: "Reset your SigEp Study Bank password",
        text: `Reset your password using this link: ${resetUrl}`,
        html: `<p>Reset your password using the link below.</p><p><a href="${resetUrl}">Reset password</a></p>`,
    });
}
