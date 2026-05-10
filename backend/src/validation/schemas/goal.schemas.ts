import { z } from 'zod';

export const upsertGoalSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly'], {
    errorMap: () => ({ message: 'Zeitraum muss daily, weekly oder monthly sein' }),
  }),
  targetHours: z
    .number({ required_error: 'Zielstunden erforderlich' })
    .min(0.5, 'Mindestens 0.5 Stunden')
    .max(200, 'Maximal 200 Stunden'),
});

export type UpsertGoalDto = z.infer<typeof upsertGoalSchema>;
