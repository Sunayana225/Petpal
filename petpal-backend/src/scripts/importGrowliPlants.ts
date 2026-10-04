/**
 * Imports the Growli plant-toxicity dataset (ASPCA-sourced) into our shape.
 *
 * Source: https://www.getgrowli.app/data/plant-toxicity (data/plant-toxicity.json)
 * Licence: CC BY 4.0 — attribution required:
 *   "Plant-toxicity reference table compiled by Growli (getgrowli.app), CC-BY 4.0,
 *    from the ASPCA Toxic and Non-Toxic Plants database and US extension services.
 *    Not veterinary advice."
 *
 * The source rates each plant for cats and dogs together, so both species get the
 * same verdict. Ratings map: "Pet-safe…" → safe · "Mildly toxic" → caution ·
 * "Toxic" → unsafe.
 *
 * Run: npx ts-node src/scripts/importGrowliPlants.ts
 * Requires: data/growli-plant-toxicity.json (downloaded from the URL above).
 */
import * as fs from 'fs';
import * as path from 'path';

type Verdict = 'safe' | 'caution' | 'unsafe';

interface GrowliRow {
  commonName?: string;
  botanicalName?: string;
  category?: string;
  toxicity?: string;
  toxicityDetail?: string;
}

const SPECIES = [
  'dogs', 'cats', 'rabbits', 'hamsters', 'birds',
  'turtles', 'fish', 'lizards', 'snakes', 'chickens',
] as const;

/** Growli only publishes cat/dog verdicts. */
const TARGET_SPECIES = ['dogs', 'cats'] as const;

const MAX_DESCRIPTION = 280;

function verdictOf(rating: string): Verdict | null {
  if (/pet-safe/i.test(rating)) return 'safe';
  if (/mildly toxic/i.test(rating)) return 'caution';
  if (/toxic/i.test(rating)) return 'unsafe';
  return null;
}

function main(): void {
  const inputPath = path.join(__dirname, '../../data/growli-plant-toxicity.json');
  const { data } = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as { data: GrowliRow[] };

  const out: Record<string, { safe: unknown[]; caution: unknown[]; unsafe: unknown[] }> = {};
  for (const species of SPECIES) out[species] = { safe: [], caution: [], unsafe: [] };

  const seen = new Set<string>();
  let count = 0;

  for (const row of data) {
    const name = row.commonName?.trim();
    const verdict = row.toxicity ? verdictOf(row.toxicity) : null;
    if (!name || !verdict) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const detail = (row.toxicityDetail ?? '').trim();
    const description =
      detail.length > MAX_DESCRIPTION ? `${detail.slice(0, MAX_DESCRIPTION)}…` : detail;

    for (const species of TARGET_SPECIES) {
      const record: Record<string, unknown> = {
        food: key,
        safety: verdict,
        description: description || `${name} — ASPCA plant-toxicity reference.`,
        source: 'Growli/ASPCA (CC BY 4.0)',
      };
      if (row.botanicalName) record.caution = row.botanicalName;
      if (verdict === 'unsafe') record.severity = 'high';

      out[species][verdict].push(record);
      count += 1;
    }
  }

  const outputPath = path.join(__dirname, '../../data/foodSafety.growli.json');
  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2));

  console.log(`Imported ${count} Growli plant records (${seen.size} unique plants) → ${outputPath}`);
  console.log('Attribution: "Plant-toxicity data by Growli (getgrowli.app), CC-BY 4.0, sourced from ASPCA."');
}

main();
