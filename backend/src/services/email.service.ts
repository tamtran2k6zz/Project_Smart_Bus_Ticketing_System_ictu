import nodemailer from 'nodemailer';
import { collectEmailEnvironmentIssues, readEnv } from '../config/env';
import { appLogger } from '../config/logger';
import type { Options } from 'nodemailer/lib/mailer';

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  content: Pick<Options, 'html' | 'attachments'> = {}
): Promise<boolean> {
  const host = readEnv('SMTP_HOST'),
    from = readEnv('SMTP_FROM');
  const issues = collectEmailEnvironmentIssues();
  if (issues.length) {
    appLogger.error('email_configuration_incomplete', {
      variables: issues.map(issue => issue.variable).join(','),
    });
    return false;
  }
  const transport = nodemailer.createTransport({
    host,
    port: Number(readEnv('SMTP_PORT') || 587),
    secure: readEnv('SMTP_SECURE') === 'true',
    requireTLS: host?.toLowerCase() === 'smtp.gmail.com' && readEnv('SMTP_SECURE') !== 'true',
    connectionTimeout: 10000,
    socketTimeout: 15000,
    auth: readEnv('SMTP_USER')
      ? { user: readEnv('SMTP_USER'), pass: readEnv('SMTP_PASSWORD') }
      : undefined,
  });
  try {
    const result = await transport.sendMail({ from, to, subject, text, ...content });
    return result.accepted.length > 0;
  } catch (error) {
    appLogger.error('email_delivery_failed', { error });
    return false;
  } finally {
    transport.close();
  }
}
