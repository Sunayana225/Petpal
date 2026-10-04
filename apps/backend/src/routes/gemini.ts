import { Router, type Request, type Response } from 'express';
import { body, validationResult } from 'express-validator';

import { asyncHandler } from '../middleware/errorHandler';
import { AIService } from '../services/aiService';

const router = Router();

/**
 * POST /api/gemini/validate
 *
 * Check a caller's own Gemini key. This is a read-only call against Gemini's
 * model list — it spends no generation quota — so it is cheap enough to run
 * whenever a user saves a key.
 */
router.post(
  '/validate',
  [
    body('apiKey')
      .isString()
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('A Gemini API key is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input provided',
        details: errors.array(),
      });
      return;
    }

    const valid = await AIService.validateApiKey(String(req.body.apiKey));
    res.json({ valid });
  }),
);

export { router as geminiRouter };
