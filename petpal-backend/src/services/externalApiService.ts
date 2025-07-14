// External API service for integrating with third-party pet food databases

// Type definitions for Open Pet Food Facts API
interface OpenPetFoodFactsProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
  image_front_url?: string;
  categories?: string;
}

interface OpenPetFoodFactsSearchResponse {
  products: OpenPetFoodFactsProduct[];
  count: number;
}

interface OpenPetFoodFactsProductResponse {
  status: number;
  product?: OpenPetFoodFactsProduct;
}

export interface ExternalFoodSafetyResponse {
  food: string;
  pet: string;
  safety: 'safe' | 'unsafe' | 'caution' | 'unknown';
  message: string;
  details: {
    description: string;
    source: string;
    ingredients?: string[];
    brand?: string;
    product_name?: string;
    barcode?: string;
    image_url?: string;
    recommendation?: string;
  };
}

export class ExternalApiService {
  private static readonly OPEN_PET_FOOD_FACTS_BASE_URL = 'https://world.openpetfoodfacts.org/api/v2';

  /**
   * Search for commercial pet food products by name or barcode
   */
  static async searchPetFood(query: string): Promise<ExternalFoodSafetyResponse | null> {
    try {
      // First try to search by product name
      const searchResponse = await fetch(
        `${this.OPEN_PET_FOOD_FACTS_BASE_URL}/search?search_terms=${encodeURIComponent(query)}&page_size=5&fields=code,product_name,brands,ingredients_text,image_front_url,categories`
      );

      if (!searchResponse.ok) {
        console.log('Open Pet Food Facts search failed:', searchResponse.status);
        return null;
      }

      const searchData = await searchResponse.json() as OpenPetFoodFactsSearchResponse;

      if (!searchData.products || searchData.products.length === 0) {
        console.log('No products found in Open Pet Food Facts for:', query);
        return null;
      }

      // Get the first matching product and check if it's relevant
      const product = searchData.products[0];

      // Check if the product is actually relevant to the search query
      if (!this.isRelevantProduct(product, query)) {
        console.log('No relevant products found in Open Pet Food Facts for:', query);
        return null;
      }

      return this.formatOpenPetFoodFactsResponse(product, query);
    } catch (error) {
      console.error('Error searching Open Pet Food Facts:', error);
      return null;
    }
  }

  /**
   * Get pet food product by barcode
   */
  static async getPetFoodByBarcode(barcode: string): Promise<ExternalFoodSafetyResponse | null> {
    try {
      const response = await fetch(
        `${this.OPEN_PET_FOOD_FACTS_BASE_URL}/product/${barcode}.json`
      );

      if (!response.ok) {
        console.log('Open Pet Food Facts barcode lookup failed:', response.status);
        return null;
      }

      const data = await response.json() as OpenPetFoodFactsProductResponse;

      if (data.status === 0 || !data.product) {
        console.log('Product not found in Open Pet Food Facts for barcode:', barcode);
        return null;
      }

      return this.formatOpenPetFoodFactsResponse(data.product, barcode);
    } catch (error) {
      console.error('Error fetching from Open Pet Food Facts:', error);
      return null;
    }
  }

  /**
   * Format Open Pet Food Facts response into our standard format
   */
  private static formatOpenPetFoodFactsResponse(product: OpenPetFoodFactsProduct, query: string): ExternalFoodSafetyResponse {
    const productName = product.product_name || product.brands || 'Unknown Product';
    const ingredients = product.ingredients_text ? 
      product.ingredients_text.split(',').map((ing: string) => ing.trim()) : 
      [];

    // Analyze ingredients for basic safety (this is a simple heuristic)
    const safety = this.analyzePetFoodSafety(ingredients, product.categories);

    return {
      food: query,
      pet: 'general', // Open Pet Food Facts doesn't specify pet type
      safety,
      message: `Commercial pet food "${productName}" found in database.`,
      details: {
        description: `Commercial pet food product: ${productName}. ${ingredients.length > 0 ? `Contains: ${ingredients.slice(0, 5).join(', ')}${ingredients.length > 5 ? '...' : ''}` : 'Ingredients not available.'}`,
        source: 'Open Pet Food Facts',
        ingredients,
        brand: product.brands,
        product_name: productName,
        barcode: product.code,
        image_url: product.image_front_url,
        recommendation: 'This is commercial pet food data. Always check with your veterinarian for specific dietary advice.'
      }
    };
  }

  /**
   * Check if a product is relevant to the search query
   */
  private static isRelevantProduct(product: OpenPetFoodFactsProduct, query: string): boolean {
    const queryLower = query.toLowerCase();
    const productName = (product.product_name || '').toLowerCase();
    const brands = (product.brands || '').toLowerCase();

    // Check if query appears in product name or brands
    if (productName.includes(queryLower) || brands.includes(queryLower)) {
      return true;
    }

    // Check for common pet food brands
    const commonPetFoodBrands = [
      'purina', 'royal canin', 'hills', 'iams', 'pedigree', 'whiskas',
      'blue buffalo', 'wellness', 'orijen', 'acana', 'nutro', 'eukanuba'
    ];

    for (const brand of commonPetFoodBrands) {
      if (queryLower.includes(brand) && (productName.includes(brand) || brands.includes(brand))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Basic safety analysis of pet food ingredients
   */
  private static analyzePetFoodSafety(ingredients: string[], categories?: string): 'safe' | 'unsafe' | 'caution' | 'unknown' {
    if (!ingredients || ingredients.length === 0) {
      return 'unknown';
    }

    const ingredientText = ingredients.join(' ').toLowerCase();
    
    // Check for known dangerous ingredients
    const dangerousIngredients = [
      'chocolate', 'cocoa', 'xylitol', 'onion', 'garlic', 'grape', 'raisin',
      'avocado', 'macadamia', 'alcohol', 'caffeine'
    ];

    for (const dangerous of dangerousIngredients) {
      if (ingredientText.includes(dangerous)) {
        return 'unsafe';
      }
    }

    // Check for questionable ingredients that require caution
    const cautionIngredients = [
      'artificial', 'preservative', 'by-product', 'meal', 'digest'
    ];

    for (const caution of cautionIngredients) {
      if (ingredientText.includes(caution)) {
        return 'caution';
      }
    }

    // If it's specifically categorized as pet food, it's generally safe
    if (categories && categories.toLowerCase().includes('pet')) {
      return 'safe';
    }

    return 'unknown';
  }

  /**
   * Search multiple external sources for food safety information
   */
  static async searchAllSources(food: string, pet: string): Promise<ExternalFoodSafetyResponse | null> {
    // Try Open Pet Food Facts first
    const petFoodResult = await this.searchPetFood(food);
    if (petFoodResult) {
      return petFoodResult;
    }

    // Could add more external APIs here in the future
    // - dogFoodApi (if we find the correct endpoint)
    // - Other pet food databases
    
    return null;
  }
}
