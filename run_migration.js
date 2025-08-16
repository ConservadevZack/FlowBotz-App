#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = 'https://vpfphtrjvomejsxjmxut.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwZnBodHJqdm9tZWpzeGpteHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk2NTY1NywiZXhwIjoyMDcwNTQxNjU3fQ.Zq0z7TFerA53aTUS0CAi9WFn7No4KvcVXXXhsAU1qfg';

const supabase = createClient(supabaseUrl, serviceKey);

async function runMigration() {
    console.log('🚀 Starting FlowBotz Database Migration...');
    console.log('=' .repeat(50));
    
    try {
        // Read the migration files
        const migration1Path = path.join('project-vault', 'supabase_migration_001_core_schema.sql');
        const migration2Path = path.join('project-vault', 'supabase_migration_002_indexes_and_rls.sql');
        
        if (!fs.existsSync(migration1Path)) {
            throw new Error(`Migration file not found: ${migration1Path}`);
        }
        
        if (!fs.existsSync(migration2Path)) {
            throw new Error(`Migration file not found: ${migration2Path}`);
        }
        
        const migration1SQL = fs.readFileSync(migration1Path, 'utf8');
        const migration2SQL = fs.readFileSync(migration2Path, 'utf8');
        
        console.log('📋 Migration files loaded successfully');
        console.log(`   - Core schema: ${migration1SQL.length} characters`);
        console.log(`   - Indexes & RLS: ${migration2SQL.length} characters`);
        
        // Execute migrations via RPC
        console.log('\n🔧 Executing Core Schema Migration...');
        
        const { data: result1, error: error1 } = await supabase.rpc('exec_sql', {
            sql_query: migration1SQL
        });
        
        if (error1) {
            console.log('❌ Core schema migration failed:', error1.message);
            // Try an alternative approach - split into smaller chunks
            console.log('🔄 Trying alternative approach with smaller SQL chunks...');
            
            const sqlCommands = migration1SQL
                .split(';')
                .map(cmd => cmd.trim())
                .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
            
            console.log(`   Found ${sqlCommands.length} SQL commands to execute`);
            
            let successCount = 0;
            let errorCount = 0;
            
            for (let i = 0; i < sqlCommands.length; i++) {
                const cmd = sqlCommands[i];
                if (cmd.length < 10) continue; // Skip very short commands
                
                try {
                    const { error } = await supabase.rpc('exec_sql', {
                        sql_query: cmd + ';'
                    });
                    
                    if (error) {
                        if (error.message.includes('already exists')) {
                            console.log(`   ⚠️  Command ${i + 1}: Already exists (skipping)`);
                        } else {
                            console.log(`   ❌ Command ${i + 1}: ${error.message}`);
                            errorCount++;
                        }
                    } else {
                        successCount++;
                        if (successCount % 10 === 0) {
                            console.log(`   ✅ Executed ${successCount} commands successfully`);
                        }
                    }
                } catch (err) {
                    console.log(`   ❌ Command ${i + 1}: ${err.message}`);
                    errorCount++;
                }
                
                // Small delay to avoid rate limiting
                if (i % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            console.log(`\n📊 Core migration results: ${successCount} success, ${errorCount} errors`);
        } else {
            console.log('✅ Core schema migration completed successfully');
        }
        
        // Wait a moment for the database to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n🔧 Executing Indexes & RLS Migration...');
        
        const { data: result2, error: error2 } = await supabase.rpc('exec_sql', {
            sql_query: migration2SQL
        });
        
        if (error2) {
            console.log('❌ Indexes & RLS migration failed:', error2.message);
            // Try chunked approach for second migration too
            console.log('🔄 Trying alternative approach...');
            
            const sqlCommands2 = migration2SQL
                .split(';')
                .map(cmd => cmd.trim())
                .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
            
            let successCount2 = 0;
            let errorCount2 = 0;
            
            for (const cmd of sqlCommands2) {
                if (cmd.length < 10) continue;
                
                try {
                    const { error } = await supabase.rpc('exec_sql', {
                        sql_query: cmd + ';'
                    });
                    
                    if (error) {
                        if (error.message.includes('already exists')) {
                            // Index or policy already exists - this is OK
                        } else {
                            console.log(`   ❌ ${error.message}`);
                            errorCount2++;
                        }
                    } else {
                        successCount2++;
                    }
                } catch (err) {
                    errorCount2++;
                }
            }
            
            console.log(`📊 RLS migration results: ${successCount2} success, ${errorCount2} errors`);
        } else {
            console.log('✅ Indexes & RLS migration completed successfully');
        }
        
        // Verify the migration worked
        console.log('\n🔍 Verifying migration results...');
        
        const verificationTables = [
            'users', 'designs', 'ai_models', 'products', 'orders'
        ];
        
        const results = [];
        
        for (const tableName of verificationTables) {
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(1);
                
                if (error) {
                    results.push({ table: tableName, status: 'error', message: error.message });
                } else {
                    results.push({ table: tableName, status: 'success', message: 'Accessible' });
                }
            } catch (err) {
                results.push({ table: tableName, status: 'error', message: err.message });
            }
        }
        
        console.log('\n📋 Verification Results:');
        results.forEach(result => {
            const icon = result.status === 'success' ? '✅' : '❌';
            console.log(`${icon} ${result.table}: ${result.message}`);
        });
        
        const successfulTables = results.filter(r => r.status === 'success').length;
        console.log(`\n🎯 Migration Status: ${successfulTables}/${verificationTables.length} core tables verified`);
        
        return successfulTables === verificationTables.length;
        
    } catch (error) {
        console.error('❌ Migration failed with error:', error.message);
        return false;
    }
}

// Run the migration
runMigration()
    .then(success => {
        if (success) {
            console.log('\n🎉 Database migration completed successfully!');
            console.log('   All core FlowBotz tables are now available.');
        } else {
            console.log('\n⚠️  Migration completed with some issues.');
            console.log('   Some tables may need manual verification.');
        }
    })
    .catch(err => {
        console.error('❌ Fatal migration error:', err);
        process.exit(1);
    });