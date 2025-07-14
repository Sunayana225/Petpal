import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { FoodSafetyService } from '../services/foodSafetyService';

const router = Router();
const foodSafetyService = new FoodSafetyService();

// Validation middleware
const validateFoodSafetyInput = [
  body('pet')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Pet type must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Pet type can only contain letters and spaces'),
  body('food')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Food name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-.,()]+$/)
    .withMessage('Food name contains invalid characters'),
];

const validatePetParam = [
  param('pet')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Pet type must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Pet type can only contain letters and spaces'),
];

// Error handling middleware
const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input provided',
      details: errors.array()
    });
  }
  next();
};

// Async error handler
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * POST /api/food-safety/check
 * Check if a food is safe for a specific pet
 */
router.post('/check',
  validateFoodSafetyInput,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { pet, food } = req.body;
    const startTime = Date.now();

    try {
      console.log(`[FOOD_SAFETY_CHECK] Pet: ${pet}, Food: ${food}, IP: ${req.ip}`);

      const result = await foodSafetyService.checkFoodSafety(pet, food);
      const duration = Date.now() - startTime;

      console.log(`[FOOD_SAFETY_CHECK] Completed in ${duration}ms, Safety: ${result.safety}`);

      res.json({
        ...result,
        requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        processingTime: `${duration}ms`
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[FOOD_SAFETY_CHECK] Error after ${duration}ms:`, error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Something went wrong while checking food safety',
        requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
    }
  })
);

/**
 * GET /api/food-safety/safe/:pet
 * Get all safe foods for a specific pet
 */
router.get('/safe/:pet', (req: Request, res: Response) => {
  try {
    const { pet } = req.params;
    const safeFoods = foodSafetyService.getSafeFoods(pet);
    
    res.json({
      pet,
      safeFoods,
      count: safeFoods.length
    });
  } catch (error) {
    console.error('Error getting safe foods:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong while getting safe foods'
    });
  }
});

/**
 * GET /api/food-safety/unsafe/:pet
 * Get all unsafe foods for a specific pet
 */
router.get('/unsafe/:pet', (req: Request, res: Response) => {
  try {
    const { pet } = req.params;
    const unsafeFoods = foodSafetyService.getUnsafeFoods(pet);
    
    res.json({
      pet,
      unsafeFoods,
      count: unsafeFoods.length
    });
  } catch (error) {
    console.error('Error getting unsafe foods:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong while getting unsafe foods'
    });
  }
});

/**
 * GET /api/food-safety/pets
 * Get all supported pet types
 */
router.get('/pets', (req: Request, res: Response) => {
  try {
    const supportedPets = foodSafetyService.getSupportedPets();
    
    res.json({
      supportedPets,
      count: supportedPets.length
    });
  } catch (error) {
    console.error('Error getting supported pets:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong while getting supported pets'
    });
  }
});

export { router as foodSafetyRouter };
