/*
 * controllers/categories.controller.ts
 * ─────────────────────────────────────────────────────────────
 * HTTP-Handler für Kategorien-Endpunkte.
 *
 * Alle Antworten: { success: true, data: {} }
 * Datenisolation: req.userId filtert alle Queries — Nutzer sehen nur eigene Kategorien.
 * ─────────────────────────────────────────────────────────────
 */

import { Response }             from 'express';
import * as categoriesService   from '../services/categories.service';
import { AuthRequest }          from '../types';
import { asyncHandler }         from '../utils/asyncHandler'; /* Async-Fehler → next() */
import { AppError }             from '../middleware/errorHandler';

/* GET /categories — alle Kategorien des eingeloggten Nutzers (mit Gesamtlernzeit) */
export const getCategories = asyncHandler(async (req: AuthRequest, res: Response) => {
  const categories = await categoriesService.getCategories(req.userId!);
  res.json({ success: true, data: { categories } });
});

/* POST /categories — neue Kategorie anlegen */
export const createCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  /* req.body bereits durch validate(createCategorySchema) in der Route geprüft — Typen sind sicher */
  const { name, color } = req.body as { name: string; color: string };
  const category = await categoriesService.createCategory(req.userId!, name, color);
  res.status(201).json({ success: true, data: { category } }); /* 201 Created */
});

/* DELETE /categories/:id — Kategorie löschen (Sessions bleiben, category_id → NULL) */
export const deleteCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);     /* URL-Parameter ':id' als Zahl */
  if (isNaN(id)) throw new AppError(400, 'Ungültige Kategorie-ID');

  /* deleteCategory gibt false zurück wenn Kategorie nicht existiert oder andere userId */
  const deleted = await categoriesService.deleteCategory(id, req.userId!);
  if (!deleted) throw new AppError(404, 'Kategorie nicht gefunden');

  res.json({ success: true, data: null }); /* Kein Body bei Löschung */
});
