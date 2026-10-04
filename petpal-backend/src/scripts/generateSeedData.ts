/**
 * Generates a large, clearly-labelled *synthetic* food-safety seed dataset.
 *
 * This is NOT veterinary-verified data. It is a heuristic catalogue authored to
 * populate the app for demos and to give the review queue something to chew on.
 * Every generated record is tagged source `AI (generated)` so it can never be
 * mistaken for the curated, vet-sourced entries. Do not present it as medical
 * advice.
 *
 * Run: npx ts-node src/scripts/generateSeedData.ts
 * Output: data/foodSafety.generated.json
 */
import * as fs from 'fs';
import * as path from 'path';

type Verdict = 'safe' | 'caution' | 'unsafe';
type Severity = 'low' | 'medium' | 'high';
type Kind =
  | 'protein' | 'fish' | 'egg' | 'dairy' | 'vegetable' | 'leafy' | 'fruit'
  | 'berry' | 'grain' | 'legume' | 'nut' | 'seed' | 'fat' | 'sweet'
  | 'spice' | 'herb' | 'fungus' | 'drink' | 'toxicplant' | 'processed' | 'misc';

const SPECIES = [
  'dogs', 'cats', 'rabbits', 'hamsters', 'birds',
  'turtles', 'fish', 'lizards', 'snakes', 'chickens',
] as const;

const LABEL: Record<string, string> = {
  dogs: 'dogs', cats: 'cats', rabbits: 'rabbits', hamsters: 'hamsters', birds: 'birds',
  turtles: 'turtles', fish: 'fish', lizards: 'lizards', snakes: 'snakes', chickens: 'chickens',
};

// name:kind pairs — a broad catalogue of common foods and hazards.
const RAW = `
chicken:protein,beef:protein,turkey:protein,lamb:protein,pork:protein,duck:protein,
venison:protein,bison:protein,goat:protein,quail:protein,beef liver:protein,
chicken liver:protein,chicken heart:protein,beef heart:protein,kidney:protein,
tripe:protein,ham:processed,bacon:processed,sausage:processed,hot dog:processed,
deli meat:processed,pepperoni:processed,salami:processed,meatball:processed,
steak:protein,ground beef:protein,ground turkey:protein,
salmon:fish,tuna:fish,sardine:fish,mackerel:fish,herring:fish,trout:fish,cod:fish,
tilapia:fish,halibut:fish,shrimp:fish,prawn:fish,crab:fish,lobster:fish,clam:fish,
mussel:fish,oyster:fish,scallop:fish,squid:fish,octopus:fish,anchovy:fish,
catfish:fish,bass:fish,pollock:fish,
egg:egg,eggshell:egg,
cheese:dairy,cheddar:dairy,cottage cheese:dairy,yogurt:dairy,milk:dairy,cream:dairy,
butter:fat,ghee:fat,kefir:dairy,ice cream:dairy,sour cream:dairy,cream cheese:dairy,
whey:dairy,
carrot:vegetable,broccoli:vegetable,cauliflower:vegetable,cucumber:vegetable,
zucchini:vegetable,pumpkin:vegetable,sweet potato:vegetable,potato:vegetable,
green bean:vegetable,pea:vegetable,corn:vegetable,spinach:leafy,kale:leafy,
lettuce:leafy,romaine:leafy,cabbage:leafy,brussels sprout:leafy,asparagus:leafy,
celery:leafy,bell pepper:vegetable,tomato:vegetable,beet:vegetable,radish:vegetable,
turnip:vegetable,squash:vegetable,butternut squash:vegetable,parsnip:vegetable,
artichoke:vegetable,okra:vegetable,eggplant:vegetable,mushroom:fungus,seaweed:leafy,
kelp:leafy,watercress:leafy,arugula:leafy,fennel:leafy,leek:toxicplant,
onion:toxicplant,garlic:toxicplant,chives:toxicplant,shallot:toxicplant,
apple:fruit,banana:fruit,blueberry:berry,strawberry:berry,raspberry:berry,
blackberry:berry,cranberry:berry,cherry:fruit,peach:fruit,plum:fruit,pear:fruit,
apricot:fruit,mango:fruit,papaya:fruit,pineapple:fruit,melon:fruit,watermelon:fruit,
cantaloupe:fruit,honeydew:fruit,kiwi:fruit,orange:fruit,lemon:fruit,lime:fruit,
grapefruit:fruit,tangerine:fruit,grape:fruit,raisin:fruit,fig:fruit,date:fruit,
pomegranate:fruit,persimmon:fruit,guava:fruit,passionfruit:fruit,dragonfruit:fruit,
starfruit:fruit,lychee:fruit,coconut:fruit,avocado:fruit,olive:fruit,
nectarine:fruit,currant:berry,gooseberry:berry,boysenberry:berry,elderberry:berry,
rice:grain,brown rice:grain,oatmeal:grain,oats:grain,wheat:grain,barley:grain,
quinoa:grain,couscous:grain,pasta:grain,bread:grain,whole wheat bread:grain,
cornmeal:grain,millet:grain,buckwheat:grain,rye:grain,spelt:grain,bulgur:grain,
flour:grain,cereal:grain,crackers:grain,
lentil:legume,chickpea:legume,black bean:legume,kidney bean:legume,pinto bean:legume,
soybean:legume,edamame:legume,tofu:legume,tempeh:legume,peanut:nut,
almond:nut,walnut:nut,pecan:nut,cashew:nut,pistachio:nut,hazelnut:nut,
macadamia:nut,brazil nut:nut,peanut butter:nut,sunflower seed:seed,pumpkin seed:seed,
chia seed:seed,flax seed:seed,sesame seed:seed,
olive oil:fat,coconut oil:fat,fish oil:fat,lard:fat,tallow:fat,sunflower oil:fat,
canola oil:fat,
honey:sweet,sugar:sweet,maple syrup:sweet,molasses:sweet,chocolate:sweet,
dark chocolate:sweet,white chocolate:sweet,candy:sweet,cookie:processed,cake:processed,
xylitol:sweet,
cinnamon:spice,turmeric:spice,ginger:spice,parsley:herb,basil:herb,oregano:herb,
mint:herb,rosemary:herb,thyme:herb,salt:spice,black pepper:spice,nutmeg:spice,
water:drink,coconut water:drink,tea:drink,coffee:drink,alcohol:drink,beer:drink,
wine:drink,soda:drink,juice:drink,
truffle:fungus,yeast:fungus,
rhubarb:toxicplant,tomato leaf:toxicplant,potato leaf:toxicplant,poinsettia:toxicplant,
lily:toxicplant,aloe:toxicplant,ivy:toxicplant,oleander:toxicplant,azalea:toxicplant,
foxglove:toxicplant,
pizza:processed,burger:processed,fries:processed,chips:processed,popcorn:processed,
pretzel:processed,bagel:processed,donut:processed,pancake:processed,waffle:processed,
gravy:processed,ketchup:processed,mustard:processed,mayonnaise:processed,
soy sauce:processed,vinegar:processed,broth:processed,bone broth:processed,
bone:misc,antler:misc,hay:misc,grass:misc,alfalfa:misc,timothy hay:misc,
pellets:misc,nectar:misc,seed mix:seed,
ostrich:protein,goose:protein,rabbit:protein,pheasant:protein,guinea fowl:protein,
haddock:fish,flounder:fish,snapper:fish,pickerel:fish,roe:fish,
bok choy:leafy,collard greens:leafy,mustard greens:leafy,swiss chard:leafy,
radicchio:leafy,endive:leafy,napa cabbage:leafy,water chestnut:vegetable,
jicama:vegetable,kohlrabi:vegetable,daikon:vegetable,yam:vegetable,taro:vegetable,
plantain:fruit,acai:berry,goji:berry,mulberry:berry,kumquat:fruit,clementine:fruit,
mandarin:fruit,tamarind:fruit,jackfruit:fruit,durian:fruit,rambutan:fruit,
mangosteen:fruit,quince:fruit,
amaranth:grain,teff:grain,sorghum:grain,farro:grain,freekeh:grain,
pine nut:nut,chestnut:nut,hemp seed:seed,poppy seed:seed,mustard seed:seed,
buttermilk:dairy,ricotta:dairy,mozzarella:dairy,parmesan:dairy,
cuttlebone:misc,mineral block:misc,mealworm:protein,cricket:protein,bloodworm:protein,
daphnia:protein,brine shrimp:protein,krill:protein,mackerel:fish,sardine:fish
`;

const FOODS: { food: string; kind: Kind }[] = [
  ...new Set(RAW.split(',').map((entry) => entry.trim()).filter(Boolean)),
].map((entry) => {
  const [food, kind] = entry.split(':');
  return { food: food.trim(), kind: kind.trim() as Kind };
});

// Default verdict per species per kind.
const POLICY: Record<string, Partial<Record<Kind, Verdict>>> = {
  dogs: { protein: 'safe', fish: 'safe', egg: 'safe', dairy: 'caution', vegetable: 'safe', leafy: 'safe', fruit: 'safe', berry: 'safe', grain: 'safe', legume: 'caution', nut: 'caution', seed: 'caution', fat: 'caution', sweet: 'caution', spice: 'caution', herb: 'safe', fungus: 'caution', drink: 'caution', toxicplant: 'unsafe', processed: 'caution', misc: 'caution' },
  cats: { protein: 'safe', fish: 'safe', egg: 'safe', dairy: 'caution', vegetable: 'caution', leafy: 'caution', fruit: 'caution', berry: 'caution', grain: 'caution', legume: 'unsafe', nut: 'unsafe', seed: 'caution', fat: 'caution', sweet: 'unsafe', spice: 'unsafe', herb: 'caution', fungus: 'unsafe', drink: 'caution', toxicplant: 'unsafe', processed: 'caution', misc: 'unsafe' },
  rabbits: { protein: 'unsafe', fish: 'unsafe', egg: 'unsafe', dairy: 'unsafe', vegetable: 'safe', leafy: 'safe', fruit: 'caution', berry: 'caution', grain: 'caution', legume: 'caution', nut: 'unsafe', seed: 'caution', fat: 'unsafe', sweet: 'unsafe', spice: 'unsafe', herb: 'safe', fungus: 'unsafe', drink: 'caution', toxicplant: 'unsafe', processed: 'unsafe', misc: 'safe' },
  hamsters: { protein: 'caution', fish: 'unsafe', egg: 'caution', dairy: 'unsafe', vegetable: 'safe', leafy: 'safe', fruit: 'caution', berry: 'safe', grain: 'safe', legume: 'caution', nut: 'safe', seed: 'safe', fat: 'caution', sweet: 'unsafe', spice: 'unsafe', herb: 'caution', fungus: 'unsafe', drink: 'caution', toxicplant: 'unsafe', processed: 'unsafe', misc: 'safe' },
  birds: { protein: 'caution', fish: 'caution', egg: 'caution', dairy: 'unsafe', vegetable: 'safe', leafy: 'safe', fruit: 'safe', berry: 'safe', grain: 'safe', legume: 'caution', nut: 'caution', seed: 'safe', fat: 'caution', sweet: 'unsafe', spice: 'unsafe', herb: 'safe', fungus: 'unsafe', drink: 'caution', toxicplant: 'unsafe', processed: 'unsafe', misc: 'safe' },
  turtles: { protein: 'caution', fish: 'safe', egg: 'caution', dairy: 'unsafe', vegetable: 'safe', leafy: 'safe', fruit: 'caution', berry: 'caution', grain: 'unsafe', legume: 'unsafe', nut: 'unsafe', seed: 'unsafe', fat: 'unsafe', sweet: 'unsafe', spice: 'unsafe', herb: 'caution', fungus: 'unsafe', drink: 'caution', toxicplant: 'unsafe', processed: 'unsafe', misc: 'caution' },
  fish: { protein: 'unsafe', fish: 'unsafe', egg: 'caution', dairy: 'unsafe', vegetable: 'caution', leafy: 'caution', fruit: 'unsafe', berry: 'unsafe', grain: 'safe', legume: 'caution', nut: 'unsafe', seed: 'unsafe', fat: 'unsafe', sweet: 'unsafe', spice: 'unsafe', herb: 'unsafe', fungus: 'unsafe', drink: 'caution', toxicplant: 'unsafe', processed: 'unsafe', misc: 'safe' },
  lizards: { protein: 'safe', fish: 'caution', egg: 'safe', dairy: 'unsafe', vegetable: 'safe', leafy: 'safe', fruit: 'caution', berry: 'caution', grain: 'unsafe', legume: 'unsafe', nut: 'unsafe', seed: 'unsafe', fat: 'unsafe', sweet: 'unsafe', spice: 'unsafe', herb: 'caution', fungus: 'unsafe', drink: 'caution', toxicplant: 'unsafe', processed: 'unsafe', misc: 'caution' },
  snakes: { protein: 'safe', fish: 'safe', egg: 'safe', dairy: 'unsafe', vegetable: 'unsafe', leafy: 'unsafe', fruit: 'unsafe', berry: 'unsafe', grain: 'unsafe', legume: 'unsafe', nut: 'unsafe', seed: 'unsafe', fat: 'unsafe', sweet: 'unsafe', spice: 'unsafe', herb: 'unsafe', fungus: 'unsafe', drink: 'caution', toxicplant: 'unsafe', processed: 'unsafe', misc: 'caution' },
  chickens: { protein: 'caution', fish: 'caution', egg: 'caution', dairy: 'caution', vegetable: 'safe', leafy: 'safe', fruit: 'safe', berry: 'safe', grain: 'safe', legume: 'caution', nut: 'unsafe', seed: 'safe', fat: 'caution', sweet: 'unsafe', spice: 'unsafe', herb: 'safe', fungus: 'unsafe', drink: 'caution', toxicplant: 'unsafe', processed: 'caution', misc: 'safe' },
};

/** Famous hazards that override every heuristic above. */
const OVERRIDES: Record<string, { verdict: Verdict; severity?: Severity; reason: string; species?: string[] }> = {
  chocolate: { verdict: 'unsafe', severity: 'high', reason: 'contains theobromine, which is toxic to many animals' },
  'dark chocolate': { verdict: 'unsafe', severity: 'high', reason: 'concentrated theobromine is highly toxic' },
  'white chocolate': { verdict: 'caution', severity: 'medium', reason: 'low theobromine but high fat and sugar' },
  grape: { verdict: 'unsafe', severity: 'high', reason: 'can cause acute kidney failure', species: ['dogs', 'cats'] },
  raisin: { verdict: 'unsafe', severity: 'high', reason: 'can cause acute kidney failure', species: ['dogs', 'cats'] },
  onion: { verdict: 'unsafe', severity: 'high', reason: 'damages red blood cells and causes anaemia', species: ['dogs', 'cats', 'birds', 'hamsters'] },
  garlic: { verdict: 'unsafe', severity: 'high', reason: 'damages red blood cells and causes anaemia', species: ['dogs', 'cats', 'birds', 'hamsters'] },
  chives: { verdict: 'unsafe', severity: 'high', reason: 'same allium toxins as onion and garlic', species: ['dogs', 'cats', 'birds', 'hamsters'] },
  shallot: { verdict: 'unsafe', severity: 'high', reason: 'same allium toxins as onion and garlic', species: ['dogs', 'cats', 'birds', 'hamsters'] },
  xylitol: { verdict: 'unsafe', severity: 'high', reason: 'causes dangerous insulin release and liver failure', species: ['dogs'] },
  alcohol: { verdict: 'unsafe', severity: 'high', reason: 'causes rapid poisoning even in tiny amounts' },
  beer: { verdict: 'unsafe', severity: 'high', reason: 'alcohol and hops are toxic' },
  wine: { verdict: 'unsafe', severity: 'high', reason: 'alcohol is toxic even in small amounts' },
  coffee: { verdict: 'unsafe', severity: 'high', reason: 'caffeine causes heart and nervous-system toxicity' },
  tea: { verdict: 'unsafe', severity: 'medium', reason: 'contains caffeine and tannins' },
  macadamia: { verdict: 'unsafe', severity: 'high', reason: 'causes weakness, tremors and hyperthermia', species: ['dogs'] },
  avocado: { verdict: 'unsafe', severity: 'high', reason: 'persin is toxic, especially to birds and small mammals', species: ['birds', 'rabbits', 'hamsters'] },
  nutmeg: { verdict: 'unsafe', severity: 'high', reason: 'myristicin causes seizures and tremors' },
  salt: { verdict: 'unsafe', severity: 'high', reason: 'can cause sodium ion poisoning', species: ['birds'] },
  rhubarb: { verdict: 'unsafe', severity: 'high', reason: 'oxalic acid in the leaves is toxic' },
  yeast: { verdict: 'unsafe', severity: 'high', reason: 'raw dough expands and ferments into alcohol in the stomach' },
  lily: { verdict: 'unsafe', severity: 'high', reason: 'highly toxic' },
  oleander: { verdict: 'unsafe', severity: 'high', reason: 'cardiac glycosides are highly toxic' },
  azalea: { verdict: 'unsafe', severity: 'high', reason: 'grayanotoxins are highly toxic' },
  foxglove: { verdict: 'unsafe', severity: 'high', reason: 'cardiac glycosides are highly toxic' },
  poinsettia: { verdict: 'caution', severity: 'medium', reason: 'irritant sap causes mouth and stomach upset' },
  aloe: { verdict: 'caution', severity: 'medium', reason: 'latex causes gastrointestinal upset' },
  ivy: { verdict: 'unsafe', severity: 'medium', reason: 'toxic saponins cause vomiting and drooling' },
  'tomato leaf': { verdict: 'unsafe', severity: 'medium', reason: 'solanine in the leaves and stems is toxic' },
  'potato leaf': { verdict: 'unsafe', severity: 'medium', reason: 'solanine in the leaves and stems is toxic' },
};

const KIND_NOTE: Record<Verdict, string> = {
  safe: 'Offer it plain, unseasoned and in sensible amounts.',
  caution: 'Keep portions small and introduce it slowly.',
  unsafe: 'Do not feed it — contact a veterinarian if it is eaten.',
};

function verdictFor(species: string, food: string, kind: Kind): { verdict: Verdict; severity?: Severity; reason?: string } {
  const override = OVERRIDES[food];
  if (override && (!override.species || override.species.includes(species))) {
    return { verdict: override.verdict, severity: override.severity, reason: override.reason };
  }
  return { verdict: POLICY[species]?.[kind] ?? 'unknown' as Verdict };
}

function build() {
  const out: Record<string, { safe: unknown[]; caution: unknown[]; unsafe: unknown[] }> = {};

  for (const species of SPECIES) {
    out[species] = { safe: [], caution: [], unsafe: [] };

    for (const { food, kind } of FOODS) {
      const { verdict, severity, reason } = verdictFor(species, food, kind);
      if (verdict !== 'safe' && verdict !== 'caution' && verdict !== 'unsafe') continue;

      const noun = LABEL[species];
      const description =
        verdict === 'safe'
          ? `${capitalise(food)} is generally considered safe for ${noun} in normal amounts.`
          : verdict === 'caution'
            ? `${capitalise(food)} is not outright toxic to ${noun}, but should only be given occasionally and in small amounts.`
            : `${capitalise(food)} is not safe for ${noun}${reason ? ` — it ${reason}` : ''}.`;

      const item: Record<string, unknown> = {
        food,
        safety: verdict,
        description,
        source: 'AI (generated)',
      };
      if (verdict === 'unsafe' && severity) item.severity = severity;
      item.recommendation = KIND_NOTE[verdict];

      out[species][verdict].push(item);
    }
  }

  return out;
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const data = build();
const total = Object.values(data).reduce(
  (sum, bucket) => sum + bucket.safe.length + bucket.caution.length + bucket.unsafe.length,
  0,
);

const outputPath = path.join(__dirname, '../../data/foodSafety.generated.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log(`Wrote ${total} synthetic records across ${SPECIES.length} species to ${outputPath}`);
console.log('Labelled source "AI (generated)" — not veterinary-verified.');
