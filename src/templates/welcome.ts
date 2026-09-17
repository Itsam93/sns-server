import { emailLayout } from "./layout.js";

type WelcomeEmailInput = {
  firstName: string;
};

export function welcomeEmail({
  firstName,
}: WelcomeEmailInput) {
  const html = emailLayout({
    title:
      "Welcome to Stitches-N-Spice",
    previewText:
      "Your Stitches-N-Spice account has been successfully verified.",
    content: `
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
        Hello ${firstName},
      </p>

      <p
        style="
          margin: 0 0 16px;
          font-size: 16px;
          line-height: 1.7;
          color: #555a54;
        "
      >
        Your email address has been successfully verified.
        Welcome to Stitches-N-Spice.
      </p>

      <p
        style="
          margin: 0 0 28px;
          font-size: 16px;
          line-height: 1.7;
          color: #555a54;
        "
      >
        Your account is now ready. You can sign in to access your
        counselling and wellness services.
      </p>

      <p style="margin: 0;">
        <a
          href="${process.env.CLIENT_URL || "http://localhost:5173"}/login"
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
    `,
  });

  const text = `
Hello ${firstName},

Your email address has been successfully verified.

Welcome to Stitches-N-Spice.

Your account is now ready. You can sign in to access your counselling and wellness services.

Sign in:
${process.env.CLIENT_URL || "http://localhost:5173"}/login

Stitches-N-Spice
`;

  return {
    html,
    text,
  };
}