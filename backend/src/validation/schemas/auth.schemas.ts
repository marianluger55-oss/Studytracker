import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'E-Mail ist erforderlich' })
    .email('Ungültige E-Mail-Adresse')
    .max(255, 'E-Mail max. 255 Zeichen')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Passwort ist erforderlich' })
    .min(8,   'Mindestens 8 Zeichen')
    .max(100, 'Maximal 100 Zeichen')
    .regex(/[A-Z]/, 'Mindestens ein Großbuchstabe')
    .regex(/[0-9]/, 'Mindestens eine Zahl'),
  username: z
    .string({ required_error: 'Benutzername ist erforderlich' })
    .min(2,  'Name min. 2 Zeichen')
    .max(50, 'Name max. 50 Zeichen')
    .trim(),
});

export const loginSchema = z.object({
  email:    z.string().email('Ungültige E-Mail-Adresse').toLowerCase().trim(),
  password: z.string().min(1, 'Passwort erforderlich').max(200),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z
    .string({ required_error: 'Token erforderlich' })
    .length(128, 'Ungültiger Token'),
  password: z
    .string({ required_error: 'Passwort ist erforderlich' })
    .min(8,   'Mindestens 8 Zeichen')
    .max(100, 'Maximal 100 Zeichen')
    .regex(/[A-Z]/, 'Mindestens ein Großbuchstabe')
    .regex(/[0-9]/, 'Mindestens eine Zahl'),
});

export type RegisterDto        = z.infer<typeof registerSchema>;
export type LoginDto           = z.infer<typeof loginSchema>;
export type ForgotPasswordDto  = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto   = z.infer<typeof resetPasswordSchema>;
