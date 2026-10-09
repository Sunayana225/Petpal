import * as fs from 'fs';
import * as path from 'path';
import { AIService } from './aiService';
import { ExternalApiService } from './externalApiService';
import { manyPetsFoodSafetyData } from '../data/manyPetsFoodSafetyData';

export interface FoodItem {
  food: string;
  safety: 'safe' | 'unsafe' | 'caution' | 'unknown';
  description: string;
  symptoms?: string[];
  benefits?: string[];
  severity?: 'low' | 'medium' | 'high';
  alternatives?: string[];
  preparation?: string;
  recommendation?: string;
  caution?: string;
  // External API fields
  source?: string;
  brand?: string;
  product_name?: string;
  barcode?: string;
  image_url?: string;
  ingredients?: string[];
}

export interface FoodSafetyResult {
  pet: string;
  food: string;
  safety: 'safe' | 'unsafe' | 'caution' | 'unknown';
  message: string;
  details?: FoodItem;
}

export class FoodSafetyService {
  private data: any;

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      const dataPath = path.join(__dirname, '../../data/foodSafety.json');
      const rawData = fs.readFileSync(dataPath, 'utf8');
      this.data = JSON.parse(rawData);
    } catch (error) {
      console.error('Error loading food safety data:', error);
      this.data = {};
    }
  }

  private searchManyPetsDatabase(food: string, pet: string): FoodItem | null {
    const petData = manyPetsFoodSafetyData[pet as keyof typeof manyPetsFoodSafetyData];
    if (!petData || typeof petData !== 'object' || !('safe' in petData)) return null;

    const searchTerm = food.toLowerCase().trim();

    // Enhanced search function with fuzzy matching
    const findFoodItem = (items: any[]) => {
      return items.find((item: any) => {
        const itemFood = item.food.toLowerCase();

        // Exact match
        if (itemFood === searchTerm) return true;

        // Handle plural/singular variations with proper "ies" handling
        const getSingular = (word: string) => {
          if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
          if (word.endsWith('s')) return word.slice(0, -1);
          return word;
        };

        const getPlural = (word: string) => {
          if (word.endsWith('y')) return word.slice(0, -1) + 'ies';
          if (!word.endsWith('s')) return word + 's';
          return word;
        };

        const singularSearch = getSingular(searchTerm);
        const pluralSearch = getPlural(searchTerm);
        const singularItem = getSingular(itemFood);
        const pluralItem = getPlural(itemFood);

        if (singularItem === singularSearch || pluralItem === pluralSearch) return true;

        // Handle common misspellings
        const normalizedSearch = searchTerm.replace(/ys$/, 'ies'); // strawberrys -> strawberries
        const normalizedItem = itemFood.replace(/ys$/, 'ies');

        if (normalizedItem === normalizedSearch || normalizedItem.includes(normalizedSearch)) return true;

        // Partial match (contains)
        if (itemFood.includes(searchTerm) || searchTerm.includes(itemFood)) return true;

        return false;
      });
    };

    // Search in safe foods
    const safeFood = findFoodItem(petData.safe);
    if (safeFood) {
      return {
        food: safeFood.food,
        safety: 'safe',
        description: safeFood.description,
        source: safeFood.source,
        recommendation: 'Generally safe for consumption. Always introduce new foods gradually.'
      };
    }

    // Search in unsafe foods
    const unsafeFood = findFoodItem(petData.unsafe);
    if (unsafeFood) {
      return {
        food: unsafeFood.food,
        safety: 'unsafe',
        description: unsafeFood.description,
        source: unsafeFood.source,
        severity: (unsafeFood.severity as 'low' | 'medium' | 'high') || 'high',
        recommendation: 'This food is not safe for your pet. Avoid feeding and contact your veterinarian if consumed.'
      };
    }

    // Search in caution foods
    const cautionFood = findFoodItem(petData.caution);
    if (cautionFood) {
      return {
        food: cautionFood.food,
        safety: 'caution',
        description: cautionFood.description,
        source: cautionFood.source,
        recommendation: cautionFood.recommendation || 'Safe in moderation. Consult your veterinarian for specific guidance.'
      };
    }

    return null;
  }

  private generateMessage(safety: string, food: string, pet: string, source: string): string {
    switch (safety) {
      case 'safe':
        return `✅ ${food} is SAFE for ${pet} according to ${source}!`;
      case 'unsafe':
        return `⚠️ ${food} is NOT SAFE for ${pet} according to ${source}!`;
      case 'caution':
        return `⚠️ ${food} should be given with CAUTION to ${pet} according to ${source}!`;
      default:
        return `❓ Safety information for ${food} and ${pet} is unclear. Consult your veterinarian.`;
    }
  }

  /**
   * Check if a food is safe for a specific pet
   */
  async checkFoodSafety(pet: string, food: string): Promise<FoodSafetyResult> {
    const normalizedPet = pet.toLowerCase();
    const normalizedFood = food.toLowerCase().trim();

    // PRIORITY 1: Check ManyPets database first (most comprehensive and reliable)
    const manyPetsResult = this.searchManyPetsDatabase(normalizedFood, normalizedPet);
    if (manyPetsResult) {
      return {
        pet,
        food,
        safety: manyPetsResult.safety,
        message: this.generateMessage(manyPetsResult.safety, food, pet, 'ManyPets database'),
        details: manyPetsResult
      };
    }

    // PRIORITY 2: Check legacy local database
    if (this.data[normalizedPet]) {
      const petData = this.data[normalizedPet];

      // Search in unsafe foods
      const unsafeFood = this.findFood(petData.unsafe, normalizedFood);
      if (unsafeFood) {
        return {
          pet,
          food,
          safety: 'unsafe',
          message: `⚠️ ${food} is NOT SAFE for ${pet}!`,
          details: unsafeFood
        };
      }

      // Search in safe foods
      const safeFood = this.findFood(petData.safe, normalizedFood);
      if (safeFood) {
        return {
          pet,
          food,
          safety: 'safe',
          message: `✅ ${food} is SAFE for ${pet}!`,
          details: safeFood
        };
      }

      // Search in caution foods
      const cautionFood = this.findFood(petData.caution, normalizedFood);
      if (cautionFood) {
        return {
          pet,
          food,
          safety: 'caution',
          message: `⚠️ ${food} should be given with CAUTION to ${pet}.`,
          details: cautionFood
        };
      }
    }

    // Food not found in database - try external APIs first, then AI assistance
    try {
      // Try external pet food databases (commercial products)
      const externalResponse = await ExternalApiService.searchAllSources(food, pet);
      if (externalResponse) {
        return {
          pet,
          food,
          safety: externalResponse.safety,
          message: `${externalResponse.message} (External database)`,
          details: {
            food: externalResponse.food,
            safety: externalResponse.safety,
            description: externalResponse.details.description,
            source: externalResponse.details.source,
            brand: externalResponse.details.brand,
            product_name: externalResponse.details.product_name,
            barcode: externalResponse.details.barcode,
            image_url: externalResponse.details.image_url,
            ingredients: externalResponse.details.ingredients,
            recommendation: externalResponse.details.recommendation
          }
        };
      }

      // If no external data found, try AI assistance
      const aiResponse = await AIService.getFoodSafetyAdvice(food, pet);
      return {
        pet,
        food,
        safety: aiResponse.safety,
        message: aiResponse.message,
        details: {
          food: aiResponse.food,
          safety: aiResponse.safety,
          description: aiResponse.details.description,
          symptoms: aiResponse.details.symptoms,
          benefits: aiResponse.details.benefits,
          alternatives: aiResponse.details.alternatives,
          preparation: aiResponse.details.preparation,
          recommendation: aiResponse.details.recommendation,
          severity: aiResponse.details.severity
        }
      };
    } catch (error) {
      console.error('External API and AI Service failed, falling back to unknown:', error);
      return {
        pet,
        food,
        safety: 'unknown',
        message: `We don't have specific information about ${food} for ${pet}. Please consult your veterinarian to be safe. (AI-assisted)`
      };
    }
  }

  /**
   * Find a food item in a category array
   */
  private findFood(foodArray: FoodItem[], searchFood: string): FoodItem | null {
    return foodArray.find(item => 
      item.food.toLowerCase() === searchFood ||
      item.food.toLowerCase().includes(searchFood) ||
      searchFood.includes(item.food.toLowerCase())
    ) || null;
  }

  /**
   * Get all safe foods for a pet
   */
  getSafeFoods(pet: string): FoodItem[] {
    const normalizedPet = pet.toLowerCase();
    if (!this.data[normalizedPet]) {
      return [];
    }
    return this.data[normalizedPet].safe || [];
  }

  /**
   * Get all unsafe foods for a pet
   */
  getUnsafeFoods(pet: string): FoodItem[] {
    const normalizedPet = pet.toLowerCase();
    if (!this.data[normalizedPet]) {
      return [];
    }
    return this.data[normalizedPet].unsafe || [];
  }

  /**
   * Get all supported pet types
   */
  getSupportedPets(): string[] {
    return Object.keys(this.data);
  }
}
