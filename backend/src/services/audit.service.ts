import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AuthenticatedRequest } from '../middlewares/auth';
import { appLogger } from '../config/logger';
export function auditRequests(req: Request, res: Response, next: NextFunction) {
  const method = req.method,
    path = req.path,
    ip = req.ip;
  res.once('finish', () => {
    const user = (req as AuthenticatedRequest).user;
    // Paths exclude query strings, payloads, passwords, QR data and auth tokens.
    void query(
      'INSERT INTO audit_events(user_id,action,method,path,status_code,ip) VALUES($1,$2,$3,$4,$5,$6)',
      [user?.id ?? null, method + ' ' + path, method, path, res.statusCode, ip]
    ).catch(error => appLogger.error('audit_write_failed', { method, path, error }));
  });
  next();
}
