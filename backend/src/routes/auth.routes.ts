/*
 * routes/auth.routes.ts
 * ─────────────────────────────────────────────────────────────
 * Auth-Routen: Register, Login, Token-Refresh, Logout.
 *
 * Middleware-Chain erklärt:
 *  authLimiter:          Rate-Limiter gegen Brute-Force (10 Req/Min)
 *  forgotPasswordLimiter: Extra strenger Limiter (3 Req/15 Min) gegen E-Mail-Flut
 *  validate(schema):     Zod-Validierung des Request-Bodys vor Controller
 *  auth:                 JWT-Authentifizierung — setzt req.userId
 *
 * Öffentliche Routen: kein auth-Middleware (Token noch nicht vorhanden)
 * Geschützte Routen: auth-Middleware prüft Bearer-Token
 * ─────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import { register, login, refresh, logout, getMe, logoutAll } from '../controllers/auth.controller';
import { forgotPassword, resetPassword }                       from '../controllers/password-reset.controller';
import { auth }                  from '../middleware/auth';
import { authLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter';
import { validate }              from '../validation';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validation';

const router = Router();

/* ── Öffentliche Routen (kein JWT nötig) ─────────────────────── */
router.post('/register',        authLimiter,            validate(registerSchema),       register);   /* Neuen Account erstellen */
router.post('/login',           authLimiter,            validate(loginSchema),          login);      /* Einloggen → AccessToken + RefreshToken */
router.post('/refresh',         authLimiter,            refresh);                                   /* Neuen AccessToken via RefreshToken-Cookie */

/* Passwort-Reset Flow */
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword); /* Reset-E-Mail senden */
router.post('/reset-password',  authLimiter,           validate(resetPasswordSchema),  resetPassword);  /* Neues Passwort mit Token setzen */

/* ── Geschützte Routen (JWT erforderlich) ───────────────────── */
router.get( '/me',         auth, getMe);      /* Aktuelles Nutzerprofil abrufen */
router.post('/logout',     auth, logout);     /* RefreshToken-Cookie löschen */
router.post('/logout-all', auth, logoutAll);  /* Alle RefreshTokens widerrufen (alle Geräte) */

export default router;
