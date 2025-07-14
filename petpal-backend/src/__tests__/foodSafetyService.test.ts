import { FoodSafetyService } from '../services/foodSafetyService';

describe('FoodSafetyService', () => {
  let service: FoodSafetyService;

  beforeEach(() => {
    service = new FoodSafetyService();
  });

  describe('getSupportedPets', () => {
    test('should return array of supported pets', () => {
      const pets = service.getSupportedPets();
      
      expect(Array.isArray(pets)).toBe(true);
      expect(pets.length).toBeGreaterThan(0);
      expect(pets).toContain('dogs');
      expect(pets).toContain('cats');
      expect(pets).toContain('rabbits');
      expect(pets).toContain('hamsters');
      expect(pets).toContain('birds');
      expect(pets).toContain('turtles');
      expect(pets).toContain('fish');
      expect(pets).toContain('lizards');
      expect(pets).toContain('snakes');
    });

    test('should return exactly 9 pet types', () => {
      const pets = service.getSupportedPets();
      expect(pets.length).toBe(9);
    });
  });

  describe('getSafeFoods', () => {
    test('should return safe foods for dogs', () => {
      const safeFoods = service.getSafeFoods('dog');
      
      expect(Array.isArray(safeFoods)).toBe(true);
      // Should have some safe foods in the database
      expect(safeFoods.length).toBeGreaterThan(0);
    });

    test('should return safe foods for cats', () => {
      const safeFoods = service.getSafeFoods('cat');
      
      expect(Array.isArray(safeFoods)).toBe(true);
      expect(safeFoods.length).toBeGreaterThan(0);
    });

    test('should return empty array for unsupported pet', () => {
      const safeFoods = service.getSafeFoods('dragon');
      
      expect(Array.isArray(safeFoods)).toBe(true);
      expect(safeFoods.length).toBe(0);
    });

    test('should handle case insensitive pet names', () => {
      const safeFoodsLower = service.getSafeFoods('dog');
      const safeFoodsUpper = service.getSafeFoods('DOG');
      const safeFoodsMixed = service.getSafeFoods('Dog');
      
      expect(safeFoodsLower).toEqual(safeFoodsUpper);
      expect(safeFoodsLower).toEqual(safeFoodsMixed);
    });
  });

  describe('getUnsafeFoods', () => {
    test('should return unsafe foods for dogs', () => {
      const unsafeFoods = service.getUnsafeFoods('dog');
      
      expect(Array.isArray(unsafeFoods)).toBe(true);
      expect(unsafeFoods.length).toBeGreaterThan(0);
    });

    test('should return unsafe foods for cats', () => {
      const unsafeFoods = service.getUnsafeFoods('cat');
      
      expect(Array.isArray(unsafeFoods)).toBe(true);
      expect(unsafeFoods.length).toBeGreaterThan(0);
    });

    test('should return empty array for unsupported pet', () => {
      const unsafeFoods = service.getUnsafeFoods('dragon');
      
      expect(Array.isArray(unsafeFoods)).toBe(true);
      expect(unsafeFoods.length).toBe(0);
    });
  });

  describe('checkFoodSafety', () => {
    test('should return result object with required properties', async () => {
      const result = await service.checkFoodSafety('dog', 'apple');
      
      expect(result).toHaveProperty('pet', 'dog');
      expect(result).toHaveProperty('food', 'apple');
      expect(result).toHaveProperty('safety');
      expect(result).toHaveProperty('message');
      expect(['safe', 'unsafe', 'caution', 'unknown']).toContain(result.safety);
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });

    test('should handle chocolate as unsafe for dogs', async () => {
      const result = await service.checkFoodSafety('dog', 'chocolate');
      
      expect(result.pet).toBe('dog');
      expect(result.food).toBe('chocolate');
      expect(result.safety).toBe('unsafe');
      expect(result.message).toContain('NOT SAFE');
    });

    test('should handle case insensitive inputs', async () => {
      const result1 = await service.checkFoodSafety('DOG', 'CHOCOLATE');
      const result2 = await service.checkFoodSafety('dog', 'chocolate');
      
      expect(result1.safety).toBe(result2.safety);
      expect(result1.pet).toBe('DOG'); // Should preserve original case
      expect(result1.food).toBe('CHOCOLATE'); // Should preserve original case
    });

    test('should handle whitespace in inputs', async () => {
      const result = await service.checkFoodSafety('  dog  ', '  chocolate  ');
      
      expect(result.pet).toBe('  dog  '); // Should preserve original
      expect(result.food).toBe('  chocolate  '); // Should preserve original
      expect(result.safety).toBe('unsafe');
    });

    test('should handle unknown foods gracefully', async () => {
      const result = await service.checkFoodSafety('dog', 'unknownfooditem12345');
      
      expect(result.pet).toBe('dog');
      expect(result.food).toBe('unknownfooditem12345');
      expect(['safe', 'unsafe', 'caution', 'unknown']).toContain(result.safety);
      expect(typeof result.message).toBe('string');
    });

    test('should handle all supported pet types', async () => {
      const pets = service.getSupportedPets();
      
      for (const pet of pets) {
        const result = await service.checkFoodSafety(pet, 'apple');
        
        expect(result.pet).toBe(pet);
        expect(result.food).toBe('apple');
        expect(['safe', 'unsafe', 'caution', 'unknown']).toContain(result.safety);
        expect(typeof result.message).toBe('string');
      }
    });

    test('should handle unsupported pet types', async () => {
      const result = await service.checkFoodSafety('dragon', 'apple');
      
      expect(result.pet).toBe('dragon');
      expect(result.food).toBe('apple');
      expect(['safe', 'unsafe', 'caution', 'unknown']).toContain(result.safety);
    });

    test('should return consistent results for same inputs', async () => {
      const result1 = await service.checkFoodSafety('dog', 'apple');
      const result2 = await service.checkFoodSafety('dog', 'apple');
      
      expect(result1.safety).toBe(result2.safety);
      expect(result1.pet).toBe(result2.pet);
      expect(result1.food).toBe(result2.food);
    });

    test('should handle empty strings gracefully', async () => {
      const result = await service.checkFoodSafety('', '');
      
      expect(result).toHaveProperty('pet', '');
      expect(result).toHaveProperty('food', '');
      expect(result).toHaveProperty('safety');
      expect(result).toHaveProperty('message');
    });

    test('should include details when available', async () => {
      const result = await service.checkFoodSafety('dog', 'chocolate');
      
      if (result.details) {
        expect(typeof result.details).toBe('object');
        expect(result.details).toHaveProperty('food');
        expect(result.details).toHaveProperty('safety');
      }
    });
  });

  describe('Performance', () => {
    test('should respond quickly for database lookups', async () => {
      const startTime = Date.now();
      await service.checkFoodSafety('dog', 'chocolate');
      const endTime = Date.now();
      
      // Should complete within 100ms for database lookups
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should handle multiple concurrent requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(service.checkFoodSafety('dog', 'apple'));
      }
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result.pet).toBe('dog');
        expect(result.food).toBe('apple');
        expect(['safe', 'unsafe', 'caution', 'unknown']).toContain(result.safety);
      });
    });
  });
});
