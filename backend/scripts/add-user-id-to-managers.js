const { Pool } = require("pg");
require("dotenv").config({ path: "./config.env" });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const addUserIdToManagers = async () => {
  try {
    console.log("🔧 Adding user_id column to managers table...");
    console.log("=============================================");

    // Check if user_id column already exists
    const columnExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'managers' AND column_name = 'user_id'
    `);

    if (columnExists.rows.length > 0) {
      console.log("ℹ️  user_id column already exists in managers table");
    } else {
      // Add user_id column
      await pool.query(`
        ALTER TABLE managers 
        ADD COLUMN user_id INTEGER REFERENCES users(id)
      `);
      console.log("✅ Added user_id column to managers table");
    }

    // Verify the table structure
    console.log("\n🔍 Verifying managers table structure...");
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'managers' 
      ORDER BY ordinal_position
    `);

    console.log("✅ Managers table structure:");
    tableStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    console.log("\n🎉 user_id column addition completed!");

  } catch (error) {
    console.error("❌ Error adding user_id column:", error);
    throw error;
  } finally {
    await pool.end();
  }
};

addUserIdToManagers().catch(console.error);
