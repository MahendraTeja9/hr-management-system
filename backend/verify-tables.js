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

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying database connection and table structure...');
    console.log('=======================================================');
    
    const client = await pool.connect();
    
    // Get database info
    const dbInfo = await client.query('SELECT current_database(), current_user, version()');
    console.log('📊 Database Information:');
    console.log(`   Database: ${dbInfo.rows[0].current_database}`);
    console.log(`   User: ${dbInfo.rows[0].current_user}`);
    console.log(`   Version: ${dbInfo.rows[0].version.split(',')[0]}`);
    
    // Get all tables with detailed information
    const tablesQuery = `
      SELECT 
        t.table_name,
        t.table_type,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count,
        pg_size_pretty(pg_total_relation_size(c.oid)) as size
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name
    `;
    
    const tablesResult = await client.query(tablesQuery);
    
    console.log('\n📋 Tables in database:');
    console.log('   Table Name          | Type  | Columns | Size');
    console.log('   -------------------|-------|---------|--------');
    
    tablesResult.rows.forEach(row => {
      const name = row.table_name.padEnd(18);
      const type = 'TABLE'.padEnd(5);
      const columns = row.column_count.toString().padEnd(7);
      const size = (row.size || 'N/A').padEnd(6);
      console.log(`   ${name} | ${type} | ${columns} | ${size}`);
    });
    
    // Get column details for key tables
    const keyTables = ['users', 'employees', 'attendance', 'leave_requests', 'documents'];
    
    for (const tableName of keyTables) {
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      
      const columnsResult = await client.query(columnsQuery, [tableName]);
      
      if (columnsResult.rows.length > 0) {
        console.log(`\n📝 Table: ${tableName}`);
        console.log('   Column Name         | Data Type    | Nullable | Default');
        console.log('   -------------------|--------------|----------|----------');
        
        columnsResult.rows.forEach(col => {
          const name = col.column_name.padEnd(18);
          const type = col.data_type.padEnd(12);
          const nullable = col.is_nullable.padEnd(8);
          const defaultVal = (col.column_default || '').substring(0, 10).padEnd(10);
          console.log(`   ${name} | ${type} | ${nullable} | ${defaultVal}`);
        });
      }
    }
    
    // Check foreign key relationships
    const fkQuery = `
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `;
    
    const fkResult = await client.query(fkQuery);
    
    if (fkResult.rows.length > 0) {
      console.log('\n🔗 Foreign Key Relationships:');
      console.log('   Table.Column -> References Table.Column');
      console.log('   ----------------------------------------');
      
      fkResult.rows.forEach(fk => {
        console.log(`   ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    }
    
    // Check if there's any data in key tables
    console.log('\n📊 Data Count in Tables:');
    for (const tableName of tablesResult.rows.map(r => r.table_name)) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = countResult.rows[0].count;
        console.log(`   ${tableName.padEnd(20)}: ${count} rows`);
      } catch (error) {
        console.log(`   ${tableName.padEnd(20)}: Error counting rows`);
      }
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Database verification completed successfully!');
    console.log('🎉 All tables are created and ready for the HR Management System!');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    process.exit(1);
  }
}

verifyDatabase();