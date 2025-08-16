#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://vpfphtrjvomejsxjmxut.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwZnBodHJqdm9tZWpzeGpteHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk2NTY1NywiZXhwIjoyMDcwNTQxNjU3fQ.Zq0z7TFerA53aTUS0CAi9WFn7No4KvcVXXXhsAU1qfg';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkDatabaseState() {
    console.log('🔍 Analyzing Supabase Database State...');
    console.log('=' .repeat(50));
    
    // Expected tables based on our schema
    const expectedTables = [
        'users', 'user_preferences', 'user_sessions', 'user_stats',
        'teams', 'team_members', 'designs', 'design_categories', 
        'design_tags', 'design_tag_relationships', 'design_versions',
        'design_comments', 'design_likes', 'design_collaborations',
        'ai_models', 'ai_generations', 'style_presets', 'generation_cache',
        'events', 'page_views', 'user_journeys', 'products', 'orders'
    ];
    
    const existingTables = [];
    const missingTables = [];
    
    console.log('Checking table existence...\n');
    
    // Check each table individually
    for (const tableName of expectedTables) {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);
            
            if (error) {
                if (error.message.includes('relation') && error.message.includes('does not exist')) {
                    missingTables.push(tableName);
                    console.log(`❌ ${tableName} - Missing`);
                } else {
                    // Table exists but may have RLS or other restrictions
                    existingTables.push(tableName);
                    console.log(`✅ ${tableName} - Exists (${error.message.includes('RLS') ? 'RLS Protected' : 'Accessible'})`);
                }
            } else {
                existingTables.push(tableName);
                console.log(`✅ ${tableName} - Exists and accessible`);
            }
        } catch (err) {
            missingTables.push(tableName);
            console.log(`❌ ${tableName} - Error: ${err.message}`);
        }
    }
    
    console.log('\n📊 Database Analysis Summary:');
    console.log(`Total expected tables: ${expectedTables.length}`);
    console.log(`Existing tables: ${existingTables.length}`);
    console.log(`Missing tables: ${missingTables.length}`);
    console.log(`Migration needed: ${missingTables.length > 0 ? 'YES' : 'NO'}`);
    
    if (missingTables.length > 0) {
        console.log('\n🚨 Missing Tables (require migration):');
        missingTables.forEach(table => console.log(`  - ${table}`));
    }
    
    if (existingTables.length > 0) {
        console.log('\n✅ Existing Tables:');
        existingTables.forEach(table => console.log(`  - ${table}`));
    }
    
    // Try to get some basic info about existing tables
    if (existingTables.includes('users')) {
        try {
            const { count } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });
            console.log(`\n👥 Users table contains ${count || 0} records`);
        } catch (err) {
            console.log(`\n👥 Users table exists but count query failed: ${err.message}`);
        }
    }
    
    return {
        total: expectedTables.length,
        existing: existingTables.length,
        missing: missingTables.length,
        missingTables: missingTables,
        existingTables: existingTables
    };
}

// Run the check
checkDatabaseState()
    .then(result => {
        console.log('\n🏁 Database state analysis complete!');
        
        if (result.missing > 0) {
            console.log(`\n⚠️  CRITICAL: ${result.missing}/${result.total} tables are missing!`);
            console.log('   Migration is required before the application can function properly.');
        } else {
            console.log('\n🎉 All tables exist! Database schema is complete.');
        }
        
        process.exit(result.missing > 0 ? 1 : 0);
    })
    .catch(err => {
        console.error('❌ Fatal error during database analysis:', err);
        process.exit(1);
    });