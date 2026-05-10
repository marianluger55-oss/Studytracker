/*
 * routes/goals.routes.ts
 *
 *  GET    /api/goals      → Alle Ziele des Nutzers
 *  POST   /api/goals      → Ziel erstellen oder überschreiben (UPSERT)
 *  DELETE /api/goals/:id  → Ziel löschen
 */

import { Router } from 'express';
import { getGoals, upsertGoal, deleteGoal } from '../controllers/goals.controller';
import { auth }     from '../middleware/auth';
import { validate } from '../validation';
import { upsertGoalSchema } from '../validation/schemas/goal.schemas';

const router = Router();

router.get('/',       auth,                               getGoals);
router.post('/',      auth, validate(upsertGoalSchema),   upsertGoal);
router.delete('/:id', auth,                               deleteGoal);

export default router;
