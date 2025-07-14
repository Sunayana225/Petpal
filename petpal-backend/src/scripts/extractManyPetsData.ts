// Script to extract ManyPets food safety data and populate our database
import * as fs from 'fs';
import * as path from 'path';

interface ManyPetsFood {
  name: string;
  safety: 'safe' | 'unsafe' | 'caution';
  url: string;
  description?: string;
}

// ManyPets food safety data extracted from their website
// This data was manually extracted from https://manypets.com/us/pet-food-safety/
const manyPetsData: ManyPetsFood[] = [
  // UNSAFE FOODS
  { name: 'acorns', safety: 'unsafe', url: '/us/pet-food-safety/can-my-pet-eat-acorns/' },
  { name: 'almonds', safety: 'unsafe', url: '/us/pet-food-safety/can-my-pet-eat-almonds/' },
  { name: 'bacon', safety: 'unsafe', url: '/us/pet-food-safety/can-my-pet-eat-bacon/' },
  { name: 'baked beans', safety: 'unsafe', url: '/us/pet-food-safety/can-my-pet-eat-baked-beans/' },
  { name: 'blue cheese', safety: 'unsafe', url: '/us/pet-food-safety/can-my-pet-eat-blue-cheese/' },
  { name: 'bones', safety: 'unsafe', url: '/us/pet-food-safety/can-my-pet-eat-bones/' },
  { name: 'chocolate', safety: 'unsafe', url: '/us/pet-food-safety/can-my-pet-eat-chocolate/' },
  { name: 'garlic', safety: 'unsafe', url: '/us/pet-food-safety/can-my-pet-eat-garlic/' },
  { name: 'grapes', safety: 'unsafe', url: '/us/pet-food-safety/can-my-pet-eat-grapes-raisins/' },
  { name: 'raisins', safety: 'unsafe', url: '/us/pet-food-safety/can-my-pet-eat-grapes-raisins/' },
  { name: 'onions', safety: 'unsafe', url: '/us/pet-food-safety/can-my-pet-eat-onions/' },
  { name: 'macadamia nuts', safety: 'unsafe', url: '/us/pet-food-safety/can-my-pet-eat-macadamia-nuts/' },
  { name: 'walnuts', safety: 'unsafe', url: '/us/pet-food-safety/can-my-pet-eat-walnuts/' },
  { name: 'pecans', safety: 'unsafe', url: '/us/pet-food-safety/can-my-pet-eat-pecans/' },
  { name: 'ham', safety: 'unsafe', url: '/us/pet-food-safety/can-my-pet-eat-ham/' },

  // SAFE IN MODERATION (CAUTION)
  { name: 'asparagus', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-asparagus/' },
  { name: 'avocado', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-avocado/' },
  { name: 'banana', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-bananas/' },
  { name: 'basil', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-basil/' },
  { name: 'beets', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-beets/' },
  { name: 'bell peppers', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-bell-peppers/' },
  { name: 'broccoli', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-broccoli/' },
  { name: 'brussels sprouts', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-brussels-sprouts/' },
  { name: 'carrots', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-carrots/' },
  { name: 'cheese', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-cheese/' },
  { name: 'corn', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-corn/' },
  { name: 'eggs', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-eggs/' },
  { name: 'green beans', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-green-beans/' },
  { name: 'lettuce', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-lettuce/' },
  { name: 'mushrooms', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-mushrooms/' },
  { name: 'oranges', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-oranges/' },
  { name: 'peanuts', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-peanuts/' },
  { name: 'peanut butter', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-plain-peanut-butter/' },
  { name: 'peas', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-peas/' },
  { name: 'potatoes', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-potatoes/' },
  { name: 'rice', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-rice/' },
  { name: 'spinach', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-spinach/' },
  { name: 'sweet potatoes', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-sweet-potatoes/' },
  { name: 'tomatoes', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-tomatoes/' },
  { name: 'turkey', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-turkey/' },
  { name: 'yogurt', safety: 'caution', url: '/us/pet-food-safety/can-my-pet-eat-yogurt/' },

  // SAFE FOODS
  { name: 'apples', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-apples/' },
  { name: 'blackberries', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-blackberries/' },
  { name: 'blueberries', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-blueberries/' },
  { name: 'cantaloupe', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-cantaloupe/' },
  { name: 'cherries', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-cherries/' },
  { name: 'chicken', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-chicken/' },
  { name: 'cranberries', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-cranberries/' },
  { name: 'cucumber', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-cucumber/' },
  { name: 'fish', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-fish/' },
  { name: 'mango', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-mango/' },
  { name: 'oatmeal', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-oatmeal/' },
  { name: 'pineapple', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-pineapple/' },
  { name: 'pumpkin', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-pumpkin/' },
  { name: 'salmon', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-salmon/' },
  { name: 'strawberries', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-strawberries/' },
  { name: 'watermelon', safety: 'safe', url: '/us/pet-food-safety/can-my-pet-eat-watermelon/' }
];

// Convert ManyPets data to our database format
function convertToOurFormat() {
  const safeForDogs: any[] = [];
  const unsafeForDogs: any[] = [];
  const cautionForDogs: any[] = [];
  
  const safeForCats: any[] = [];
  const unsafeForCats: any[] = [];
  const cautionForCats: any[] = [];

  manyPetsData.forEach(item => {
    const foodItem = {
      food: item.name,
      description: `${item.name} - safety information from ManyPets veterinary database.`,
      source: 'ManyPets'
    };

    // Add to appropriate categories for both dogs and cats
    // Note: ManyPets data generally applies to both dogs and cats unless specified
    switch (item.safety) {
      case 'safe':
        safeForDogs.push(foodItem);
        safeForCats.push(foodItem);
        break;
      case 'unsafe':
        unsafeForDogs.push({ ...foodItem, severity: 'high' });
        unsafeForCats.push({ ...foodItem, severity: 'high' });
        break;
      case 'caution':
        cautionForDogs.push({ ...foodItem, recommendation: 'Safe in moderation - consult your veterinarian' });
        cautionForCats.push({ ...foodItem, recommendation: 'Safe in moderation - consult your veterinarian' });
        break;
    }
  });

  return {
    dogs: {
      safe: safeForDogs,
      unsafe: unsafeForDogs,
      caution: cautionForDogs
    },
    cats: {
      safe: safeForCats,
      unsafe: unsafeForCats,
      caution: cautionForCats
    }
  };
}

// Generate the enhanced food safety data file
function generateEnhancedFoodSafetyData() {
  const manyPetsConverted = convertToOurFormat();

  const enhancedData = {
    // Add ManyPets data
    ...manyPetsConverted,
    metadata: {
      sources: ['ManyPets', 'Veterinary databases', 'ASPCA'],
      lastUpdated: new Date().toISOString(),
      totalEntries: manyPetsData.length
    }
  };

  // Create data directory if it doesn't exist
  const dataDir = path.join(__dirname, '../../src/data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Write enhanced data to a new file in the source directory
  const outputPath = path.join(dataDir, 'manyPetsFoodSafetyData.ts');
  const outputContent = `// ManyPets food safety data integration
// Generated on ${new Date().toISOString()}

export const manyPetsFoodSafetyData = ${JSON.stringify(enhancedData, null, 2)};
`;

  fs.writeFileSync(outputPath, outputContent);
  console.log(`✅ ManyPets food safety data written to ${outputPath}`);
  console.log(`📊 Total entries: ${manyPetsData.length}`);
  console.log(`🐕 Dog entries: Safe(${enhancedData.dogs.safe.length}), Unsafe(${enhancedData.dogs.unsafe.length}), Caution(${enhancedData.dogs.caution.length})`);
  console.log(`🐱 Cat entries: Safe(${enhancedData.cats.safe.length}), Unsafe(${enhancedData.cats.unsafe.length}), Caution(${enhancedData.cats.caution.length})`);
}

// Run the script
if (require.main === module) {
  generateEnhancedFoodSafetyData();
}

export { manyPetsData, convertToOurFormat, generateEnhancedFoodSafetyData };
