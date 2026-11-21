import nodemailer from 'nodemailer';
import { config } from './config.js';

const enabled = Boolean(config.mail.host);
const transport = enabled
  ? nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    })
  : null;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout(title, rows, footer = '') {
  const body = rows.map(([k, v]) => `<tr><td style="padding:8px 16px 8px 0;color:#5b6b78;vertical-align:top">${esc(k)}</td><td style="padding:8px 0;color:#14263a">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('');
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border-top:4px solid #c49a4f;padding:28px">
  <p style="font-size:13px;color:#8b6a2b;margin:0 0 6px">GlobalPath Immigration</p>
  <h2 style="color:#0f2236;margin:0 0 18px;font-family:Georgia,serif">${esc(title)}</h2>
  <table style="font-size:14px;border-collapse:collapse">${body}</table>
  ${footer ? `<p style="font-size:13px;color:#5b6b78;margin-top:24px">${footer}</p>` : ''}
</div>`;
}

/** Sends an email if SMTP is configured; otherwise logs it. Never throws. */
export async function sendMail({ to, subject, title, rows, footer }) {
  const html = layout(title || subject, rows || [], footer);
  if (!transport) {
    console.log(`[mail:disabled] to=${to} subject="${subject}"`);
    return { sent: false };
  }
  try {
    await transport.sendMail({ from: config.mail.from, to, subject, html });
    return { sent: true };
  } catch (err) {
    console.error('[mail] send failed:', err.message);
    return { sent: false, error: err.message };
  }
}

export const notifyTeam = (subject, rows) => sendMail({ to: config.mail.notify, subject, rows, title: subject });
