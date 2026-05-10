import { Router } from 'express';
import { register, login, refresh, logout, getMe, logoutAll } from '../controllers/auth.controller';
import { forgotPassword, resetPassword }                       from '../controllers/password-reset.controller';
import { auth }                  from '../middleware/auth';
import { authLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter';
import { validate }              from '../validation';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validation';

const router = Router();

// ── Öffentliche Routen ──────────────────────────────────────────
router.post('/register',       authLimiter,            validate(registerSchema),      register);
router.post('/login',          authLimiter,            validate(loginSchema),         login);
router.post('/refresh',        authLimiter,            refresh);

// Forgot / Reset Password
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password',  authLimiter,           validate(resetPasswordSchema),  resetPassword);

// ── Geschützte Routen ───────────────────────────────────────────
router.get( '/me',         auth, getMe);
router.post('/logout',     auth, logout);
router.post('/logout-all', auth, logoutAll);

export default router;
