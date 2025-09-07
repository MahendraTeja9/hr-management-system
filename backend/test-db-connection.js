const { Pool } = require('pg');

// Database configuration with provided credentials
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

async function testConnection() {
  try {
    console.log('🔄 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL database');
    
    // Test query to check if we can execute commands
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL Version:', result.rows[0].version);
    
    // Check existing tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 Existing tables in database:');
    if (tablesResult.rows.length === 0) {
      console.log('   No tables found - database is empty');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
    
    client.release();
    
    // Now run the migration
    console.log('\n🚀 Running database migrations...');
    const { ProductionMigration } = require('./migrations/production-migration');
    const migration = new ProductionMigration();
    await migration.runMigrations();
    
    // Check tables again after migration
    const client2 = await pool.connect();
    const tablesAfterResult = await client2.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables after migration:');
    tablesAfterResult.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    client2.release();
    await pool.end();
    
    console.log('\n🎉 Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection or migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();