/*
 * tests/validation.test.ts
 * Unit-Tests für Zod-Schemas — kein DB-Zugriff nötig.
 */

import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validation/schemas/auth.schemas';

describe('registerSchema', () => {
  const valid = { email: 'User@Example.com', password: 'Password1', username: 'TestUser' };

  it('akzeptiert gültige Daten', () => {
    const result = registerSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('normalisiert E-Mail zu Kleinbuchstaben', () => {
    const result = registerSchema.safeParse(valid);
    expect(result.success && result.data.email).toBe('user@example.com');
  });

  it('lehnt kurzes Passwort ab', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'Ab1' }).success).toBe(false);
  });

  it('lehnt Passwort ohne Großbuchstaben ab', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'password1' }).success).toBe(false);
  });

  it('lehnt Passwort ohne Zahl ab', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'Password' }).success).toBe(false);
  });

  it('lehnt ungültige E-Mail ab', () => {
    expect(registerSchema.safeParse({ ...valid, email: 'kein-email' }).success).toBe(false);
  });

  it('lehnt zu langen Benutzernamen ab', () => {
    expect(registerSchema.safeParse({ ...valid, username: 'a'.repeat(51) }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('akzeptiert gültige Login-Daten', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: 'Password1' });
    expect(result.success).toBe(true);
  });

  it('lehnt fehlende Felder ab', () => {
    expect(loginSchema.safeParse({ email: 'test@test.com' }).success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('akzeptiert gültige E-Mail', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'test@test.com' }).success).toBe(true);
  });

  it('lehnt ungültige E-Mail ab', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'nicht-email' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  const validToken = 'a'.repeat(128);

  it('akzeptiert gültige Reset-Daten', () => {
    const result = resetPasswordSchema.safeParse({ token: validToken, password: 'NewPass1' });
    expect(result.success).toBe(true);
  });

  it('lehnt Token falscher Länge ab', () => {
    expect(resetPasswordSchema.safeParse({ token: 'abc', password: 'NewPass1' }).success).toBe(false);
  });
});
