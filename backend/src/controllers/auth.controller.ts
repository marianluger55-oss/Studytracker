/*
 * controllers/auth.controller.ts
 * HTTP-Handler für Auth-Endpunkte.
 * Validierung erfolgt in der Route via validate()-Middleware (keine doppelte Validierung hier).
 */

import { Request, Response } from 'express';
import * as authService      from '../services/auth.service';
import * as audit            from '../services/audit.service';
import { recordFailedLogin, resetFailedLogins } from '../utils/loginGuard';
import { AuthRequest }       from '../types';
import { asyncHandler }      from '../utils/asyncHandler';
import { AppError }          from '../middleware/errorHandler';
import { config }            from '../config/env';
import type { RegisterDto, LoginDto } from '../validation/schemas/auth.schemas';

/* ── Cookie-Konfiguration ────────────────────────────────────────
   SameSite=strict in Production (monolithisches Deploy, gleiche Domain).
   SameSite=lax in Development damit Vite-Dev-Server (5173) → Backend (3001). */
const REFRESH_COOKIE_NAME = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure:   config.isProduction,
  sameSite: (config.isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/',
};

/* IP und User-Agent aus Request lesen */
function requestMeta(req: Request) {
  return {
    ip:        (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim()
                 ?? req.ip ?? '',
    userAgent: req.headers['user-agent'] ?? '',
  };
}

/* ── register ────────────────────────────────────────────────────  */
export const register = asyncHandler(async (req: Request, res: Response) => {
  /* req.body ist bereits durch validate(registerSchema) geprüft und normalisiert */
  const { email, password, username } = req.body as RegisterDto;
  const result = await authService.register(email, password, username);

  audit.log('register', { userId: result.user.id, ...requestMeta(req), metadata: { email } });

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);
  res.status(201).json({
    success: true,
    data: {
      user:        result.user,
      accessToken: result.accessToken,
    },
  });
});

/* ── login ───────────────────────────────────────────────────────  */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginDto;
  const meta = requestMeta(req);

  let result: Awaited<ReturnType<typeof authService.login>>;
  try {
    result = await authService.login(email, password);
  } catch (err) {
    /* Fehlgeschlagener Login: userId unbekannt, E-Mail im metadata */
    audit.log('login_failed', { ...meta, metadata: { email } });
    /* Anomalie-Erkennung: mehrere Fehlversuche von gleicher IP */
    void recordFailedLogin(meta.ip, email);
    throw err;
  }

  /* Erfolgreicher Login: Fehlversuchs-Zähler zurücksetzen */
  void resetFailedLogins(meta.ip);
  audit.log('login', { userId: result.user.id, ...meta, metadata: { email } });

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);
  res.json({
    success: true,
    data: {
      user:        result.user,
      accessToken: result.accessToken,
    },
  });
});

/* ── refresh ─────────────────────────────────────────────────────  */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
  if (!token) throw new AppError(401, 'Kein Refresh-Token vorhanden');

  const result = await authService.refreshAccessToken(token);

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);
  res.json({
    success: true,
    data: {
      accessToken: result.accessToken,
      user:        result.user,
    },
  });
});

/* ── logout ──────────────────────────────────────────────────────  */
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const token = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
  await authService.logout(token);

  audit.log('logout', { userId: req.userId ?? undefined, ...requestMeta(req) });

  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
  res.json({ success: true, data: null });
});

/* ── getMe ───────────────────────────────────────────────────────  */
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await authService.getMe(req.userId!);
  res.json({ success: true, data: { user } });
});

/* ── logoutAll ───────────────────────────────────────────────────  */
export const logoutAll = asyncHandler(async (req: AuthRequest, res: Response) => {
  await authService.logoutAllDevices(req.userId!);

  audit.log('logout_all', { userId: req.userId!, ...requestMeta(req) });

  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
  res.json({ success: true, data: null });
});
