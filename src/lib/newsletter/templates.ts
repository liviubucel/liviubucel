// Romania Cyber Monitor - newsletter email templates. Same visual layout
// as src/lib/contact/templates.ts, kept as its own self-contained module
// rather than a shared import so the two features stay independently
// editable.

const BRAND_COLOR = '#0a0b0e';
const TEXT_COLOR = '#1a1b1e';
const MUTED_COLOR = '#6b7280';
const SURFACE_COLOR = '#ffffff';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function layout(preheader: string, bodyHtml: string, footerHtml: string): string {
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
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.5px;">Romania Cyber Monitor</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:${TEXT_COLOR};font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #e5e7eb;color:${MUTED_COLOR};font-size:12px;">
                ${footerHtml}
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

export function newsletterConfirmationEmail(confirmUrl: string): RenderedEmail {
  const subject = 'Confirm your Romania Cyber Monitor subscription';
  const html = layout(
    'One click to confirm your subscription.',
    `<p>Thanks for subscribing to Romania Cyber Monitor updates.</p>
     <p>You'll get an email whenever a new, Romania-linked ransomware claim or breach is published - and nothing else.</p>
     <p style="margin:24px 0;">
       <a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background:${BRAND_COLOR};color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;">Confirm subscription</a>
     </p>
     <p style="color:${MUTED_COLOR};font-size:13px;">If you didn't request this, you can safely ignore this email - you won't be subscribed unless you click the link above.</p>`,
    `You're receiving this because this email address was entered on the Romania Cyber Monitor subscription form at
     <a href="https://liviubucel.com" style="color:${MUTED_COLOR};">liviubucel.com</a>.`,
  );
  const text = [
    'Thanks for subscribing to Romania Cyber Monitor updates.',
    "You'll get an email whenever a new, Romania-linked ransomware claim or breach is published - and nothing else.",
    '',
    `Confirm your subscription: ${confirmUrl}`,
    '',
    "If you didn't request this, you can safely ignore this email.",
  ].join('\n');
  return { subject, html, text };
}

export interface DigestItem {
  title: string;
  excerpt: string;
  url: string;
}

export function newsletterDigestEmail(items: DigestItem[], unsubscribeUrl: string): RenderedEmail {
  const subject =
    items.length === 1
      ? `Romania Cyber Monitor: ${items[0].title}`
      : `Romania Cyber Monitor: ${items.length} new updates`;

  const itemsHtml = items
    .map(
      (item) => `<div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #e5e7eb;">
        <p style="margin:0 0 6px;font-weight:700;font-size:16px;">
          <a href="${item.url}" style="color:${TEXT_COLOR};text-decoration:none;">${escapeHtml(item.title)}</a>
        </p>
        <p style="margin:0 0 8px;color:${MUTED_COLOR};">${escapeHtml(item.excerpt)}</p>
        <a href="${item.url}" style="color:${BRAND_COLOR};font-size:13px;">Read more →</a>
      </div>`,
    )
    .join('');

  const html = layout(
    items.length === 1 ? items[0].title : `${items.length} new Romania-linked updates`,
    itemsHtml,
    `You're receiving this because you're subscribed to Romania Cyber Monitor updates.
     <a href="${unsubscribeUrl}" style="color:${MUTED_COLOR};">Unsubscribe</a>.`,
  );

  const text = [
    ...items.map((item) => `${item.title}\n${item.excerpt}\n${item.url}`),
    '',
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n\n');

  return { subject, html, text };
}
