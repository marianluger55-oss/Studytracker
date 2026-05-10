import { z } from 'zod';

export const createSessionSchema = z.object({
  categoryId: z.number().int().positive().nullable().default(null),
  startTime:  z.string().datetime({ message: 'Ungültiges Datum (ISO 8601 erwartet)' }),
  endTime:    z.string().datetime({ message: 'Ungültiges Datum (ISO 8601 erwartet)' }),
  duration:   z.number().int().min(1, 'Dauer muss mindestens 1 Sekunde sein').max(86_400, 'Dauer max. 24h'),
  notes:      z.string().max(1000, 'Notiz max. 1000 Zeichen').trim().optional(),
}).refine(
  (d) => new Date(d.endTime) > new Date(d.startTime),
  { message: 'endTime muss nach startTime liegen', path: ['endTime'] }
);

export type CreateSessionDto = z.infer<typeof createSessionSchema>;
