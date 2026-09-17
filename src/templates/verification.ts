import { emailLayout } from "./layout.js";

type VerificationEmailInput = {
  firstName: string;
  verificationUrl: string;
};

export function verificationEmail({
  firstName,
  verificationUrl,
}: VerificationEmailInput) {
  const html = emailLayout({
    title:
      "Verify your Stitches-N-Spice account",
    previewText:
      "Verify your email address to activate your Stitches-N-Spice account.",
    content: `
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
        Hello ${firstName},
      </p>

      <p
        style="
          margin: 0 0 24px;
          font-size: 16px;
          line-height: 1.7;
          color: #555a54;
        "
      >
        Thank you for creating your Stitches-N-Spice account.
        Please verify your email address to complete your registration.
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
        This verification link expires in 24 hours.
        If you did not create this account, you can safely ignore this email.
      </p>
    `,
  });

  const text = `
Hello ${firstName},

Thank you for creating your Stitches-N-Spice account.

Please verify your email address using the link below:

${verificationUrl}

This verification link expires in 24 hours.

If you did not create this account, you can safely ignore this email.

Stitches-N-Spice
`;

  return {
    html,
    text,
  };
}