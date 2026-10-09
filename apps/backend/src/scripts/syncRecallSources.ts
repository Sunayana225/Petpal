import { fetchFdaListing, parseFdaListing } from '../services/recallSources';
import { dataFilePath, writeJsonFile } from '../utils/dataFiles';

async function main(): Promise<void> {
  const snapshot = parseFdaListing(await fetchFdaListing(), new Date().toISOString());
  writeJsonFile(dataFilePath('recalls.fda.json'), snapshot);
  console.log(`Saved ${snapshot.records.length} FDA listing records, retrieved ${snapshot.retrievedAt}. Coverage is partial.`);
}
if (require.main === module) main().catch(error => { console.error(error instanceof Error ? error.message : 'Source refresh failed'); process.exitCode = 1; });
