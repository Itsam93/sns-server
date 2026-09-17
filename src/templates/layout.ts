type EmailLayoutInput = {
  title: string;
  previewText: string;
  content: string;
};

export function emailLayout({
  title,
  previewText,
  content,
}: EmailLayoutInput) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>${title}</title>
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
    ${previewText}
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
              ${content}
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
                Please do not reply to this automated message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}