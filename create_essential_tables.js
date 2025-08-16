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

// Essential table creation functions
async function createUserPreferences() {
  console.log('📝 Creating user_preferences table...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
        language TEXT DEFAULT 'en',
        timezone TEXT DEFAULT 'UTC',
        email_notifications BOOLEAN DEFAULT TRUE,
        push_notifications BOOLEAN DEFAULT TRUE,
        marketing_emails BOOLEAN DEFAULT FALSE,
        auto_save_interval INTEGER DEFAULT 30 CHECK (auto_save_interval BETWEEN 10 AND 300),
        canvas_grid_enabled BOOLEAN DEFAULT TRUE,
        canvas_snap_to_grid BOOLEAN DEFAULT TRUE,
        default_canvas_size JSONB DEFAULT '{"width": 800, "height": 600}',
        ai_generation_settings JSONB DEFAULT '{}',
        export_quality TEXT DEFAULT 'high' CHECK (export_quality IN ('low', 'medium', 'high', 'ultra')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
    `
  });
  
  if (error) {
    console.error('❌ Failed to create user_preferences:', error);
    return false;
  }
  
  console.log('✅ user_preferences table created');
  return true;
}

async function createUserStats() {
  console.log('📝 Creating user_stats table...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id UUID PRIMARY KEY,
        designs_created INTEGER DEFAULT 0,
        designs_shared INTEGER DEFAULT 0,
        templates_created INTEGER DEFAULT 0,
        ai_generations INTEGER DEFAULT 0,
        ai_credits_used INTEGER DEFAULT 0,
        ai_credits_remaining INTEGER DEFAULT 100,
        orders_placed INTEGER DEFAULT 0,
        total_spent DECIMAL(10,2) DEFAULT 0.00,
        login_streak INTEGER DEFAULT 0,
        total_logins INTEGER DEFAULT 0,
        achievements JSONB DEFAULT '[]',
        last_design_created TIMESTAMPTZ,
        last_order_placed TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  
  if (error) {
    console.error('❌ Failed to create user_stats:', error);
    return false;
  }
  
  console.log('✅ user_stats table created');
  return true;
}

async function createAIModels() {
  console.log('📝 Creating ai_models table...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS ai_models (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        model_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('text-to-image', 'image-to-image', 'text', 'enhancement')),
        capabilities JSONB DEFAULT '[]',
        cost_per_generation DECIMAL(10,4) DEFAULT 0.0000,
        max_width INTEGER,
        max_height INTEGER,
        supported_formats JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT TRUE,
        is_beta BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);
      CREATE INDEX IF NOT EXISTS idx_ai_models_type ON ai_models(type);
    `
  });
  
  if (error) {
    console.error('❌ Failed to create ai_models:', error);
    return false;
  }
  
  console.log('✅ ai_models table created');
  return true;
}

async function createAIGenerations() {
  console.log('📝 Creating ai_generations table...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS ai_generations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        design_id UUID,
        model_id UUID,
        prompt TEXT NOT NULL,
        negative_prompt TEXT,
        parameters JSONB DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
        result_urls JSONB DEFAULT '[]',
        error_message TEXT,
        processing_time INTEGER,
        cost DECIMAL(10,4) DEFAULT 0.0000,
        width INTEGER,
        height INTEGER,
        seed INTEGER,
        steps INTEGER,
        guidance_scale DECIMAL(4,2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
      
      CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_generations_status ON ai_generations(status);
      CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at);
    `
  });
  
  if (error) {
    console.error('❌ Failed to create ai_generations:', error);
    return false;
  }
  
  console.log('✅ ai_generations table created');
  return true;
}

async function createStylePresets() {
  console.log('📝 Creating style_presets table...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS style_presets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        parameters JSONB NOT NULL,
        preview_url TEXT,
        usage_count INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT FALSE,
        created_by UUID,
        is_system_preset BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_style_presets_category ON style_presets(category);
      CREATE INDEX IF NOT EXISTS idx_style_presets_usage_count ON style_presets(usage_count DESC);
    `
  });
  
  if (error) {
    console.error('❌ Failed to create style_presets:', error);
    return false;
  }
  
  console.log('✅ style_presets table created');
  return true;
}

async function createProducts() {
  console.log('📝 Creating products table...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        subcategory TEXT,
        tags JSONB DEFAULT '[]',
        base_price DECIMAL(10,2) NOT NULL,
        print_areas JSONB NOT NULL,
        dimensions JSONB NOT NULL,
        weight DECIMAL(8,2),
        has_variants BOOLEAN DEFAULT FALSE,
        variant_options JSONB DEFAULT '{}',
        images JSONB DEFAULT '[]',
        model_3d_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        min_order_quantity INTEGER DEFAULT 1,
        max_order_quantity INTEGER DEFAULT 100,
        provider_data JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
      CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
    `
  });
  
  if (error) {
    console.error('❌ Failed to create products:', error);
    return false;
  }
  
  console.log('✅ products table created');
  return true;
}

async function createOrders() {
  console.log('📝 Creating orders table...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        order_number TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0.00,
        shipping_amount DECIMAL(10,2) DEFAULT 0.00,
        discount_amount DECIMAL(10,2) DEFAULT 0.00,
        total_amount DECIMAL(10,2) NOT NULL,
        currency TEXT DEFAULT 'USD',
        shipping_address JSONB NOT NULL,
        billing_address JSONB,
        payment_intent_id TEXT,
        payment_method TEXT,
        paid_at TIMESTAMPTZ,
        tracking_numbers JSONB DEFAULT '[]',
        shipped_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        notes TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
    `
  });
  
  if (error) {
    console.error('❌ Failed to create orders:', error);
    return false;
  }
  
  console.log('✅ orders table created');
  return true;
}

async function createDesignCategories() {
  console.log('📝 Creating design_categories table...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS design_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        parent_id UUID,
        icon TEXT,
        color TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_design_categories_parent_id ON design_categories(parent_id);
      CREATE INDEX IF NOT EXISTS idx_design_categories_slug ON design_categories(slug);
    `
  });
  
  if (error) {
    console.error('❌ Failed to create design_categories:', error);
    return false;
  }
  
  console.log('✅ design_categories table created');
  return true;
}

async function seedInitialData() {
  console.log('🌱 Seeding initial data...');
  
  try {
    // Insert default AI models
    const { error: aiModelsError } = await supabase
      .from('ai_models')
      .upsert([
        {
          name: 'DALL-E 3',
          provider: 'openai',
          model_id: 'dall-e-3',
          type: 'text-to-image',
          cost_per_generation: 0.0400,
          is_active: true
        },
        {
          name: 'Stable Diffusion XL',
          provider: 'stability',
          model_id: 'stable-diffusion-xl-1024-v1-0',
          type: 'text-to-image',
          cost_per_generation: 0.0200,
          is_active: true
        }
      ], { onConflict: 'model_id' });
    
    if (aiModelsError) {
      console.log('   Note: AI models seeding failed (may already exist)');
    } else {
      console.log('✅ AI models seeded');
    }
    
    // Insert default style presets
    const { error: presetsError } = await supabase
      .from('style_presets')
      .upsert([
        {
          name: 'Minimalist',
          description: 'Clean and minimal design style',
          category: 'general',
          parameters: {
            style: 'minimalist',
            colors: ['#ffffff', '#000000'],
            typography: 'clean'
          },
          is_system_preset: true
        },
        {
          name: 'Vintage',
          description: 'Retro and vintage aesthetic',
          category: 'general',
          parameters: {
            style: 'vintage',
            colors: ['#8B4513', '#F4A460'],
            filters: ['sepia', 'grain']
          },
          is_system_preset: true
        }
      ], { onConflict: 'name' });
    
    if (presetsError) {
      console.log('   Note: Style presets seeding failed (may already exist)');
    } else {
      console.log('✅ Style presets seeded');
    }
    
    // Insert default design categories
    const { error: categoriesError } = await supabase
      .from('design_categories')
      .upsert([
        {
          name: 'T-Shirts',
          slug: 't-shirts',
          description: 'T-shirt designs and mockups',
          sort_order: 1
        },
        {
          name: 'Posters',
          slug: 'posters',
          description: 'Poster and print designs',
          sort_order: 2
        },
        {
          name: 'Logos',
          slug: 'logos',
          description: 'Logo designs and branding',
          sort_order: 3
        }
      ], { onConflict: 'slug' });
    
    if (categoriesError) {
      console.log('   Note: Design categories seeding failed (may already exist)');
    } else {
      console.log('✅ Design categories seeded');
    }
    
    console.log('✅ Initial data seeding completed');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to seed initial data:', error);
    return false;
  }
}

async function enableRLS() {
  console.log('🔒 Setting up Row Level Security...');
  
  const tables = [
    'user_preferences',
    'user_stats',
    'ai_models',
    'ai_generations',
    'style_presets',
    'products',
    'orders',
    'design_categories'
  ];
  
  for (const table of tables) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY IF NOT EXISTS "${table}_user_policy" ON ${table}
            FOR ALL USING (
              CASE 
                WHEN '${table}' = 'user_preferences' THEN auth.uid()::text = user_id::text
                WHEN '${table}' = 'user_stats' THEN auth.uid()::text = user_id::text  
                WHEN '${table}' = 'ai_generations' THEN auth.uid()::text = user_id::text
                WHEN '${table}' = 'orders' THEN auth.uid()::text = user_id::text
                ELSE TRUE
              END
            );
        `
      });
      
      if (error) {
        console.log(`   Warning: RLS setup for ${table} may have failed`);
      } else {
        console.log(`✅ RLS enabled for ${table}`);
      }
    } catch (error) {
      console.log(`   Warning: RLS setup for ${table} encountered error`);
    }
  }
}

async function main() {
  console.log('🚀 FlowBotz Essential Tables Setup');
  console.log(`📍 Target: ${supabaseUrl}`);
  
  // Create all essential tables
  const tables = [
    createUserPreferences,
    createUserStats,
    createAIModels,
    createAIGenerations,
    createStylePresets,
    createProducts,
    createOrders,
    createDesignCategories
  ];
  
  let successCount = 0;
  
  for (const createTable of tables) {
    try {
      const success = await createTable();
      if (success) successCount++;
    } catch (error) {
      console.error('❌ Table creation error:', error);
    }
  }
  
  console.log(`\n📊 Tables created: ${successCount}/${tables.length}`);
  
  // Seed initial data
  await seedInitialData();
  
  // Enable RLS
  await enableRLS();
  
  console.log('\n🎉 FlowBotz Essential Database Setup Complete!');
  console.log('🔄 Run verify_migration.js to check the setup');
}

main().catch(console.error);