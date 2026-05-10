/*
 * controllers/categories.controller.ts
 * HTTP-Handler für Kategorien-Endpunkte.
 * Alle Antworten: { success: true, data: {} }
 */

import { Response }             from 'express';
import * as categoriesService   from '../services/categories.service';
import { AuthRequest }          from '../types';
import { asyncHandler }         from '../utils/asyncHandler';
import { AppError }             from '../middleware/errorHandler';

export const getCategories = asyncHandler(async (req: AuthRequest, res: Response) => {
  const categories = await categoriesService.getCategories(req.userId!);
  res.json({ success: true, data: { categories } });
});

export const createCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  /* req.body bereits durch validate(createCategorySchema) in der Route geprüft */
  const { name, color } = req.body as { name: string; color: string };
  const category = await categoriesService.createCategory(req.userId!, name, color);
  res.status(201).json({ success: true, data: { category } });
});

export const deleteCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new AppError(400, 'Ungültige Kategorie-ID');

  const deleted = await categoriesService.deleteCategory(id, req.userId!);
  if (!deleted) throw new AppError(404, 'Kategorie nicht gefunden');

  res.json({ success: true, data: null });
});
