/**
 * Imports the BioVet "pet-food-safety" dataset into our shape.
 *
 * Source: https://github.com/Bio-Vet/pet-food-safety (data/items.json)
 * Licence: CC BY 4.0 — attribution required:
 *   "Data: BioVet veterinary clinic network, bio.vet"
 *
 * Their schema → ours:
 *   verdicts.dog              → dogs
 *   verdicts.cat              → cats
 *   verdicts.rabbit_rodent    → rabbits + hamsters
 *   verdicts.bird             → birds
 *   verdicts.reptile          → turtles + lizards + snakes
 *   safe → safe · caution → caution · danger → unsafe
 *
 * Run: npx ts-node src/scripts/importBioVet.ts
 * Requires: data/biovet-items.json (downloaded from the repo above).
 */
import * as fs from 'fs';
import * as path from 'path';

type Verdict = 'safe' | 'caution' | 'unsafe';

interface BioVetItem {
  id: string;
  category: string;
  names: { en?: string[]; ru?: string[] };
  verdicts: Record<string, string>;
  toxin?: string;
  notes?: { en?: string; ru?: string };
  sources?: string[];
}

const SPECIES = [
  'dogs', 'cats', 'rabbits', 'hamsters', 'birds',
  'turtles', 'fish', 'lizards', 'snakes', 'chickens',
] as const;

const SPECIES_MAP: Record<string, string[]> = {
  dog: ['dogs'],
  cat: ['cats'],
  rabbit_rodent: ['rabbits', 'hamsters'],
  bird: ['birds'],
  reptile: ['turtles', 'lizards', 'snakes'],
};

const VERDICT_MAP: Record<string, Verdict> = {
  safe: 'safe',
  caution: 'caution',
  danger: 'unsafe',
};

function main(): void {
  const inputPath = path.join(__dirname, '../../data/biovet-items.json');
  const { items } = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as { items: BioVetItem[] };

  const out: Record<string, { safe: unknown[]; caution: unknown[]; unsafe: unknown[] }> = {};
  for (const species of SPECIES) out[species] = { safe: [], caution: [], unsafe: [] };

  let count = 0;

  for (const item of items) {
    const name = item.names?.en?.[0];
    if (!name) continue;

    const description =
      item.notes?.en ?? `${name} — safety assessed by BioVet veterinarians.`;

    for (const [key, rawVerdict] of Object.entries(item.verdicts ?? {})) {
      const verdict = VERDICT_MAP[rawVerdict];
      const species = SPECIES_MAP[key];
      if (!verdict || !species) continue; // e.g. a species we don't model, or "unknown"

      for (const target of species) {
        const record: Record<string, unknown> = {
          food: name.toLowerCase(),
          safety: verdict,
          description,
          source: 'BioVet (CC BY 4.0)',
        };
        if (item.toxin) record.caution = item.toxin;
        if (verdict === 'unsafe') record.severity = 'high';

        out[target][verdict].push(record);
        count += 1;
      }
    }
  }

  const outputPath = path.join(__dirname, '../../data/foodSafety.biovet.json');
  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2));

  console.log(`Imported ${count} BioVet records from ${items.length} items → ${outputPath}`);
  console.log('Attribution required: "Data: BioVet veterinary clinic network, bio.vet" (CC BY 4.0).');
}

main();
