#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyTables() {
  console.log('🔍 Verifying FlowBotz database schema...\n');
  
  const expectedTables = [
    'users',
    'user_preferences', 
    'user_sessions',
    'user_stats',
    'teams',
    'team_members',
    'design_categories',
    'design_tags',
    'designs',
    'design_tag_relationships',
    'design_versions',
    'design_comments',
    'design_likes',
    'design_collaborations',
    'ai_models',
    'ai_generations',
    'style_presets',
    'generation_cache',
    'events',
    'page_views',
    'user_journeys',
    'products',
    'orders'
  ];
  
  let tableResults = {
    existing: [],
    missing: [],
    accessible: [],
    errors: []
  };
  
  for (const tableName of expectedTables) {
    try {
      console.log(`   Checking table: ${tableName}...`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('does not exist')) {
          tableResults.missing.push(tableName);
          console.log(`   ❌ ${tableName} - does not exist`);
        } else {
          tableResults.errors.push({table: tableName, error: error.message});
          console.log(`   ⚠️  ${tableName} - error: ${error.message}`);
        }
      } else {
        tableResults.existing.push(tableName);
        tableResults.accessible.push(tableName);
        console.log(`   ✅ ${tableName} - exists and accessible`);
      }
      
    } catch (err) {
      tableResults.errors.push({table: tableName, error: err.message});
      console.log(`   💥 ${tableName} - exception: ${err.message}`);
    }
  }
  
  return tableResults;
}

async function verifyRLS() {
  console.log('\n🔒 Checking Row Level Security...\n');
  
  // Test RLS by trying to access a table without proper context
  try {
    // Create a client without service role (simulating regular user)
    const regularClient = createClient(
      supabaseUrl, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Try to access users table (should be restricted)
    const { data, error } = await regularClient
      .from('users')
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('RLS')) {
      console.log('✅ RLS is active - unauthorized access properly blocked');
      return true;
    } else if (error) {
      console.log(`⚠️  RLS test inconclusive - error: ${error.message}`);
      return false;
    } else {
      console.log('❌ RLS may not be working - unauthorized access succeeded');
      return false;
    }
    
  } catch (err) {
    console.log(`⚠️  RLS verification failed: ${err.message}`);
    return false;
  }
}

async function testBasicOperations() {
  console.log('\n🧪 Testing basic database operations...\n');
  
  try {
    // Test 1: Insert a design category
    console.log('   Testing insert operation...');
    const { data: insertData, error: insertError } = await supabase
      .from('design_categories')
      .insert({
        name: 'Test Category',
        slug: 'test-category-' + Date.now(),
        description: 'Test category for migration verification'
      })
      .select()
      .single();
    
    if (insertError) {
      console.log(`   ❌ Insert test failed: ${insertError.message}`);
      return false;
    }
    
    console.log(`   ✅ Insert successful - created category: ${insertData.name}`);
    
    // Test 2: Update the category
    console.log('   Testing update operation...');
    const { data: updateData, error: updateError } = await supabase
      .from('design_categories')
      .update({ description: 'Updated description' })
      .eq('id', insertData.id)
      .select()
      .single();
    
    if (updateError) {
      console.log(`   ❌ Update test failed: ${updateError.message}`);
      return false;
    }
    
    console.log(`   ✅ Update successful`);
    
    // Test 3: Delete the test category
    console.log('   Testing delete operation...');
    const { error: deleteError } = await supabase
      .from('design_categories')
      .delete()
      .eq('id', insertData.id);
    
    if (deleteError) {
      console.log(`   ❌ Delete test failed: ${deleteError.message}`);
      return false;
    }
    
    console.log(`   ✅ Delete successful`);
    
    return true;
    
  } catch (err) {
    console.log(`   ❌ Basic operations test failed: ${err.message}`);
    return false;
  }
}

async function checkInitialData() {
  console.log('\n📊 Checking initial seed data...\n');
  
  try {
    // Check design categories
    const { data: categories, error: catError } = await supabase
      .from('design_categories')
      .select('name');
    
    if (catError) {
      console.log(`   ❌ Failed to check design categories: ${catError.message}`);
    } else {
      console.log(`   ✅ Design categories: ${categories.length} found`);
      categories.forEach(cat => console.log(`      • ${cat.name}`));
    }
    
    // Check style presets
    const { data: presets, error: presetError } = await supabase
      .from('style_presets')
      .select('name');
    
    if (presetError) {
      console.log(`   ❌ Failed to check style presets: ${presetError.message}`);
    } else {
      console.log(`   ✅ Style presets: ${presets.length} found`);
      presets.forEach(preset => console.log(`      • ${preset.name}`));
    }
    
    // Check AI models
    const { data: models, error: modelError } = await supabase
      .from('ai_models')
      .select('name, provider');
    
    if (modelError) {
      console.log(`   ❌ Failed to check AI models: ${modelError.message}`);
    } else {
      console.log(`   ✅ AI models: ${models.length} found`);
      models.forEach(model => console.log(`      • ${model.name} (${model.provider})`));
    }
    
    return true;
    
  } catch (err) {
    console.log(`   ❌ Initial data check failed: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🔎 FlowBotz Database Migration Verification');
  console.log(`📍 Target: ${supabaseUrl}\n`);
  
  // Test connection
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      }
    });
    
    if (!response.ok) {
      console.error('❌ Supabase connection failed');
      process.exit(1);
    }
    
    console.log('✅ Supabase connection successful\n');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
  
  // Run all verification tests
  const tableResults = await verifyTables();
  const rlsWorking = await verifyRLS();
  const operationsWorking = await testBasicOperations();
  const initialDataPresent = await checkInitialData();
  
  // Summary
  console.log('\n📋 Migration Verification Summary:');
  console.log('================================');
  console.log(`📊 Tables found: ${tableResults.existing.length}/${tableResults.existing.length + tableResults.missing.length}`);
  console.log(`🔒 Row Level Security: ${rlsWorking ? 'WORKING' : 'ISSUES'}`);
  console.log(`🧪 Basic Operations: ${operationsWorking ? 'WORKING' : 'FAILED'}`);
  console.log(`📊 Initial Data: ${initialDataPresent ? 'PRESENT' : 'MISSING'}`);
  
  if (tableResults.missing.length > 0) {
    console.log(`\n❌ Missing tables: ${tableResults.missing.join(', ')}`);
  }
  
  if (tableResults.errors.length > 0) {
    console.log('\n⚠️  Table errors:');
    tableResults.errors.forEach(err => {
      console.log(`   • ${err.table}: ${err.error}`);
    });
  }
  
  const allGood = (
    tableResults.missing.length === 0 && 
    tableResults.errors.length === 0 &&
    rlsWorking && 
    operationsWorking && 
    initialDataPresent
  );
  
  if (allGood) {
    console.log('\n🎊 All verifications passed! FlowBotz database is ready for production.');
  } else {
    console.log('\n⚠️  Some issues found. Please review the migration execution.');
  }
}

main().catch(console.error);