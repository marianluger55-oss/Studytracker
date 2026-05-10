/*
 * routes/sessions.routes.ts
 *
 *  POST   /api/sessions       → Neue Session speichern
 *  GET    /api/sessions       → Alle eigenen Sessions abrufen
 *  GET    /api/sessions/:id   → Eine Session abrufen
 *  DELETE /api/sessions/:id   → Eine Session löschen
 */

import { Router } from 'express';
import { createSession, getSessions, getSessionById, deleteSession }
  from '../controllers/sessions.controller';
import { auth }     from '../middleware/auth';
import { validate } from '../validation';
import { createSessionSchema } from '../validation/schemas/session.schemas';

const router = Router();

router.post('/',      auth, validate(createSessionSchema), createSession);
router.get('/',       auth,                                getSessions);
router.get('/:id',    auth,                                getSessionById);
router.delete('/:id', auth,                                deleteSession);

export default router;
