import { importGutendexBooks, syncGlobalWordStatsAfterImport } from "../gutendexImport";

async function main() {
  console.log("Starting Gutendex import...\n");
  
  try {
    const result = await importGutendexBooks();
    console.log("\n=== Import Results ===");
    console.log(`Imported: ${result.imported}`);
    console.log(`Skipped: ${result.skipped}`);
    console.log(`Errors: ${result.errors}`);
    
    console.log("\nSyncing global word stats...");
    await syncGlobalWordStatsAfterImport();
    console.log("Done!");
    
    process.exit(0);
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
}

main();
