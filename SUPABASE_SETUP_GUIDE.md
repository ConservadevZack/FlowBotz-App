# FlowBotz Supabase Database Setup Guide

## Executive Summary

This guide provides step-by-step instructions to manually set up the FlowBotz database schema in Supabase. The automated migration failed due to API restrictions, so manual execution is required.

**Current Status:** Only 3 out of 21 required tables exist
**Tables Existing:** users, user_sessions, designs
**Tables Missing:** 18 critical tables for full functionality

## Prerequisites

- Access to Supabase Dashboard
- Project URL: `https://vpfphtrjvomejsxjmxut.supabase.co`
- Service role key configured in environment

## Step 1: Access Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/vpfphtrjvomejsxjmxut/sql)
2. Navigate to SQL Editor
3. Create a new query

## Step 2: Execute Core Schema Migration

Copy and paste the following SQL scripts in order:

### 2.1 Enable Required Extensions

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 2.2 Create Missing Core Tables

```sql
-- User preferences table
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

-- User stats table
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

-- AI models table
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

-- AI generations table
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

-- Style presets table
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

-- Design categories table
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

-- Design tags table
CREATE TABLE IF NOT EXISTS design_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    color TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Design tag relationships table
CREATE TABLE IF NOT EXISTS design_tag_relationships (
    design_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    PRIMARY KEY (design_id, tag_id)
);

-- Design versions table
CREATE TABLE IF NOT EXISTS design_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    title TEXT,
    description TEXT,
    canvas JSONB NOT NULL,
    elements JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    file_size BIGINT,
    preview_url TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(design_id, version_number)
);

-- Design comments table
CREATE TABLE IF NOT EXISTS design_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID NOT NULL,
    user_id UUID NOT NULL,
    parent_id UUID,
    content TEXT NOT NULL,
    position JSONB,
    element_id TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Design likes table
CREATE TABLE IF NOT EXISTS design_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(design_id, user_id)
);

-- Design collaborations table
CREATE TABLE IF NOT EXISTS design_collaborations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'commenter', 'editor', 'admin')),
    permissions JSONB DEFAULT '[]',
    invited_by UUID NOT NULL,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(design_id, user_id)
);

-- Products table
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

-- Orders table
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

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    max_members INTEGER DEFAULT 10,
    owner_id UUID NOT NULL,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permissions JSONB DEFAULT '[]',
    invited_by UUID,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table (analytics)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_id UUID,
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL,
    event_action TEXT NOT NULL,
    event_label TEXT,
    page_url TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address INET,
    properties JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Page views table
CREATE TABLE IF NOT EXISTS page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_id UUID,
    page_url TEXT NOT NULL,
    page_title TEXT,
    referrer TEXT,
    duration INTEGER,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- User journeys table
CREATE TABLE IF NOT EXISTS user_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_id UUID NOT NULL,
    entry_page TEXT,
    exit_page TEXT,
    pages_visited JSONB DEFAULT '[]',
    events_triggered JSONB DEFAULT '[]',
    duration INTEGER,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Generation cache table
CREATE TABLE IF NOT EXISTS generation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_hash TEXT UNIQUE NOT NULL,
    model_id UUID NOT NULL,
    parameters_hash TEXT NOT NULL,
    result_urls JSONB NOT NULL,
    hit_count INTEGER DEFAULT 1,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Create Performance Indexes

```sql
-- User tables indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- AI tables indexes
CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);
CREATE INDEX IF NOT EXISTS idx_ai_models_type ON ai_models(type);
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_status ON ai_generations(status);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at);

-- Design tables indexes
CREATE INDEX IF NOT EXISTS idx_designs_owner_id ON designs(owner_id);
CREATE INDEX IF NOT EXISTS idx_designs_status ON designs(status);
CREATE INDEX IF NOT EXISTS idx_designs_visibility ON designs(visibility);
CREATE INDEX IF NOT EXISTS idx_designs_created_at ON designs(created_at);
CREATE INDEX IF NOT EXISTS idx_designs_updated_at ON designs(updated_at);

-- Design relationship indexes
CREATE INDEX IF NOT EXISTS idx_design_versions_design_id ON design_versions(design_id);
CREATE INDEX IF NOT EXISTS idx_design_comments_design_id ON design_comments(design_id);
CREATE INDEX IF NOT EXISTS idx_design_likes_design_id ON design_likes(design_id);
CREATE INDEX IF NOT EXISTS idx_design_likes_user_id ON design_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_design_collaborations_design_id ON design_collaborations(design_id);

-- Category and tag indexes
CREATE INDEX IF NOT EXISTS idx_design_categories_slug ON design_categories(slug);
CREATE INDEX IF NOT EXISTS idx_design_tags_name ON design_tags(name);
CREATE INDEX IF NOT EXISTS idx_design_tag_relationships_tag_id ON design_tag_relationships(tag_id);

-- Style presets indexes
CREATE INDEX IF NOT EXISTS idx_style_presets_category ON style_presets(category);
CREATE INDEX IF NOT EXISTS idx_style_presets_usage_count ON style_presets(usage_count DESC);

-- E-commerce indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Team indexes
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_user_journeys_user_id ON user_journeys(user_id);

-- Cache indexes
CREATE INDEX IF NOT EXISTS idx_generation_cache_prompt_hash ON generation_cache(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_generation_cache_expires_at ON generation_cache(expires_at);
```

### 2.4 Enable Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "user_preferences_policy" ON user_preferences
  FOR ALL USING (auth.uid()::text = user_id::text);

-- User stats policies
CREATE POLICY "user_stats_policy" ON user_stats
  FOR ALL USING (auth.uid()::text = user_id::text);

-- AI generations policies
CREATE POLICY "ai_generations_policy" ON ai_generations
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Designs policies
CREATE POLICY "designs_owner_policy" ON designs
  FOR ALL USING (auth.uid()::text = owner_id::text);

CREATE POLICY "designs_public_read" ON designs
  FOR SELECT USING (visibility = 'public' AND status = 'published');

-- Design versions policies
CREATE POLICY "design_versions_policy" ON design_versions
  FOR SELECT USING (
    design_id IN (
      SELECT id FROM designs 
      WHERE owner_id::text = auth.uid()::text OR visibility = 'public'
    )
  );

-- Design comments policies
CREATE POLICY "design_comments_read" ON design_comments
  FOR SELECT USING (
    design_id IN (
      SELECT id FROM designs 
      WHERE owner_id::text = auth.uid()::text OR visibility = 'public'
    )
  );

CREATE POLICY "design_comments_write" ON design_comments
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Design likes policies
CREATE POLICY "design_likes_policy" ON design_likes
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Orders policies
CREATE POLICY "orders_policy" ON orders
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Teams policies
CREATE POLICY "teams_owner_policy" ON teams
  FOR ALL USING (auth.uid()::text = owner_id::text);

CREATE POLICY "teams_member_read" ON teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM team_members 
      WHERE user_id::text = auth.uid()::text AND is_active = TRUE
    )
  );

-- Team members policies
CREATE POLICY "team_members_policy" ON team_members
  FOR SELECT USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id::text = auth.uid()::text
    ) OR user_id::text = auth.uid()::text
  );
```

### 2.5 Create Helper Functions

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at 
    BEFORE UPDATE ON user_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_designs_updated_at 
    BEFORE UPDATE ON designs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_design_comments_updated_at 
    BEFORE UPDATE ON design_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at 
    BEFORE UPDATE ON teams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Step 3: Seed Initial Data

```sql
-- Insert default AI models
INSERT INTO ai_models (name, provider, model_id, type, cost_per_generation, is_active) VALUES
('DALL-E 3', 'openai', 'dall-e-3', 'text-to-image', 4.0000, true),
('Stable Diffusion XL', 'stability', 'stable-diffusion-xl-1024-v1-0', 'text-to-image', 2.0000, true),
('Stable Diffusion Inpainting', 'stability', 'stable-inpainting-v1-0', 'image-to-image', 3.0000, true)
ON CONFLICT (model_id) DO NOTHING;

-- Insert default style presets
INSERT INTO style_presets (name, description, category, parameters, is_system_preset) VALUES
('Minimalist', 'Clean and minimal design style', 'general', '{"style": "minimalist", "colors": ["#ffffff", "#000000"], "typography": "clean"}', true),
('Vintage', 'Retro and vintage aesthetic', 'general', '{"style": "vintage", "colors": ["#8B4513", "#F4A460"], "filters": ["sepia", "grain"]}', true),
('Modern', 'Contemporary and sleek design', 'general', '{"style": "modern", "colors": ["#FF6B35", "#004E98"], "typography": "bold"}', true),
('Artistic', 'Creative and artistic style', 'general', '{"style": "artistic", "effects": ["painterly", "abstract"], "colors": ["#FF006E", "#8338EC"]}', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default design categories
INSERT INTO design_categories (name, slug, description, sort_order) VALUES
('T-Shirts', 't-shirts', 'T-shirt designs and mockups', 1),
('Posters', 'posters', 'Poster and print designs', 2),
('Logos', 'logos', 'Logo designs and branding', 3),
('Social Media', 'social-media', 'Social media graphics and posts', 4),
('Business Cards', 'business-cards', 'Business card designs', 5),
('Stickers', 'stickers', 'Sticker designs and decals', 6)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, slug, description, category, base_price, print_areas, dimensions) VALUES
('Classic T-Shirt', 'classic-t-shirt', 'Comfortable cotton t-shirt', 'apparel', 19.99, '{"front": {"width": 12, "height": 16}, "back": {"width": 12, "height": 16}}', '{"width": 20, "height": 28}'),
('Canvas Poster', 'canvas-poster', 'High-quality canvas poster', 'prints', 29.99, '{"main": {"width": 16, "height": 20}}', '{"width": 16, "height": 20}'),
('Vinyl Sticker', 'vinyl-sticker', 'Durable vinyl sticker', 'stickers', 4.99, '{"main": {"width": 3, "height": 3}}', '{"width": 3, "height": 3}')
ON CONFLICT (slug) DO NOTHING;
```

## Step 4: Verify Setup

Run the verification script to confirm all tables are created:

```bash
node verify_migration.js
```

Expected output should show all 21 tables as existing and accessible.

## Step 5: Test Database Integration

1. Start the frontend application
2. Sign in with Google
3. Check that user stats and preferences are initialized
4. Test AI generation functionality
5. Verify credit system is working

## Security Considerations

- All tables have Row Level Security (RLS) enabled
- Users can only access their own data
- Public designs are visible to all authenticated users
- Team-based access control is implemented
- Credit consumption is tracked and secured

## Performance Optimizations

- Strategic indexes for common query patterns
- Composite indexes for multi-column searches
- Partitioning ready for high-volume tables
- Optimized for read-heavy workloads

## Next Steps

1. **Complete Migration:** Execute all SQL scripts above
2. **Test Integration:** Verify application functionality
3. **Monitor Performance:** Check query performance
4. **Setup Backups:** Configure automated backups
5. **Enable Monitoring:** Setup database monitoring

## Troubleshooting

### Common Issues

1. **Permission Errors:** Ensure you have admin access to the Supabase project
2. **Constraint Violations:** Check for existing data conflicts
3. **Index Failures:** May indicate table relationship issues
4. **RLS Problems:** Verify auth.uid() function is available

### Support

- Check Supabase logs for detailed error messages
- Verify environment variables are correctly set
- Test database connection with simple queries first

## Rollback Plan

If issues occur during migration:

1. Drop newly created tables in reverse order
2. Remove indexes and triggers
3. Restore from backup if available
4. Contact database administrator for assistance

---

**Migration Status:** Ready for manual execution
**Estimated Time:** 15-30 minutes
**Complexity:** Medium
**Risk Level:** Low (non-destructive changes)