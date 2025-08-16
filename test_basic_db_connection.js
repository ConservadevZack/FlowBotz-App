#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://vpfphtrjvomejsxjmxut.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwZnBodHJqdm9tZWpzeGpteHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk2NTY1NywiZXhwIjoyMDcwNTQxNjU3fQ.Zq0z7TFerA53aTUS0CAi9WFn7No4KvcVXXXhsAU1qfg';

async function testBasicConnection() {
    console.log('🔌 Testing Basic Supabase Connection...');
    console.log('=' .repeat(50));
    
    try {
        const supabase = createClient(supabaseUrl, serviceKey);
        
        // Test 1: Basic connection
        console.log('📡 Testing connection to Supabase...');
        
        // Test with a simple query that should always work
        const { data, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .limit(5);
        
        if (error) {
            console.log('❌ Connection failed:', error.message);
            return false;
        }
        
        console.log('✅ Connection successful!');
        console.log(`📋 Found ${data.length} tables in public schema:`);
        
        data.forEach(table => {
            console.log(`  - ${table.table_name}`);
        });
        
        // Test 2: Check for essential auth tables (these should exist)
        console.log('\n🔐 Checking authentication tables...');
        
        const authTables = ['users'];
        let authTablesExist = 0;
        
        for (const tableName of authTables) {
            try {
                const { data: testData, error: testError } = await supabase
                    .from(tableName)
                    .select('id')
                    .limit(1);
                
                if (!testError) {
                    console.log(`✅ ${tableName} table: Accessible`);
                    authTablesExist++;
                } else {
                    console.log(`❌ ${tableName} table: ${testError.message}`);
                }
            } catch (err) {
                console.log(`❌ ${tableName} table: ${err.message}`);
            }
        }
        
        // Test 3: Check for FlowBotz core tables
        console.log('\n🎨 Checking FlowBotz core tables...');
        
        const flowbotzTables = ['designs', 'ai_models', 'products', 'orders'];
        let flowbotzTablesExist = 0;
        
        for (const tableName of flowbotzTables) {
            try {
                const { data: testData, error: testError } = await supabase
                    .from(tableName)
                    .select('id')
                    .limit(1);
                
                if (!testError) {
                    console.log(`✅ ${tableName} table: Accessible`);
                    flowbotzTablesExist++;
                } else {
                    console.log(`❌ ${tableName} table: ${testError.message}`);
                }
            } catch (err) {
                console.log(`❌ ${tableName} table: ${err.message}`);
            }
        }
        
        // Summary
        console.log('\n📊 Connection Test Summary:');
        console.log('=' .repeat(40));
        console.log(`🔌 Database Connection: ${data ? 'SUCCESS' : 'FAILED'}`);
        console.log(`🔐 Auth Tables: ${authTablesExist}/${authTables.length} working`);
        console.log(`🎨 FlowBotz Tables: ${flowbotzTablesExist}/${flowbotzTables.length} working`);
        
        if (flowbotzTablesExist === 0) {
            console.log('\n🚨 CRITICAL: No FlowBotz tables found!');
            console.log('   Database migration is REQUIRED immediately.');
            console.log('   See: SUPABASE_MIGRATION_GUIDE.md');
        } else if (flowbotzTablesExist < flowbotzTables.length) {
            console.log('\n⚠️  WARNING: Incomplete FlowBotz schema detected.');
            console.log('   Some features may not work properly.');
        } else {
            console.log('\n🎉 All core tables accessible!');
        }
        
        return {
            connected: true,
            authTables: authTablesExist,
            flowbotzTables: flowbotzTablesExist,
            totalPublicTables: data.length,
            migrationNeeded: flowbotzTablesExist < flowbotzTables.length
        };
        
    } catch (error) {
        console.log('❌ Fatal connection error:', error.message);
        return {
            connected: false,
            error: error.message,
            migrationNeeded: true
        };
    }
}

// Run the test
testBasicConnection()
    .then(result => {
        console.log('\n🏁 Basic Database Test Complete!');
        
        if (!result.connected) {
            console.log('❌ FAILED: Cannot connect to Supabase database');
            process.exit(1);
        } else if (result.migrationNeeded) {
            console.log('⚠️  DATABASE MIGRATION REQUIRED');
            console.log('   Run the migration guide to set up FlowBotz tables');
            process.exit(1);
        } else {
            console.log('✅ Database is ready for FlowBotz!');
            process.exit(0);
        }
    })
    .catch(err => {
        console.error('❌ Test failed:', err);
        process.exit(1);
    });