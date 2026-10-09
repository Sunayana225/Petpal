import { importBioVet } from '../scripts/importBioVet';
import { foodSafetyRepository } from '../repositories/foodSafetyRepository';

test('BioVet conversion retains source verdict and group, aliases and references without inferred severity', () => {
  const data = importBioVet([{ id: 'test', category: 'foods', names: { en: ['Example', 'Another name'] }, verdicts: { rabbit_rodent: 'danger', fish: 'unknown' }, sources: ['https://example.org/evidence', 'javascript:alert(1)'] }], '2026-10-09T00:00:00Z', 'a'.repeat(40));
  expect(data.rabbits.unsafe[0]).toMatchObject({ aliases: ['Another name'], evidence: [{ itemId: 'test', sourceVerdict: 'unsafe', assessedGroup: 'rabbit_rodent', reviewStatus: 'publisher-reported', references: ['https://example.org/evidence'] }] });
  expect(data.rabbits.unsafe[0]).not.toHaveProperty('severity');
  expect(data.hamsters.unsafe).toHaveLength(1);
  expect(data.fish.unsafe).toEqual([]);
});

test('packaged BioVet receipts survive merged dataset indexing', () => {
  const records = foodSafetyRepository.getSupportedPets().flatMap(pet => foodSafetyRepository.getFoods(pet));
  const receipts = records.flatMap(record => record.evidence ?? []);
  expect(receipts.length).toBeGreaterThan(100);
  expect(receipts.every(receipt => receipt.reviewStatus === 'publisher-reported' && receipt.upstreamRevision.length === 40 && receipt.attribution.includes('bio.vet'))).toBe(true);
});
