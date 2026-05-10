/*
 * routes/categories.routes.ts
 *
 *  GET    /api/categories      → Alle eigenen Kategorien abrufen
 *  POST   /api/categories      → Neue Kategorie erstellen
 *  DELETE /api/categories/:id  → Kategorie löschen
 */

import { Router } from 'express';
import { getCategories, createCategory, deleteCategory }
  from '../controllers/categories.controller';
import { auth }     from '../middleware/auth';
import { validate } from '../validation';
import { createCategorySchema } from '../validation/schemas/category.schemas';

const router = Router();

router.get('/',       auth,                                     getCategories);
router.post('/',      auth, validate(createCategorySchema),     createCategory);
router.delete('/:id', auth,                                     deleteCategory);

export default router;
