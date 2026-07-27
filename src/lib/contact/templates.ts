const BRAND_COLOR = '#0a0b0e';
const TEXT_COLOR = '#1a1b1e';
const MUTED_COLOR = '#6b7280';
const SURFACE_COLOR = '#ffffff';

function layout(preheader: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#f4f5f7;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:${SURFACE_COLOR};border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:${BRAND_COLOR};padding:24px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.5px;">Liviu Bucel</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:${TEXT_COLOR};font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #e5e7eb;color:${MUTED_COLOR};font-size:12px;">
                You received this email because you submitted a contact form on
                <a href="https://www.liviubucel.com" style="color:${MUTED_COLOR};">liviubucel.com</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function contactConfirmationEmail(
  fullName: string,
  message: string,
): { subject: string; html: string; text: string } {
  const firstName = fullName.trim().split(/\s+/)[0] || fullName;
  const preview = message.length > 280 ? `${message.slice(0, 280)}…` : message;
  const subject = "Thanks for reaching out | Liviu Bucel";
  const html = layout(
    `Got it, ${escapeHtml(firstName)}! I'll get back to you soon.`,
    `<p>Hi, ${escapeHtml(firstName)}!</p>
     <p>Thanks for getting in touch. I've received your message and will get back to you as soon as possible — usually within 24 hours.</p>
     <p style="margin:24px 0;padding:16px 20px;background:#f4f5f7;border-radius:8px;color:${MUTED_COLOR};">
       &ldquo;${escapeHtml(preview).replace(/\n/g, '<br>')}&rdquo;
     </p>
     <p>Talk soon,<br>Liviu</p>`,
  );
  const text = `Hi, ${firstName}!\n\nThanks for getting in touch. I've received your message and will get back to you as soon as possible — usually within 24 hours.\n\nYour message:\n"${message}"\n\nTalk soon,\nLiviu`;
  return { subject, html, text };
}
