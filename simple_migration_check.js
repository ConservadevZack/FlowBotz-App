#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://vpfphtrjvomejsxjmxut.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwZnBodHJqdm9tZWpzeGpteHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk2NTY1NywiZXhwIjoyMDcwNTQxNjU3fQ.Zq0z7TFerA53aTUS0CAi9WFn7No4KvcVXXXhsAU1qfg';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkAndPopulateDatabase() {
    console.log('🔍 Checking Database State and Populating Essential Data...');
    console.log('=' .repeat(60));
    
    // Check if key tables have the expected structure by attempting operations
    const checks = [
        {
            name: 'AI Models',
            test: async () => {
                // Try to insert a test AI model
                const { data, error } = await supabase
                    .from('ai_models')
                    .upsert({
                        name: 'DALL-E 3',
                        provider: 'openai',
                        model_id: 'dall-e-3',
                        type: 'text-to-image',
                        cost_per_generation: 0.0400,
                        is_active: true
                    }, { onConflict: 'name' })
                    .select();
                
                return { success: !error, data, error };
            }
        },
        {
            name: 'Design Categories',
            test: async () => {
                const { data, error } = await supabase
                    .from('design_categories')
                    .upsert({
                        name: 'T-Shirts',
                        slug: 't-shirts',
                        description: 'T-shirt designs and mockups',
                        sort_order: 1
                    }, { onConflict: 'slug' })
                    .select();
                
                return { success: !error, data, error };
            }
        },
        {
            name: 'Style Presets',
            test: async () => {
                const { data, error } = await supabase
                    .from('style_presets')
                    .upsert({
                        name: 'Minimalist',
                        description: 'Clean and minimal design style',
                        category: 'general',
                        parameters: { style: 'minimalist', colors: ['#ffffff', '#000000'] },
                        is_system_preset: true
                    }, { onConflict: 'name' })
                    .select();
                
                return { success: !error, data, error };
            }
        },
        {
            name: 'Products',
            test: async () => {
                const { data, error } = await supabase
                    .from('products')
                    .upsert({
                        name: 'Classic T-Shirt',
                        slug: 'classic-t-shirt',
                        description: 'Classic cotton t-shirt',
                        category: 'apparel',
                        base_price: 19.99,
                        print_areas: [{ name: 'front', width: 12, height: 16 }],
                        dimensions: { width: 20, height: 28, depth: 0.1 },
                        is_active: true
                    }, { onConflict: 'slug' })
                    .select();
                
                return { success: !error, data, error };
            }
        }
    ];
    
    console.log('🧪 Testing table accessibility and data insertion...\n');
    
    const results = [];
    
    for (const check of checks) {
        console.log(`Testing ${check.name}...`);
        
        try {
            const result = await check.test();
            
            if (result.success) {
                console.log(`✅ ${check.name}: Table accessible and writable`);
                results.push({ name: check.name, status: 'success', data: result.data });
            } else {
                console.log(`❌ ${check.name}: ${result.error.message}`);
                results.push({ name: check.name, status: 'error', error: result.error.message });
            }
        } catch (err) {
            console.log(`❌ ${check.name}: ${err.message}`);
            results.push({ name: check.name, status: 'error', error: err.message });
        }
        
        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n📊 Results Summary:');
    console.log('=' .repeat(40));
    
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');
    
    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);
    
    if (successful.length > 0) {
        console.log('\n✅ Working Tables:');
        successful.forEach(r => {
            console.log(`  - ${r.name}: Data insertion successful`);
        });
    }
    
    if (failed.length > 0) {
        console.log('\n❌ Issues Found:');
        failed.forEach(r => {
            console.log(`  - ${r.name}: ${r.error}`);
        });
    }
    
    // If some tables are working, let's populate them with essential data
    if (successful.length > 0) {
        console.log('\n🌱 Populating essential default data...');
        
        try {
            // Populate AI models
            if (successful.find(r => r.name === 'AI Models')) {
                const aiModels = [
                    {
                        name: 'DALL-E 3',
                        provider: 'openai',
                        model_id: 'dall-e-3',
                        type: 'text-to-image',
                        cost_per_generation: 0.0400,
                        max_width: 1024,
                        max_height: 1024,
                        is_active: true
                    },
                    {
                        name: 'Stable Diffusion XL',
                        provider: 'stability',
                        model_id: 'stable-diffusion-xl-1024-v1-0',
                        type: 'text-to-image',
                        cost_per_generation: 0.0200,
                        max_width: 1024,
                        max_height: 1024,
                        is_active: true
                    }
                ];
                
                const { data: aiResult, error: aiError } = await supabase
                    .from('ai_models')
                    .upsert(aiModels, { onConflict: 'model_id' });
                
                if (!aiError) {
                    console.log('  ✅ AI models populated');
                } else {
                    console.log('  ⚠️  AI models: ' + aiError.message);
                }
            }
            
            // Populate design categories
            if (successful.find(r => r.name === 'Design Categories')) {
                const categories = [
                    { name: 'T-Shirts', slug: 't-shirts', description: 'T-shirt designs and mockups', sort_order: 1 },
                    { name: 'Posters', slug: 'posters', description: 'Poster and print designs', sort_order: 2 },
                    { name: 'Logos', slug: 'logos', description: 'Logo designs and branding', sort_order: 3 },
                    { name: 'Social Media', slug: 'social-media', description: 'Social media graphics', sort_order: 4 }
                ];
                
                const { error: catError } = await supabase
                    .from('design_categories')
                    .upsert(categories, { onConflict: 'slug' });
                
                if (!catError) {
                    console.log('  ✅ Design categories populated');
                } else {
                    console.log('  ⚠️  Design categories: ' + catError.message);
                }
            }
            
            // Populate style presets
            if (successful.find(r => r.name === 'Style Presets')) {
                const presets = [
                    {
                        name: 'Minimalist',
                        description: 'Clean and minimal design style',
                        category: 'general',
                        parameters: { style: 'minimalist', colors: ['#ffffff', '#000000'] },
                        is_system_preset: true
                    },
                    {
                        name: 'Vintage',
                        description: 'Retro and vintage aesthetic',
                        category: 'general',
                        parameters: { style: 'vintage', colors: ['#8B4513', '#F4A460'] },
                        is_system_preset: true
                    }
                ];
                
                const { error: presetError } = await supabase
                    .from('style_presets')
                    .upsert(presets, { onConflict: 'name' });
                
                if (!presetError) {
                    console.log('  ✅ Style presets populated');
                } else {
                    console.log('  ⚠️  Style presets: ' + presetError.message);
                }
            }
            
        } catch (err) {
            console.log('  ❌ Error populating data:', err.message);
        }
    }
    
    // Final verification
    console.log('\n🔍 Final Verification...');
    
    try {
        const { data: aiModels } = await supabase.from('ai_models').select('name');
        const { data: categories } = await supabase.from('design_categories').select('name');
        const { data: presets } = await supabase.from('style_presets').select('name');
        
        console.log(`📋 Data Summary:`);
        console.log(`  - AI Models: ${aiModels?.length || 0} configured`);
        console.log(`  - Design Categories: ${categories?.length || 0} available`);
        console.log(`  - Style Presets: ${presets?.length || 0} ready`);
        
    } catch (err) {
        console.log('⚠️  Could not verify final data counts');
    }
    
    return {
        tablesWorking: successful.length,
        totalTables: results.length,
        success: successful.length >= 3 // At least 3 core tables working
    };
}

// Run the check
checkAndPopulateDatabase()
    .then(result => {
        console.log('\n🏁 Database Check Complete!');
        
        if (result.success) {
            console.log('🎉 Database is functional with essential data populated.');
            console.log('   FlowBotz core functionality should now work properly.');
        } else {
            console.log('⚠️  Database has significant issues that need manual resolution.');
            console.log('   Some core features may not work until tables are properly migrated.');
        }
        
        process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });