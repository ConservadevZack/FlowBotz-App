#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://vpfphtrjvomejsxjmxut.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwZnBodHJqdm9tZWpzeGpteHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk2NTY1NywiZXhwIjoyMDcwNTQxNjU3fQ.Zq0z7TFerA53aTUS0CAi9WFn7No4KvcVXXXhsAU1qfg';

const supabase = createClient(supabaseUrl, serviceKey);

async function verifySchemaStructure() {
    console.log('🔧 Verifying Database Schema Structure...');
    console.log('=' .repeat(50));
    
    const checks = [];
    
    // Check AI models table has default data
    try {
        const { data: aiModels, error } = await supabase
            .from('ai_models')
            .select('*');
            
        if (error) {
            checks.push({ name: 'AI Models', status: 'error', details: error.message });
        } else {
            checks.push({ 
                name: 'AI Models', 
                status: aiModels.length > 0 ? 'has_data' : 'empty', 
                details: `${aiModels.length} models configured` 
            });
            
            if (aiModels.length > 0) {
                console.log('📋 AI Models configured:');
                aiModels.forEach(model => {
                    console.log(`  - ${model.name} (${model.provider}) - $${model.cost_per_generation}`);
                });
            }
        }
    } catch (err) {
        checks.push({ name: 'AI Models', status: 'error', details: err.message });
    }
    
    // Check design categories
    try {
        const { data: categories, error } = await supabase
            .from('design_categories')
            .select('*');
            
        if (error) {
            checks.push({ name: 'Design Categories', status: 'error', details: error.message });
        } else {
            checks.push({ 
                name: 'Design Categories', 
                status: categories.length > 0 ? 'has_data' : 'empty', 
                details: `${categories.length} categories available` 
            });
            
            if (categories.length > 0) {
                console.log('\n📁 Design Categories:');
                categories.forEach(cat => {
                    console.log(`  - ${cat.name} (${cat.slug})`);
                });
            }
        }
    } catch (err) {
        checks.push({ name: 'Design Categories', status: 'error', details: err.message });
    }
    
    // Check style presets
    try {
        const { data: presets, error } = await supabase
            .from('style_presets')
            .select('*');
            
        if (error) {
            checks.push({ name: 'Style Presets', status: 'error', details: error.message });
        } else {
            checks.push({ 
                name: 'Style Presets', 
                status: presets.length > 0 ? 'has_data' : 'empty', 
                details: `${presets.length} presets available` 
            });
            
            if (presets.length > 0) {
                console.log('\n🎨 Style Presets:');
                presets.forEach(preset => {
                    console.log(`  - ${preset.name}: ${preset.description}`);
                });
            }
        }
    } catch (err) {
        checks.push({ name: 'Style Presets', status: 'error', details: err.message });
    }
    
    // Check products table
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .limit(5);
            
        if (error) {
            checks.push({ name: 'Products', status: 'error', details: error.message });
        } else {
            checks.push({ 
                name: 'Products', 
                status: products.length > 0 ? 'has_data' : 'empty', 
                details: `${products.length} products found (sample)` 
            });
            
            if (products.length > 0) {
                console.log('\n🛍️ Sample Products:');
                products.forEach(product => {
                    console.log(`  - ${product.name}: $${product.base_price} (${product.category})`);
                });
            }
        }
    } catch (err) {
        checks.push({ name: 'Products', status: 'error', details: err.message });
    }
    
    // Check users table structure
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .limit(1);
            
        if (error) {
            checks.push({ name: 'Users', status: 'error', details: error.message });
        } else {
            checks.push({ 
                name: 'Users', 
                status: 'accessible', 
                details: 'Table structure verified' 
            });
        }
    } catch (err) {
        checks.push({ name: 'Users', status: 'error', details: err.message });
    }
    
    console.log('\n📊 Schema Verification Results:');
    console.log('=' .repeat(50));
    
    let hasErrors = false;
    let needsData = false;
    
    checks.forEach(check => {
        let status_icon = '✅';
        if (check.status === 'error') {
            status_icon = '❌';
            hasErrors = true;
        } else if (check.status === 'empty') {
            status_icon = '⚠️';
            needsData = true;
        }
        
        console.log(`${status_icon} ${check.name}: ${check.details}`);
    });
    
    console.log('\n🎯 Summary:');
    if (hasErrors) {
        console.log('❌ Some tables have access errors - check RLS policies');
    } else {
        console.log('✅ All core tables are accessible');
    }
    
    if (needsData) {
        console.log('⚠️  Some tables need initial data population');
    } else {
        console.log('✅ Essential tables have data');
    }
    
    // Test basic CRUD operations
    console.log('\n🧪 Testing Basic CRUD Operations...');
    
    try {
        // Test creating a design category
        const testCategory = {
            name: 'Test Category',
            slug: 'test-category-' + Date.now(),
            description: 'Test category for schema verification'
        };
        
        const { data: newCategory, error: insertError } = await supabase
            .from('design_categories')
            .insert(testCategory)
            .select()
            .single();
        
        if (insertError) {
            console.log('❌ INSERT test failed:', insertError.message);
        } else {
            console.log('✅ INSERT test passed');
            
            // Test updating the category
            const { error: updateError } = await supabase
                .from('design_categories')
                .update({ description: 'Updated test description' })
                .eq('id', newCategory.id);
            
            if (updateError) {
                console.log('❌ UPDATE test failed:', updateError.message);
            } else {
                console.log('✅ UPDATE test passed');
            }
            
            // Test deleting the category
            const { error: deleteError } = await supabase
                .from('design_categories')
                .delete()
                .eq('id', newCategory.id);
            
            if (deleteError) {
                console.log('❌ DELETE test failed:', deleteError.message);
            } else {
                console.log('✅ DELETE test passed');
            }
        }
    } catch (err) {
        console.log('❌ CRUD test error:', err.message);
    }
    
    return {
        hasErrors,
        needsData,
        tablesWorking: checks.filter(c => c.status !== 'error').length,
        totalChecks: checks.length
    };
}

// Run the verification
verifySchemaStructure()
    .then(result => {
        console.log('\n🏁 Schema verification complete!');
        
        if (result.hasErrors) {
            console.log(`⚠️  ${result.totalChecks - result.tablesWorking}/${result.totalChecks} checks failed`);
            console.log('   Some functionality may be limited due to access restrictions.');
        } else {
            console.log('🎉 All schema checks passed! Database is fully functional.');
        }
        
        process.exit(result.hasErrors ? 1 : 0);
    })
    .catch(err => {
        console.error('❌ Fatal error during schema verification:', err);
        process.exit(1);
    });