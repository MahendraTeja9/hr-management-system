const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Direct database configuration with provided credentials
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

async function createTables() {
  console.log('🚀 Starting direct database table creation...');
  console.log('=============================================');

  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created migrations table');

    // Create all the main tables for HR management system
    const tables = [
      {
        name: 'users',
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'employee',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'employees',
        sql: `
          CREATE TABLE IF NOT EXISTS employees (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(50) UNIQUE NOT NULL,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(20),
            department VARCHAR(255),
            position VARCHAR(255),
            hire_date DATE,
            salary DECIMAL(10,2),
            manager_id INTEGER REFERENCES employees(id),
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'attendance',
        sql: `
          CREATE TABLE IF NOT EXISTS attendance (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            check_in_time TIME,
            check_out_time TIME,
            break_start_time TIME,
            break_end_time TIME,
            total_hours DECIMAL(4,2),
            status VARCHAR(50) DEFAULT 'present',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(employee_id, date)
          )
        `
      },
      {
        name: 'leave_types',
        sql: `
          CREATE TABLE IF NOT EXISTS leave_types (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            max_days_per_year INTEGER DEFAULT 0,
            carry_forward BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'leave_requests',
        sql: `
          CREATE TABLE IF NOT EXISTS leave_requests (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
            leave_type_id INTEGER REFERENCES leave_types(id),
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            days_requested INTEGER NOT NULL,
            reason TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            approved_by INTEGER REFERENCES employees(id),
            approved_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'leave_balances',
        sql: `
          CREATE TABLE IF NOT EXISTS leave_balances (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
            leave_type_id INTEGER REFERENCES leave_types(id),
            year INTEGER NOT NULL,
            allocated_days INTEGER DEFAULT 0,
            used_days INTEGER DEFAULT 0,
            remaining_days INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(employee_id, leave_type_id, year)
          )
        `
      },
      {
        name: 'documents',
        sql: `
          CREATE TABLE IF NOT EXISTS documents (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
            document_type VARCHAR(255) NOT NULL,
            document_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500),
            file_size INTEGER,
            mime_type VARCHAR(255),
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'pending',
            reviewed_by INTEGER REFERENCES employees(id),
            reviewed_at TIMESTAMP,
            notes TEXT
          )
        `
      },
      {
        name: 'expenses',
        sql: `
          CREATE TABLE IF NOT EXISTS expenses (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
            expense_type VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            description TEXT,
            expense_date DATE NOT NULL,
            receipt_path VARCHAR(500),
            status VARCHAR(50) DEFAULT 'pending',
            approved_by INTEGER REFERENCES employees(id),
            approved_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'onboarding_tasks',
        sql: `
          CREATE TABLE IF NOT EXISTS onboarding_tasks (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
            task_name VARCHAR(255) NOT NULL,
            description TEXT,
            assigned_to INTEGER REFERENCES employees(id),
            due_date DATE,
            status VARCHAR(50) DEFAULT 'pending',
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'hr_settings',
        sql: `
          CREATE TABLE IF NOT EXISTS hr_settings (
            id SERIAL PRIMARY KEY,
            setting_key VARCHAR(255) UNIQUE NOT NULL,
            setting_value TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      }
    ];

    // Create each table
    for (const table of tables) {
      try {
        await pool.query(table.sql);
        console.log(`✅ Created table: ${table.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Table ${table.name} already exists`);
        } else {
          console.error(`❌ Error creating table ${table.name}:`, error.message);
        }
      }
    }

    // Insert default leave types
    const defaultLeaveTypes = [
      { name: 'Annual Leave', description: 'Yearly vacation leave', max_days: 21 },
      { name: 'Sick Leave', description: 'Medical leave', max_days: 10 },
      { name: 'Personal Leave', description: 'Personal time off', max_days: 5 },
      { name: 'Maternity Leave', description: 'Maternity leave', max_days: 90 },
      { name: 'Paternity Leave', description: 'Paternity leave', max_days: 14 }
    ];

    console.log('\n📋 Inserting default leave types...');
    for (const leaveType of defaultLeaveTypes) {
      try {
        await pool.query(
          'INSERT INTO leave_types (name, description, max_days_per_year) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
          [leaveType.name, leaveType.description, leaveType.max_days]
        );
        console.log(`✅ Added leave type: ${leaveType.name}`);
      } catch (error) {
        console.log(`ℹ️  Leave type ${leaveType.name} already exists or error:`, error.message);
      }
    }

    // Insert default HR settings
    const defaultSettings = [
      { key: 'company_name', value: 'HR Management System', description: 'Company name' },
      { key: 'working_hours_per_day', value: '8', description: 'Standard working hours per day' },
      { key: 'working_days_per_week', value: '5', description: 'Standard working days per week' },
      { key: 'leave_approval_required', value: 'true', description: 'Whether leave requests require approval' }
    ];

    console.log('\n⚙️  Inserting default HR settings...');
    for (const setting of defaultSettings) {
      try {
        await pool.query(
          'INSERT INTO hr_settings (setting_key, setting_value, description) VALUES ($1, $2, $3) ON CONFLICT (setting_key) DO NOTHING',
          [setting.key, setting.value, setting.description]
        );
        console.log(`✅ Added setting: ${setting.key}`);
      } catch (error) {
        console.log(`ℹ️  Setting ${setting.key} already exists or error:`, error.message);
      }
    }

    // Record migration as completed
    await pool.query(
      'INSERT INTO migrations (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
      ['001_direct_schema', 'Direct Schema Creation', 'Created all HR management tables directly']
    );

    console.log('\n🎉 Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

async function checkTables() {
  try {
    console.log('\n📊 Checking created tables...');
    const result = await pool.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables in database:');
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name} (${row.column_count} columns)`);
    });
    
    console.log(`\n📈 Total tables created: ${result.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  try {
    await createTables();
    await checkTables();
  } catch (error) {
    console.error('❌ Migration process failed:', error.message);
    process.exit(1);
  }
}

main();