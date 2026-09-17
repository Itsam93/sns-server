import {
  resend,
} from "../config/resend.js";

import {
  sendEmailSchema,
} from "../utils/emailValidation.js";

import {
  emailConfig,
} from "../config/resend.js";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailDeliveryResult = {
  accepted: boolean;
  messageId?: string;
};

function getEmailFrom() {
  const emailFrom =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim();

  if (!emailFrom) {
    throw new Error(
      "RESEND_FROM_EMAIL is not defined.",
    );
  }

  const emailName =
    process.env.RESEND_FROM_NAME?.trim();

  if (emailName) {
    return `${emailName} <${emailFrom}>`;
  }

  return emailFrom;
}

function getEmailProvider() {
  return (
    process.env.EMAIL_PROVIDER ||
    "resend"
  )
    .trim()
    .toLowerCase();
}

async function sendWithResendProvider(
  data: SendEmailInput,
): Promise<EmailDeliveryResult> {
  try {
    const result =
      await resend.emails.send({
        from: getEmailFrom(),
        to: [data.to],
        subject: data.subject,
        text: data.text,
        ...(data.html
          ? {
              html: data.html,
            }
          : {}),
      });

    if (result.error) {
      console.error(
        "[Email] Resend delivery failed:",
        result.error,
      );

      return {
        accepted: false,
      };
    }

    return {
      accepted: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error(
      "[Email] Resend provider error:",
      error,
    );

    return {
      accepted: false,
    };
  }
}

async function sendWithConsoleProvider(
  data: SendEmailInput,
): Promise<EmailDeliveryResult> {
  console.log(
    `[Email] To: ${data.to}`,
  );

  console.log(
    `[Email] From: ${getEmailFrom()}`,
  );

  console.log(
    `[Email] Subject: ${data.subject}`,
  );

  console.log(
    `[Email] Text: ${data.text}`,
  );

  if (data.html) {
    console.log(
      "[Email] HTML body provided.",
    );
  }

  return {
    accepted: true,
    messageId: `console-${Date.now()}`,
  };
}

async function deliverEmail(
  data: SendEmailInput,
): Promise<EmailDeliveryResult> {
  const provider =
    getEmailProvider();

  switch (provider) {
    case "resend":
      return sendWithResendProvider(
        data,
      );

    case "console":
      return sendWithConsoleProvider(
        data,
      );

    default:
      throw new Error(
        `Unsupported email provider: ${provider}`,
      );
  }
}

export async function sendEmail(
  data: SendEmailInput,
): Promise<EmailDeliveryResult> {
  const validated =
    sendEmailSchema.parse(data);

  return deliverEmail({
    to: validated.to,
    subject:
      validated.subject,
    text:
      validated.text,
    html:
      validated.html,
  });
}

export async function sendVerificationEmail(
  data: {
    email: string;
    firstName: string;
    verificationToken: string;
  },
): Promise<EmailDeliveryResult> {
  const verificationUrl =
    `${emailConfig.clientUrl}/verify-email?token=${encodeURIComponent(
      data.verificationToken,
    )}`;

  return sendEmail({
    to: data.email,
    subject:
      "Verify your Stitches-N-Spice email",
    text: `
Hello ${data.firstName},

Thank you for creating your Stitches-N-Spice account.

Please verify your email address by visiting the link below:

${verificationUrl}

This verification link expires in 24 hours.

If you did not create this account, you can safely ignore this email.

Stitches-N-Spice
    `.trim(),
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>Verify your Stitches-N-Spice email</title>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    background: #f7f7f4;
    font-family: Arial, Helvetica, sans-serif;
    color: #20251f;
  "
>
  <div
    style="
      display: none;
      max-height: 0;
      overflow: hidden;
      opacity: 0;
    "
  >
    Verify your email address to activate your
    Stitches-N-Spice account.
  </div>

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background: #f7f7f4;"
  >
    <tr>
      <td
        align="center"
        style="padding: 40px 20px;"
      >
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width: 620px;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
          "
        >
          <tr>
            <td
              style="
                padding: 32px 36px;
                border-bottom: 1px solid #eeeeea;
              "
            >
              <div
                style="
                  font-size: 22px;
                  font-weight: 700;
                  color: #315c43;
                "
              >
                Stitches-N-Spice
              </div>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding: 40px 36px;
              "
            >
              <h1
                style="
                  margin: 0 0 20px;
                  font-size: 28px;
                  line-height: 1.2;
                  color: #20251f;
                "
              >
                Verify your email address
              </h1>

              <p
                style="
                  margin: 0 0 16px;
                  font-size: 16px;
                  line-height: 1.7;
                  color: #555a54;
                "
              >
                Hello ${data.firstName},
              </p>

              <p
                style="
                  margin: 0 0 24px;
                  font-size: 16px;
                  line-height: 1.7;
                  color: #555a54;
                "
              >
                Thank you for creating your
                Stitches-N-Spice account. Please verify
                your email address to complete your
                registration.
              </p>

              <p style="margin: 0 0 28px;">
                <a
                  href="${verificationUrl}"
                  style="
                    display: inline-block;
                    padding: 14px 24px;
                    background: #315c43;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 8px;
                    font-size: 15px;
                    font-weight: 600;
                  "
                >
                  Verify my email
                </a>
              </p>

              <p
                style="
                  margin: 0;
                  font-size: 14px;
                  line-height: 1.7;
                  color: #777b76;
                "
              >
                This verification link expires in
                24 hours. If you did not create this
                account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding: 24px 36px;
                background: #fafaf8;
                border-top: 1px solid #eeeeea;
                color: #777b76;
                font-size: 13px;
                line-height: 1.6;
              "
            >
              <p style="margin: 0;">
                This email was sent by Stitches-N-Spice.
              </p>

              <p style="margin: 8px 0 0;">
                Please do not reply to this automated
                message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}

export async function sendWelcomeEmail(
  data: {
    email: string;
    firstName: string;
  },
): Promise<EmailDeliveryResult> {
  const loginUrl =
    `${emailConfig.clientUrl}/login`;

  return sendEmail({
    to: data.email,
    subject:
      "Welcome to Stitches-N-Spice",
    text: `
Hello ${data.firstName},

Your email address has been successfully verified.

Welcome to Stitches-N-Spice.

Your account is now ready and you can sign in to access your counselling and wellness services.

Sign in:
${loginUrl}

Stitches-N-Spice
    `.trim(),
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>Welcome to Stitches-N-Spice</title>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    background: #f7f7f4;
    font-family: Arial, Helvetica, sans-serif;
    color: #20251f;
  "
>
  <div
    style="
      display: none;
      max-height: 0;
      overflow: hidden;
      opacity: 0;
    "
  >
    Your Stitches-N-Spice account has been successfully
    verified.
  </div>

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background: #f7f7f4;"
  >
    <tr>
      <td
        align="center"
        style="padding: 40px 20px;"
      >
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width: 620px;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
          "
        >
          <tr>
            <td
              style="
                padding: 32px 36px;
                border-bottom: 1px solid #eeeeea;
              "
            >
              <div
                style="
                  font-size: 22px;
                  font-weight: 700;
                  color: #315c43;
                "
              >
                Stitches-N-Spice
              </div>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding: 40px 36px;
              "
            >
              <h1
                style="
                  margin: 0 0 20px;
                  font-size: 28px;
                  line-height: 1.2;
                  color: #20251f;
                "
              >
                Welcome to Stitches-N-Spice
              </h1>

              <p
                style="
                  margin: 0 0 16px;
                  font-size: 16px;
                  line-height: 1.7;
                  color: #555a54;
                "
              >
                Hello ${data.firstName},
              </p>

              <p
                style="
                  margin: 0 0 16px;
                  font-size: 16px;
                  line-height: 1.7;
                  color: #555a54;
                "
              >
                Your email address has been successfully
                verified. Welcome to Stitches-N-Spice.
              </p>

              <p
                style="
                  margin: 0 0 28px;
                  font-size: 16px;
                  line-height: 1.7;
                  color: #555a54;
                "
              >
                Your account is now ready. You can sign
                in to access your counselling and wellness
                services.
              </p>

              <p style="margin: 0;">
                <a
                  href="${loginUrl}"
                  style="
                    display: inline-block;
                    padding: 14px 24px;
                    background: #315c43;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 8px;
                    font-size: 15px;
                    font-weight: 600;
                  "
                >
                  Sign in
                </a>
              </p>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding: 24px 36px;
                background: #fafaf8;
                border-top: 1px solid #eeeeea;
                color: #777b76;
                font-size: 13px;
                line-height: 1.6;
              "
            >
              <p style="margin: 0;">
                This email was sent by Stitches-N-Spice.
              </p>

              <p style="margin: 8px 0 0;">
                Please do not reply to this automated
                message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}

export async function sendAppointmentEmail(
  data: {
    to: string;
    subject: string;
    message: string;
    html?: string;
  },
): Promise<EmailDeliveryResult> {
  return sendEmail({
    to: data.to,
    subject:
      data.subject,
    text:
      data.message,
    html:
      data.html,
  });
}

export async function sendWorkshopEmail(
  data: {
    to: string;
    subject: string;
    message: string;
    html?: string;
  },
): Promise<EmailDeliveryResult> {
  return sendEmail({
    to: data.to,
    subject:
      data.subject,
    text:
      data.message,
    html:
      data.html,
  });
}

export async function sendAccountEmail(
  data: {
    to: string;
    subject: string;
    message: string;
    html?: string;
  },
): Promise<EmailDeliveryResult> {
  return sendEmail({
    to: data.to,
    subject:
      data.subject,
    text:
      data.message,
    html:
      data.html,
  });
}