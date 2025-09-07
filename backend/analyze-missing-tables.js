const fs = require('fs');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'deploy',
  user: 'postgres',
  password: 'shibin',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function analyzeMissingTables() {
  try {
    console.log('🔍 Analyzing missing tables...');
    console.log('=====================================\n');

    // Read the SQL file
    const sqlContent = fs.readFileSync('onboarddd.sql', 'utf8');
    
    // Extract CREATE TABLE statements
    const createTableRegex = /CREATE TABLE public\.(\w+)/gi;
    const matches = sqlContent.match(createTableRegex);
    
    if (!matches) {
      console.log('❌ No CREATE TABLE statements found in onboarddd.sql');
      return;
    }

    // Extract table names from matches
    const expectedTables = matches.map(match => {
      const tableName = match.replace(/CREATE TABLE public\./i, '').trim();
      return tableName;
    }).sort();

    console.log(`📊 Expected tables from onboarddd.sql (${expectedTables.length} total):`);
    expectedTables.forEach((table, index) => {
      console.log(`   ${(index + 1).toString().padStart(2)}: ${table}`);
    });

    // Get current tables from database
    const client = await pool.connect();
    const currentTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const currentTables = currentTablesResult.rows.map(row => row.table_name).sort();
    
    console.log(`\n📋 Current tables in database (${currentTables.length} total):`);
    currentTables.forEach((table, index) => {
      console.log(`   ${(index + 1).toString().padStart(2)}: ${table}`);
    });

    // Find missing tables
    const missingTables = expectedTables.filter(table => !currentTables.includes(table));
    
    console.log(`\n❌ Missing tables (${missingTables.length} total):`);
    if (missingTables.length === 0) {
      console.log('   ✅ No missing tables - all expected tables exist!');
    } else {
      missingTables.forEach((table, index) => {
        console.log(`   ${(index + 1).toString().padStart(2)}: ${table}`);
      });
    }

    // Find extra tables (in database but not in SQL file)
    const extraTables = currentTables.filter(table => !expectedTables.includes(table));
    
    console.log(`\n➕ Extra tables in database (${extraTables.length} total):`);
    if (extraTables.length === 0) {
      console.log('   ✅ No extra tables');
    } else {
      extraTables.forEach((table, index) => {
        console.log(`   ${(index + 1).toString().padStart(2)}: ${table}`);
      });
    }

    // Extract CREATE TABLE statements for missing tables
    if (missingTables.length > 0) {
      console.log('\n🔧 Extracting CREATE statements for missing tables...');
      
      const missingTableStatements = [];
      
      for (const tableName of missingTables) {
        // Find the CREATE TABLE statement for this table
        const tableRegex = new RegExp(`CREATE TABLE public\\.${tableName}[\\s\\S]*?;`, 'gi');
        const tableMatch = sqlContent.match(tableRegex);
        
        if (tableMatch && tableMatch[0]) {
          missingTableStatements.push({
            tableName,
            statement: tableMatch[0]
          });
        }
      }
      
      // Write missing table statements to a file
      const missingTablesSQL = missingTableStatements.map(item => 
        `-- Table: ${item.tableName}\n${item.statement}\n`
      ).join('\n');
      
      fs.writeFileSync('missing-tables.sql', missingTablesSQL);
      console.log('✅ Missing table CREATE statements saved to missing-tables.sql');
      
      console.log('\n📝 Missing table statements:');
      missingTableStatements.forEach(item => {
        console.log(`\n-- ${item.tableName}`);
        console.log(item.statement.substring(0, 200) + '...');
      });
    }

    client.release();
    await pool.end();
    
    console.log('\n🎉 Analysis completed!');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

analyzeMissingTables();