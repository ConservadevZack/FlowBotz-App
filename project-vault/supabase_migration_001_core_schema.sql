-- FlowBotz Core Schema Migration
-- Migration: 001_core_schema
-- Description: Creates the complete database schema for FlowBotz

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- 1. USER MANAGEMENT & AUTHENTICATION
-- =========================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    
    -- Profile
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    
    -- Account Status  
    role TEXT NOT NULL DEFAULT 'creator' CHECK (role IN ('admin', 'creator', 'collaborator', 'viewer')),
    status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('active', 'inactive', 'suspended', 'pending_verification')),
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro')),
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    
    -- Security
    last_login TIMESTAMPTZ,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    
    -- Subscription
    customer_id TEXT, -- Stripe customer ID
    subscription_expires TIMESTAMPTZ,
    trial_expires TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- User preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- UI Preferences
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    
    -- Notifications
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    
    -- Canvas Preferences
    auto_save_interval INTEGER DEFAULT 30 CHECK (auto_save_interval BETWEEN 10 AND 300),
    canvas_grid_enabled BOOLEAN DEFAULT TRUE,
    canvas_snap_to_grid BOOLEAN DEFAULT TRUE,
    default_canvas_size JSONB DEFAULT '{"width": 800, "height": 600}',
    
    -- AI Settings
    ai_generation_settings JSONB DEFAULT '{}',
    export_quality TEXT DEFAULT 'high' CHECK (export_quality IN ('low', 'medium', 'high', 'ultra')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    
    -- Session Details
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    location JSONB DEFAULT '{}',
    
    -- Timing
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    
    -- Settings
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    max_members INTEGER DEFAULT 10,
    
    -- Ownership
    owner_id UUID NOT NULL REFERENCES users(id),
    
    -- Subscription
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Team members
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permissions JSONB DEFAULT '[]',
    
    -- Invitation
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User stats
CREATE TABLE user_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Design Stats
    designs_created INTEGER DEFAULT 0,
    designs_shared INTEGER DEFAULT 0,
    templates_created INTEGER DEFAULT 0,
    
    -- AI Stats
    ai_generations INTEGER DEFAULT 0,
    ai_credits_used INTEGER DEFAULT 0,
    
    -- Commerce Stats
    orders_placed INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    
    -- Engagement Stats
    login_streak INTEGER DEFAULT 0,
    total_logins INTEGER DEFAULT 0,
    achievements JSONB DEFAULT '[]',
    
    -- Last Activity
    last_design_created TIMESTAMPTZ,
    last_order_placed TIMESTAMPTZ,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- 2. DESIGN MANAGEMENT SYSTEM
-- =========================================================

-- Design categories
CREATE TABLE design_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    
    -- Hierarchy
    parent_id UUID REFERENCES design_categories(id),
    
    -- Display
    icon TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Design tags
CREATE TABLE design_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    color TEXT,
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main designs table
CREATE TABLE designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT,
    description TEXT,
    
    -- Ownership
    owner_id UUID NOT NULL REFERENCES users(id),
    team_id UUID REFERENCES teams(id),
    
    -- Classification
    type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('mockup', 'template', 'custom', 'ai_generated')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public', 'unlisted')),
    category_id UUID REFERENCES design_categories(id),
    
    -- Design Data
    canvas JSONB NOT NULL DEFAULT '{"width": 800, "height": 600, "background_color": "#ffffff"}',
    elements JSONB DEFAULT '[]',
    current_version INTEGER DEFAULT 1,
    
    -- Media
    thumbnail_url TEXT,
    preview_url TEXT,
    file_urls JSONB DEFAULT '{}',
    
    -- Metrics
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    fork_count INTEGER DEFAULT 0,
    
    -- AI Metadata
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_prompt TEXT,
    ai_model TEXT,
    ai_parameters JSONB DEFAULT '{}',
    
    -- Additional Data
    metadata JSONB DEFAULT '{}',
    file_size BIGINT,
    color_palette JSONB DEFAULT '[]',
    fonts_used JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Design tag relationships
CREATE TABLE design_tag_relationships (
    design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES design_tags(id) ON DELETE CASCADE,
    
    PRIMARY KEY (design_id, tag_id)
);

-- Design versions
CREATE TABLE design_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    title TEXT,
    description TEXT,
    
    -- Version Data
    canvas JSONB NOT NULL,
    elements JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    
    -- Files
    file_size BIGINT,
    preview_url TEXT,
    
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(design_id, version_number)
);

-- Design comments
CREATE TABLE design_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    parent_id UUID REFERENCES design_comments(id),
    
    content TEXT NOT NULL,
    position JSONB, -- x, y coordinates for positioned comments
    element_id TEXT, -- Associated design element
    
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Design likes
CREATE TABLE design_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(design_id, user_id)
);

-- Design collaborations
CREATE TABLE design_collaborations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'commenter', 'editor', 'admin')),
    permissions JSONB DEFAULT '[]',
    
    invited_by UUID NOT NULL REFERENCES users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(design_id, user_id)
);

-- =========================================================
-- 3. AI & GENERATION SYSTEM  
-- =========================================================

-- AI models
CREATE TABLE ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    provider TEXT NOT NULL, -- openai, stability, midjourney
    model_id TEXT NOT NULL,
    
    -- Capabilities
    type TEXT NOT NULL CHECK (type IN ('text-to-image', 'image-to-image', 'text', 'enhancement')),
    capabilities JSONB DEFAULT '[]',
    
    -- Pricing
    cost_per_generation DECIMAL(10,4) DEFAULT 0.0000,
    
    -- Limits
    max_width INTEGER,
    max_height INTEGER,
    supported_formats JSONB DEFAULT '[]',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_beta BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI generations (partitioned table)
CREATE TABLE ai_generations (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    design_id UUID REFERENCES designs(id),
    
    -- Generation Details
    model_id UUID NOT NULL REFERENCES ai_models(id),
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    parameters JSONB DEFAULT '{}',
    
    -- Results
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    result_urls JSONB DEFAULT '[]',
    error_message TEXT,
    
    -- Metrics
    processing_time INTEGER, -- milliseconds
    cost DECIMAL(10,4) DEFAULT 0.0000,
    
    -- Generation Settings
    width INTEGER,
    height INTEGER,
    seed INTEGER,
    steps INTEGER,
    guidance_scale DECIMAL(4,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for AI generations
CREATE TABLE ai_generations_2025_01 PARTITION OF ai_generations
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE ai_generations_2025_02 PARTITION OF ai_generations  
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE ai_generations_2025_03 PARTITION OF ai_generations
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- Style presets
CREATE TABLE style_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    
    -- Preset Data
    parameters JSONB NOT NULL,
    preview_url TEXT,
    
    -- Usage
    usage_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Ownership
    created_by UUID REFERENCES users(id),
    is_system_preset BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generation cache
CREATE TABLE generation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_hash TEXT UNIQUE NOT NULL,
    model_id UUID NOT NULL REFERENCES ai_models(id),
    
    -- Cache Data
    parameters_hash TEXT NOT NULL,
    result_urls JSONB NOT NULL,
    
    -- Cache Management
    hit_count INTEGER DEFAULT 1,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- 4. ANALYTICS & TRACKING
-- =========================================================

-- Events (partitioned by day for high volume)
CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id UUID,
    
    -- Event Details
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL,
    event_action TEXT NOT NULL,
    event_label TEXT,
    
    -- Context
    page_url TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address INET,
    
    -- Custom Properties
    properties JSONB DEFAULT '{}',
    
    -- Timing
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create initial event partitions
CREATE TABLE events_2025_01_01 PARTITION OF events
    FOR VALUES FROM ('2025-01-01') TO ('2025-01-02');
CREATE TABLE events_2025_01_02 PARTITION OF events
    FOR VALUES FROM ('2025-01-02') TO ('2025-01-03');

-- Page views (partitioned monthly)
CREATE TABLE page_views (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id UUID,
    
    -- Page Details
    page_url TEXT NOT NULL,
    page_title TEXT,
    referrer TEXT,
    
    -- Timing
    duration INTEGER, -- seconds
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create page view partitions
CREATE TABLE page_views_2025_01 PARTITION OF page_views
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE page_views_2025_02 PARTITION OF page_views
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- User journeys
CREATE TABLE user_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id UUID NOT NULL,
    
    -- Journey Data
    entry_page TEXT,
    exit_page TEXT,
    pages_visited JSONB DEFAULT '[]',
    events_triggered JSONB DEFAULT '[]',
    
    -- Timing
    duration INTEGER, -- seconds
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- =========================================================
-- 5. POD & E-COMMERCE
-- =========================================================

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    
    -- Classification
    category TEXT NOT NULL,
    subcategory TEXT,
    tags JSONB DEFAULT '[]',
    
    -- Product Details
    base_price DECIMAL(10,2) NOT NULL,
    print_areas JSONB NOT NULL, -- Define printable areas
    dimensions JSONB NOT NULL, -- width, height, depth
    weight DECIMAL(8,2),
    
    -- Variants
    has_variants BOOLEAN DEFAULT FALSE,
    variant_options JSONB DEFAULT '{}', -- colors, sizes, materials
    
    -- Media
    images JSONB DEFAULT '[]',
    model_3d_url TEXT,
    
    -- Availability
    is_active BOOLEAN DEFAULT TRUE,
    min_order_quantity INTEGER DEFAULT 1,
    max_order_quantity INTEGER DEFAULT 100,
    
    -- Provider Integration
    provider_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Order Details
    order_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    
    -- Pricing
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    shipping_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    
    -- Addresses
    shipping_address JSONB NOT NULL,
    billing_address JSONB,
    
    -- Payment
    payment_intent_id TEXT,
    payment_method TEXT,
    paid_at TIMESTAMPTZ,
    
    -- Fulfillment
    tracking_numbers JSONB DEFAULT '[]',
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);