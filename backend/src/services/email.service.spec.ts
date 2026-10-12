import nodemailer from 'nodemailer';
import { sendEmail } from './email.service';
import { appLogger } from '../config/logger';

jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: jest.fn() } }));

describe('real SMTP delivery configuration', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    for (const key of [
      'SMTP_HOST',
      'SMTP_FROM',
      'SMTP_USER',
      'SMTP_PASSWORD',
      'SMTP_PORT',
      'SMTP_SECURE',
    ])
      delete process.env[key];
    jest.clearAllMocks();
  });
  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('returns false with safe operator diagnostics and never creates a transport without config', async () => {
    const log = jest.spyOn(appLogger, 'error').mockImplementation(() => {});
    expect(await sendEmail('recipient@example.test', 'Verification', 'Test')).toBe(false);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('email_configuration_incomplete', {
      variables: 'SMTP_HOST,SMTP_FROM',
    });
  });

  it('refuses to attempt Gmail authentication until an app password is configured', async () => {
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_FROM = 'SmartBus <sender@example.test>';
    process.env.SMTP_USER = 'sender@example.test';
    const log = jest.spyOn(appLogger, 'error').mockImplementation(() => {});
    expect(await sendEmail('recipient@example.test', 'Verification', 'Test')).toBe(false);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('email_configuration_incomplete', {
      variables: 'SMTP_PASSWORD',
    });
  });

  it('requires STARTTLS for Gmail on port 587 and reports the SMTP acceptance', async () => {
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_FROM = 'SmartBus <sender@example.test>';
    process.env.SMTP_USER = 'sender@example.test';
    process.env.SMTP_PASSWORD = 'test-only-app-password';
    const close = jest.fn();
    const sendMail = jest.fn().mockResolvedValue({ accepted: ['recipient@example.test'] });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail, close });
    expect(await sendEmail('recipient@example.test', 'Verification', 'Test')).toBe(true);
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, secure: false, requireTLS: true })
    );
    expect(close).toHaveBeenCalled();
  });
});
