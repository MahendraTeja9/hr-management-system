const axios = require("axios");

// Clean up and resync documents with proper employment type filtering
async function cleanupAndResyncDocuments() {
  try {
    console.log("🧹 Cleaning up and resyncing documents...\n");

    // Step 1: Clear existing document collection records
    console.log("1️⃣ Clearing existing document collection records...");
    const clearResponse = await axios.delete(
      "http://localhost:5001/api/hr/document-collection/cleanup"
    );
    console.log("✅ Existing records cleared");
    console.log(`📊 Cleared ${clearResponse.data.deletedCount} records\n`);

    // Step 2: Run sync to recreate documents with proper filtering
    console.log("2️⃣ Running document sync with employment type filtering...");
    const syncResponse = await axios.post(
      "http://localhost:5001/api/hr/sync-document-collection"
    );
    console.log("✅ Document sync completed");
    console.log(`📊 ${syncResponse.data.message}\n`);

    // Step 3: Verify the results
    console.log("3️⃣ Verifying results...");
    const verifyResponse = await axios.get(
      "http://localhost:5001/api/hr/document-collection"
    );
    console.log(
      `📊 Total documents after sync: ${verifyResponse.data.documents.length}`
    );

    // Group by employee and show counts
    const employeeDocs = {};
    verifyResponse.data.documents.forEach((doc) => {
      if (!employeeDocs[doc.employee_id]) {
        employeeDocs[doc.employee_id] = [];
      }
      employeeDocs[doc.employee_id].push(doc);
    });

    console.log(
      `📊 Employees with documents: ${Object.keys(employeeDocs).length}`
    );

    Object.keys(employeeDocs).forEach((employeeId) => {
      const docs = employeeDocs[employeeId];
      console.log(`👤 Employee ${employeeId}: ${docs.length} documents`);
    });

    console.log("\n🎉 Cleanup and resync completed successfully!");
  } catch (error) {
    console.error(
      "❌ Operation failed:",
      error.response?.data || error.message
    );

    // If cleanup endpoint doesn't exist, just run sync
    if (error.response?.status === 404) {
      console.log("🔄 Cleanup endpoint not found, running sync only...");
      try {
        const syncResponse = await axios.post(
          "http://localhost:5001/api/hr/sync-document-collection"
        );
        console.log("✅ Document sync completed");
        console.log(`📊 ${syncResponse.data.message}`);
      } catch (syncError) {
        console.error(
          "❌ Sync failed:",
          syncError.response?.data || syncError.message
        );
      }
    }
  }
}

// Run the cleanup and resync
cleanupAndResyncDocuments();
