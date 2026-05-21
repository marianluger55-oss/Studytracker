/*
 * services/email.service.ts
 * ─────────────────────────────────────────────────────────────
 * E-Mail-Versand via SMTP (nodemailer).
 *
 * Zwei Modi:
 *  - Production: echtes SMTP (Gmail, SendGrid, etc.) aus ENV-Variablen
 *  - Development ohne SMTP: Ethereal Test-Account — E-Mails gehen nicht raus,
 *    werden als Preview-Link im Log angezeigt
 *
 * Transporter Singleton: SMTP-Verbindung wird einmal aufgebaut und wiederverwendet.
 * ─────────────────────────────────────────────────────────────
 */

import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../utils/logger';

/* Singleton: einmal aufgebaut, dann wiederverwendet (verhindert neue Verbindung bei jeder E-Mail) */
let transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter;

  if (config.smtpConfigured) {
    transporter = nodemailer.createTransport({
      host:   config.smtp.host,
      port:   config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
      // Verbindungs-Timeout — verhindert Hängen bei SMTP-Problemen
      connectionTimeout: 10_000,
      greetingTimeout:   5_000,
    });

    // Verbindung beim ersten Aufruf verifizieren
    await transporter.verify();
    logger.info('SMTP-Verbindung verifiziert', { host: config.smtp.host });
  } else {
    // Ethereal-Testaccount für Development ohne SMTP-Konfiguration
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host:   'smtp.ethereal.email',
      port:   587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    logger.info('Ethereal SMTP-Testaccount erstellt', { user: testAccount.user });
  }

  return transporter;
}

interface MailOptions {
  to:      string;
  subject: string;
  html:    string;
  text:    string;
}

export async function sendMail(options: MailOptions): Promise<void> {
  try {
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from:    config.smtp.from,
      to:      options.to,
      subject: options.subject,
      html:    options.html,
      text:    options.text,
    });

    if (!config.smtpConfigured && !config.isProduction) {
      // Ethereal-Preview-URL in Development ausgeben
      const previewUrl = nodemailer.getTestMessageUrl(info);
      logger.info('Test-E-Mail gesendet (Ethereal)', { previewUrl });
    } else {
      logger.info('E-Mail gesendet', { to: options.to, messageId: info.messageId });
    }
  } catch (err) {
    // E-Mail-Fehler nie nach oben propagieren — Frontend-Nutzer muss keine Mail-Details sehen
    logger.error('E-Mail konnte nicht gesendet werden', {
      to:      options.to,
      error:   err instanceof Error ? err.message : String(err),
    });
    // Fehler in Production trotzdem re-throwen damit der Controller sauber reagieren kann
    if (config.isProduction) throw err;
  }
}

/* ── E-Mail-Templates ────────────────────────────────────────────
   Einfache Inline-Templates — kein Template-Engine benötigt für MVP */

export function buildPasswordResetEmail(resetUrl: string): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Passwort zurücksetzen</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #f3f4f6;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;background:#18181b;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:18px;">📚</span>
            </div>
            <span style="font-size:16px;font-weight:600;color:#18181b;">StudyTracker</span>
          </div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 40px;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#18181b;">
            Passwort zurücksetzen
          </h1>
          <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
            Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.
            Klicke auf den Button unten — der Link ist <strong>1 Stunde lang gültig</strong>.
          </p>

          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr><td style="background:#18181b;border-radius:8px;">
              <a href="${resetUrl}"
                 style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;">
                Passwort zurücksetzen →
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
            Falls der Button nicht funktioniert, kopiere diesen Link:
          </p>
          <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;">
            <a href="${resetUrl}" style="color:#6b7280;">${resetUrl}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px 28px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.
            Dein Passwort wurde nicht geändert.<br>
            Aus Sicherheitsgründen läuft dieser Link nach 1 Stunde ab.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `
Passwort zurücksetzen — StudyTracker

Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.

Link (gültig für 1 Stunde):
${resetUrl}

Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.
Dein Passwort wurde nicht geändert.
`.trim();

  return { html, text };
}
