import { z } from 'zod';

export const updateProfileSchema = z.object({
  email: z
    .string()
    .email('Ungültige E-Mail-Adresse')
    .max(255)
    .toLowerCase()
    .trim()
    .optional(),
  username: z
    .string()
    .min(2,  'Name min. 2 Zeichen')
    .max(50, 'Name max. 50 Zeichen')
    .trim()
    .optional(),
}).refine(
  (d) => d.email !== undefined || d.username !== undefined,
  { message: 'Mindestens ein Feld (email oder username) muss angegeben werden' }
);

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort erforderlich').max(200),
  newPassword: z
    .string()
    .min(8,   'Mindestens 8 Zeichen')
    .max(100, 'Maximal 100 Zeichen')
    .regex(/[A-Z]/, 'Mindestens ein Großbuchstabe')
    .regex(/[0-9]/, 'Mindestens eine Zahl'),
}).refine(
  (d) => d.currentPassword !== d.newPassword,
  { message: 'Neues Passwort darf nicht gleich dem aktuellen sein', path: ['newPassword'] }
);

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Passwort zur Bestätigung erforderlich').max(200),
});

export type UpdateProfileDto   = z.infer<typeof updateProfileSchema>;
export type ChangePasswordDto  = z.infer<typeof changePasswordSchema>;
export type DeleteAccountDto   = z.infer<typeof deleteAccountSchema>;
