#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Extract credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!serviceKey);
  process.exit(1);
}

// Extract hostname from URL
const hostname = supabaseUrl.replace('https://', '').replace('http://', '');

// Create PostgreSQL connection
const pool = new Pool({
  host: hostname,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: serviceKey,
  ssl: {
    rejectUnauthorized: false
  }
});

async function executeMigration(filePath) {
  const migrationName = path.basename(filePath);
  console.log(`\n🔄 Executing migration: ${migrationName}`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`📝 Read migration file (${sql.length} characters)`);
    
    const client = await pool.connect();
    
    try {
      // Execute the entire migration as a single transaction
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      
      console.log(`✅ Migration ${migrationName} completed successfully`);
      return { success: true, error: null };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration ${migrationName} failed:`, error.message);
      return { success: false, error: error.message };
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error(`❌ Failed to read migration file ${migrationName}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function verifyTables() {
  console.log('\n🔍 Verifying database schema...');
  
  try {
    const client = await pool.connect();
    
    // Check for key tables
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const result = await client.query(tableCheckQuery);
    const tables = result.rows.map(row => row.table_name);
    
    console.log(`📊 Found ${tables.length} tables:`);
    tables.forEach(table => console.log(`   • ${table}`));
    
    // Check for essential FlowBotz tables
    const requiredTables = [
      'users', 'designs', 'teams', 'ai_generations', 
      'products', 'orders', 'user_preferences'
    ];
    
    const missingTables = requiredTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      console.error(`❌ Missing required tables: ${missingTables.join(', ')}`);
      return false;
    }
    
    // Check RLS policies
    const rlsQuery = `
      SELECT schemaname, tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    
    const rlsResult = await client.query(rlsQuery);
    console.log(`🔒 Found ${rlsResult.rows.length} RLS policies`);
    
    client.release();
    
    console.log('✅ Database schema verification completed');
    return true;
    
  } catch (error) {
    console.error('❌ Schema verification failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 FlowBotz Database Migration');
  console.log(`📍 Target: ${supabaseUrl}`);
  console.log(`🔧 Using service role authentication`);
  
  // Test connection
  try {
    console.log('🔌 Testing database connection...');
    console.log(`   Host: ${hostname}`);
    console.log(`   Port: 5432`);
    console.log(`   Database: postgres`);
    console.log(`   User: postgres`);
    console.log(`   Password: ${serviceKey ? '[PROVIDED]' : '[MISSING]'}`);
    
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('   Full error:', error);
    process.exit(1);
  }
  
  const migrations = [
    '/Users/conservadev/Desktop/Projects/FlowBotzApp/project-vault/supabase_migration_001_core_schema.sql',
    '/Users/conservadev/Desktop/Projects/FlowBotzApp/project-vault/supabase_migration_002_indexes_and_rls.sql'
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  // Execute migrations in order
  for (const migrationFile of migrations) {
    if (!fs.existsSync(migrationFile)) {
      console.error(`❌ Migration file not found: ${migrationFile}`);
      errorCount++;
      continue;
    }
    
    const result = await executeMigration(migrationFile);
    
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    // Wait between migrations
    if (migrationFile !== migrations[migrations.length - 1]) {
      console.log('⏳ Waiting 3 seconds before next migration...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Verify the results
  const verificationPassed = await verifyTables();
  
  // Summary
  console.log('\n📋 Migration Summary:');
  console.log(`   ✅ Successful migrations: ${successCount}`);
  console.log(`   ❌ Failed migrations: ${errorCount}`);
  console.log(`   🔍 Schema verification: ${verificationPassed ? 'PASSED' : 'FAILED'}`);
  
  if (successCount === migrations.length && verificationPassed) {
    console.log('\n🎊 FlowBotz Database Setup Complete!');
    console.log('🏗️  Production schema is ready with:');
    console.log('   • User management & authentication');
    console.log('   • Design management with versioning');
    console.log('   • AI generation tracking & caching');
    console.log('   • Analytics & event tracking');
    console.log('   • POD e-commerce tables');
    console.log('   • Team collaboration features');
    console.log('   • Performance indexes');
    console.log('   • Row Level Security policies');
    console.log('   • Automated triggers & functions');
    console.log('   • Initial seed data');
    console.log('\n🚀 Ready for production use!');
  } else {
    console.log('\n⚠️  Migration completed with issues. Please review the errors above.');
  }
  
  await pool.end();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

main().catch(console.error);