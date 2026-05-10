import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Name ist erforderlich' })
    .min(1,   'Name darf nicht leer sein')
    .max(100, 'Name max. 100 Zeichen')
    .trim(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Farbe muss ein gültiger Hex-Code sein (z.B. #3b82f6)')
    .default('#3b82f6'),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
