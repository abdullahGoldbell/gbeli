import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'fms@example.com';
const NOTIFY_EMAILS = process.env.NOTIFY_EMAILS || '';

function isConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

export function sendReservationNotification(
  vehNo: string,
  reservedBy: string,
  reservationDate: string,
) {
  if (!isConfigured()) {
    console.log(`[Email] SMTP not configured. Would notify: ${vehNo} reserved by ${reservedBy} on ${reservationDate}`);
    return;
  }

  const recipients = NOTIFY_EMAILS.split(',').map((e) => e.trim()).filter(Boolean);
  if (recipients.length === 0) {
    console.log('[Email] No NOTIFY_EMAILS configured');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  // Fire-and-forget
  transporter.sendMail({
    from: SMTP_FROM,
    to: recipients.join(', '),
    subject: `FMS Reservation: ${vehNo} reserved by ${reservedBy}`,
    text: `Vehicle ${vehNo} has been reserved by ${reservedBy} on ${reservationDate}.\n\nThis is an automated notification from the FMS Dashboard.`,
    html: `<p>Vehicle <strong>${vehNo}</strong> has been reserved by <strong>${reservedBy}</strong> on <strong>${reservationDate}</strong>.</p><p><em>This is an automated notification from the FMS Dashboard.</em></p>`,
  }).catch((err) => {
    console.error('[Email] Failed to send reservation notification:', err);
  });
}
