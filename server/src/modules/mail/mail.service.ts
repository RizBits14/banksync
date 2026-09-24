import nodemailer from "nodemailer";

interface AccountCredentialsEmailInput {
    to: string;
    name: string;
    loginId: string;
    temporaryPassword: string;
    role: string;
}

const getTransporter = () => {
    const mailUser =
        process.env.MAIL_USER;

    const mailPassword =
        process.env.MAIL_APP_PASSWORD;

    if (
        !mailUser ||
        !mailPassword
    ) {
        throw new Error(
            "MAIL_USER or MAIL_APP_PASSWORD is not configured"
        );
    }

    return nodemailer.createTransport({
        service: "gmail",

        auth: {
            user: mailUser,
            pass: mailPassword,
        },
    });
};

const formatRole = (
    role: string
) => {
    return role
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(
            /\b\w/g,
            (letter) =>
                letter.toUpperCase()
        );
};

export const sendAccountCredentialsEmail =
    async (
        input: AccountCredentialsEmailInput
    ) => {
        const transporter =
            getTransporter();

        const {
            to,
            name,
            loginId,
            temporaryPassword,
            role,
        } = input;

        const sender =
            process.env.MAIL_USER;

        await transporter.sendMail({
            from: `"BankSync Administration" <${sender}>`,

            to,

            subject:
                "Your BankSync Account Has Been Approved",

            text: `
Hello ${name},

Your BankSync account request has been approved.

BankSync User ID: ${loginId}
Temporary Password: ${temporaryPassword}
Role: ${formatRole(role)}

Please sign in using these temporary credentials.

For security, you will be required to change your password after your first login.

Regards,
BankSync Administration
            `.trim(),

            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #292524;">
                    <div style="background: #1c1917; padding: 24px; border-radius: 12px 12px 0 0;">
                        <h2 style="margin: 0; color: white;">
                            BankSync
                        </h2>

                        <p style="margin: 6px 0 0; color: #a8a29e;">
                            Reconciliation Platform
                        </p>
                    </div>

                    <div style="border: 1px solid #e7e5e4; border-top: 0; padding: 28px; border-radius: 0 0 12px 12px;">
                        <h3 style="margin-top: 0;">
                            Account Approved
                        </h3>

                        <p>
                            Hello ${name},
                        </p>

                        <p>
                            Your BankSync account request has been approved.
                        </p>

                        <div style="background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; padding: 18px; margin: 22px 0;">
                            <p style="margin: 0 0 12px;">
                                <strong>BankSync User ID</strong><br />
                                ${loginId}
                            </p>

                            <p style="margin: 0 0 12px;">
                                <strong>Temporary Password</strong><br />
                                ${temporaryPassword}
                            </p>

                            <p style="margin: 0;">
                                <strong>Role</strong><br />
                                ${formatRole(role)}
                            </p>
                        </div>

                        <p>
                            Use these credentials to sign in to BankSync.
                        </p>

                        <p>
                            <strong>
                                You will be required to change your password after your first login.
                            </strong>
                        </p>

                        <p style="margin-top: 28px;">
                            Regards,<br />
                            BankSync Administration
                        </p>
                    </div>
                </div>
            `,
        });
    };