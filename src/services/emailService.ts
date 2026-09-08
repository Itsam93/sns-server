import {
  sendEmailSchema,
} from "../utils/emailValidation.js";

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
    process.env.EMAIL_FROM;

  if (
    !emailFrom ||
    !emailFrom.trim()
  ) {
    throw new Error(
      "EMAIL_FROM is not defined.",
    );
  }

  return emailFrom.trim();
}

function getEmailProvider() {
  return (
    process.env.EMAIL_PROVIDER ||
    "console"
  )
    .trim()
    .toLowerCase();
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
) {
  const validated =
    sendEmailSchema.parse(data);

  return deliverEmail({
    to: validated.to,
    subject:
      validated.subject,
    text: validated.text,
    html:
      validated.html,
  });
}

export async function sendAppointmentEmail(
  data: {
    to: string;
    subject: string;
    message: string;
    html?: string;
  },
) {
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
) {
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
) {
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