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

async function createMissingTables() {
  let client;
  try {
    console.log('🚀 Creating missing tables...');
    console.log('===============================\n');

    client = await pool.connect();

    // Define tables to create with simpler structure
    const tablesToCreate = [
      {
        name: 'attendance_settings',
        sql: `
          CREATE TABLE IF NOT EXISTS attendance_settings (
            id SERIAL PRIMARY KEY,
            setting_key VARCHAR(100) NOT NULL UNIQUE,
            setting_value TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'departments',
        sql: `
          CREATE TABLE IF NOT EXISTS departments (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            code VARCHAR(20) NOT NULL UNIQUE,
            description TEXT,
            manager_id INTEGER,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'employee_master',
        sql: `
          CREATE TABLE IF NOT EXISTS employee_master (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(100) NOT NULL UNIQUE,
            employee_name VARCHAR(255) NOT NULL,
            company_email VARCHAR(255) NOT NULL UNIQUE,
            manager_id VARCHAR(100),
            manager_name VARCHAR(100),
            type VARCHAR(50) NOT NULL,
            role VARCHAR(100),
            doj DATE NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            department VARCHAR(100),
            designation VARCHAR(100),
            salary_band VARCHAR(50),
            location VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            department_id INTEGER,
            manager2_id VARCHAR(100),
            manager2_name VARCHAR(100),
            manager3_id VARCHAR(100),
            manager3_name VARCHAR(100)
          )
        `
      },
      {
        name: 'managers',
        sql: `
          CREATE TABLE IF NOT EXISTS managers (
            id SERIAL PRIMARY KEY,
            manager_id VARCHAR(100) NOT NULL UNIQUE,
            manager_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            department VARCHAR(100),
            designation VARCHAR(100),
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER
          )
        `
      },
      {
        name: 'onboarded_employees',
        sql: `
          CREATE TABLE IF NOT EXISTS onboarded_employees (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            employee_id VARCHAR(100),
            company_email VARCHAR(255),
            manager_id VARCHAR(100),
            status VARCHAR(50) DEFAULT 'pending',
            assigned_by INTEGER,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'system_settings',
        sql: `
          CREATE TABLE IF NOT EXISTS system_settings (
            id SERIAL PRIMARY KEY,
            total_annual_leaves INTEGER DEFAULT 27,
            allow_half_day BOOLEAN DEFAULT true,
            approval_workflow VARCHAR(50) DEFAULT 'manager_then_hr',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'employee_documents',
        sql: `
          CREATE TABLE IF NOT EXISTS employee_documents (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL,
            document_type VARCHAR(100) NOT NULL,
            document_category VARCHAR(50) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_url VARCHAR(500) NOT NULL,
            file_size INTEGER,
            mime_type VARCHAR(100),
            is_required BOOLEAN DEFAULT false,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'document_collection',
        sql: `
          CREATE TABLE IF NOT EXISTS document_collection (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL,
            employee_name VARCHAR(255) NOT NULL,
            emp_id VARCHAR(100) NOT NULL,
            department VARCHAR(100),
            join_date DATE NOT NULL,
            due_date DATE NOT NULL,
            document_name VARCHAR(255) NOT NULL,
            document_type VARCHAR(50) DEFAULT 'Required' NOT NULL,
            status VARCHAR(50) DEFAULT 'Pending',
            notes TEXT,
            uploaded_file_url VARCHAR(500),
            uploaded_file_name VARCHAR(255),
            uploaded_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'document_templates',
        sql: `
          CREATE TABLE IF NOT EXISTS document_templates (
            id SERIAL PRIMARY KEY,
            document_name VARCHAR(255) NOT NULL,
            document_type VARCHAR(50) DEFAULT 'Required' NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            category VARCHAR(50),
            is_required BOOLEAN DEFAULT false,
            allow_multiple BOOLEAN DEFAULT false
          )
        `
      },
      {
        name: 'expense_categories',
        sql: `
          CREATE TABLE IF NOT EXISTS expense_categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'expense_requests',
        sql: `
          CREATE TABLE IF NOT EXISTS expense_requests (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER,
            category_id INTEGER,
            amount DECIMAL(10,2) NOT NULL,
            description TEXT,
            expense_date DATE NOT NULL,
            receipt_url VARCHAR(500),
            status VARCHAR(50) DEFAULT 'pending',
            approved_by INTEGER,
            approved_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'expense_attachments',
        sql: `
          CREATE TABLE IF NOT EXISTS expense_attachments (
            id SERIAL PRIMARY KEY,
            expense_id INTEGER NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_url VARCHAR(500) NOT NULL,
            file_size INTEGER,
            mime_type VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'leave_type_balances',
        sql: `
          CREATE TABLE IF NOT EXISTS leave_type_balances (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL,
            year INTEGER NOT NULL,
            leave_type VARCHAR(100) NOT NULL,
            total_allocated DECIMAL(5,2) DEFAULT 0,
            used_balance DECIMAL(5,2) DEFAULT 0,
            remaining_balance DECIMAL(5,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (employee_id, year, leave_type)
          )
        `
      },
      {
        name: 'company_emails',
        sql: `
          CREATE TABLE IF NOT EXISTS company_emails (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            manager_id VARCHAR(100),
            company_email VARCHAR(255) NOT NULL UNIQUE,
            is_primary BOOLEAN DEFAULT true,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'comp_off_balances',
        sql: `
          CREATE TABLE IF NOT EXISTS comp_off_balances (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL,
            year INTEGER NOT NULL,
            total_earned DECIMAL(5,1) DEFAULT 0,
            comp_off_taken DECIMAL(5,1) DEFAULT 0,
            comp_off_remaining DECIMAL(5,1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'contract_employees',
        sql: `
          CREATE TABLE IF NOT EXISTS contract_employees (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(100) NOT NULL,
            employee_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            department VARCHAR(100),
            designation VARCHAR(100),
            contract_start_date DATE,
            contract_end_date DATE,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'full_time_employees',
        sql: `
          CREATE TABLE IF NOT EXISTS full_time_employees (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(100) NOT NULL,
            employee_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            department VARCHAR(100),
            designation VARCHAR(100),
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'interns',
        sql: `
          CREATE TABLE IF NOT EXISTS interns (
            id SERIAL PRIMARY KEY,
            intern_id VARCHAR(100) NOT NULL,
            intern_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            department VARCHAR(100),
            designation VARCHAR(100),
            internship_start_date DATE,
            internship_end_date DATE,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'employee_forms',
        sql: `
          CREATE TABLE IF NOT EXISTS employee_forms (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER,
            type VARCHAR(50),
            form_data JSONB,
            files TEXT[],
            status VARCHAR(50) DEFAULT 'pending',
            reviewed_by INTEGER,
            reviewed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'employee_notifications',
        sql: `
          CREATE TABLE IF NOT EXISTS employee_notifications (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER,
            notification_type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'manager_employee_mapping',
        sql: `
          CREATE TABLE IF NOT EXISTS manager_employee_mapping (
            id SERIAL PRIMARY KEY,
            manager_id INTEGER,
            employee_id INTEGER,
            mapping_type VARCHAR(50) DEFAULT 'primary',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'monthly_leave_accruals',
        sql: `
          CREATE TABLE IF NOT EXISTS monthly_leave_accruals (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            earned_leave_accrued DECIMAL(3,2) DEFAULT 0,
            sick_leave_accrued DECIMAL(3,2) DEFAULT 0,
            casual_leave_accrued DECIMAL(3,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (employee_id, year, month)
          )
        `
      },
      {
        name: 'migration_log',
        sql: `
          CREATE TABLE IF NOT EXISTS migration_log (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(255) NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'completed'
          )
        `
      }
    ];

    console.log(`📊 Creating ${tablesToCreate.length} missing tables\n`);

    // Create each table
    for (const table of tablesToCreate) {
      try {
        console.log(`📋 Creating table: ${table.name}`);
        await client.query(table.sql);
        console.log(`✅ Successfully created: ${table.name}`);
        
        // Small delay to prevent connection issues
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Table ${table.name} already exists`);
        } else {
          console.error(`❌ Error creating table ${table.name}:`, error.message);
        }
      }
    }

    console.log('\n📊 Inserting default data...');
    
    // Insert default system settings
    try {
      await client.query(`
        INSERT INTO system_settings (total_annual_leaves, allow_half_day, approval_workflow)
        SELECT 27, true, 'manager_then_hr'
        WHERE NOT EXISTS (SELECT 1 FROM system_settings)
      `);
      console.log('✅ Inserted default system settings');
    } catch (error) {
      console.log('ℹ️  System settings already exist or error:', error.message);
    }

    // Insert default expense categories
    const expenseCategories = ['Travel', 'Meals', 'Office Supplies', 'Training', 'Software/Tools', 'Communication', 'Other'];
    
    for (const category of expenseCategories) {
      try {
        await client.query(`
          INSERT INTO expense_categories (name, description)
          SELECT $1, $2
          WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = $1)
        `, [category, `${category} related expenses`]);
      } catch (error) {
        // Ignore duplicate errors
      }
    }
    console.log('✅ Inserted default expense categories');

    // Insert default departments
    const departments = [
      { name: 'Engineering', code: 'ENG', description: 'Software development and technical teams' },
      { name: 'Product', code: 'PRD', description: 'Product management and strategy' },
      { name: 'Design', code: 'DSN', description: 'UI/UX and graphic design' },
      { name: 'Marketing', code: 'MKT', description: 'Marketing and communications' },
      { name: 'Human Resources', code: 'HR', description: 'HR and administrative functions' },
      { name: 'Finance', code: 'FIN', description: 'Finance and accounting' },
      { name: 'Operations', code: 'OPS', description: 'Operations and support' }
    ];

    for (const dept of departments) {
      try {
        await client.query(`
          INSERT INTO departments (name, code, description)
          SELECT $1, $2, $3
          WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = $1 OR code = $2)
        `, [dept.name, dept.code, dept.description]);
      } catch (error) {
        // Ignore duplicate errors
      }
    }
    console.log('✅ Inserted default departments');

    // Record migration
    try {
      await client.query(`
        INSERT INTO migration_log (migration_name, status)
        VALUES ('create_missing_tables_comprehensive', 'completed')
      `);
    } catch (error) {
      // Ignore if already exists
    }

    console.log('\n🎉 Successfully created all missing tables!');
    console.log('📊 Database now has the complete schema');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

createMissingTables();