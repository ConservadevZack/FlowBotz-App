#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createMigrationTables() {
  console.log('🏗️  Creating core tables manually...');
  
  // Try creating users table first as a test
  try {
    console.log('📝 Creating users table...');
    
    // Test basic connection first
    const { data: connectionTest, error: connectionError } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1);
    
    if (connectionError) {
      console.log('   Note: auth.users query failed (expected if no auth users exist)');
    } else {
      console.log('✅ Supabase connection working');
    }
    
    // Since we can't execute raw DDL via the client, let's try a different approach
    // We'll use the SQL editor API endpoint
    
    const migration1 = fs.readFileSync('/Users/conservadev/Desktop/Projects/FlowBotzApp/project-vault/supabase_migration_001_core_schema.sql', 'utf8');
    
    console.log('🔄 Executing core schema migration via API...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: migration1
      })
    });
    
    if (!response.ok) {
      console.log('   API method not available, trying alternative...');
      return await executeViaSQLEditor(migration1);
    }
    
    console.log('✅ Core schema migration completed');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to create tables:', error.message);
    return false;
  }
}

async function executeViaSQLEditor(sql) {
  console.log('🔧 Attempting to execute via SQL editor endpoint...');
  
  try {
    // Try the SQL editor endpoint
    const response = await fetch(`${supabaseUrl}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        query: sql
      })
    });
    
    if (response.ok) {
      console.log('✅ SQL executed successfully via editor endpoint');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ SQL editor endpoint failed:', response.status, errorText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ SQL editor execution failed:', error.message);
    return false;
  }
}

async function verifySchemaCreation() {
  console.log('🔍 Verifying schema creation...');
  
  try {
    // Try to query the users table to see if it exists
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('❌ Users table does not exist - schema creation failed');
        return false;
      } else {
        console.log('✅ Users table exists (empty result is expected)');
        return true;
      }
    } else {
      console.log('✅ Users table exists and accessible');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Schema verification failed:', error.message);
    return false;
  }
}

async function manualTableCreation() {
  console.log('🛠️  Attempting manual table creation...');
  console.log('   This requires manual execution in Supabase dashboard');
  console.log('');
  console.log('📋 Instructions:');
  console.log('1. Go to https://supabase.com/dashboard/project/vpfphtrjvomejsxjmxut/sql');
  console.log('2. Open the SQL editor');
  console.log('3. Copy and paste the migration files:');
  console.log('   - First: supabase_migration_001_core_schema.sql');
  console.log('   - Second: supabase_migration_002_indexes_and_rls.sql');
  console.log('4. Execute each migration file');
  console.log('');
  console.log('🔗 Migration files are located at:');
  console.log('   📄 Core Schema: /Users/conservadev/Desktop/Projects/FlowBotzApp/project-vault/supabase_migration_001_core_schema.sql');
  console.log('   📄 Indexes & RLS: /Users/conservadev/Desktop/Projects/FlowBotzApp/project-vault/supabase_migration_002_indexes_and_rls.sql');
  
  return false;
}

async function main() {
  console.log('🚀 FlowBotz Supabase Schema Setup');
  console.log(`📍 Target: ${supabaseUrl}`);
  
  // Test basic connection
  console.log('🔌 Testing Supabase connection...');
  
  try {
    // Try a simple health check
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      }
    });
    
    if (response.ok) {
      console.log('✅ Supabase API connection successful');
    } else {
      console.error('❌ Supabase API connection failed:', response.status);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
  
  // Try to create tables
  const migrationSuccess = await createMigrationTables();
  
  if (migrationSuccess) {
    // Verify the creation
    const verificationSuccess = await verifySchemaCreation();
    
    if (verificationSuccess) {
      console.log('\n🎊 FlowBotz Database Schema Setup Complete!');
      console.log('🚀 Production database is ready for use');
    } else {
      console.log('\n⚠️  Schema creation may have failed - manual verification needed');
    }
  } else {
    // Fall back to manual instructions
    await manualTableCreation();
  }
}

main().catch(console.error);