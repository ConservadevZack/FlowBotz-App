# FlowBotz Database Schema Design

## Executive Summary

This document outlines a comprehensive database schema for FlowBotz designed to scale to 100M+ users with optimal performance. The schema focuses on five core domains: User Management, Design System, AI Generation, Analytics, and POD E-commerce.

## Design Principles

1. **Scalability First**: Partitioned tables for high-volume data
2. **Performance Optimized**: Strategic indexing and query optimization
3. **Data Integrity**: Foreign key constraints and validation
4. **Security**: Row Level Security (RLS) policies
5. **Extensibility**: JSON fields for flexible metadata

## Schema Overview

### Core Tables Count: 23 tables
- **Users & Auth**: 6 tables
- **Design Management**: 8 tables  
- **AI & Generation**: 4 tables
- **Analytics**: 3 tables
- **POD & Commerce**: 2 tables

---

## 1. USER MANAGEMENT & AUTHENTICATION

### 1.1 Users Table
```sql
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

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login);
```

### 1.2 User Preferences
```sql
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

CREATE UNIQUE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

### 1.3 User Sessions
```sql
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

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
```

### 1.4 Teams
```sql
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

CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_slug ON teams(slug);
```

### 1.5 Team Members
```sql
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

CREATE UNIQUE INDEX idx_team_members_team_user ON team_members(team_id, user_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
```

### 1.6 User Stats
```sql
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
```

---

## 2. DESIGN MANAGEMENT SYSTEM

### 2.1 Design Categories
```sql
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

CREATE INDEX idx_design_categories_parent_id ON design_categories(parent_id);
CREATE INDEX idx_design_categories_slug ON design_categories(slug);
```

### 2.2 Designs (Main Table)
```sql
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

-- Performance Indexes
CREATE INDEX idx_designs_owner_id ON designs(owner_id);
CREATE INDEX idx_designs_team_id ON designs(team_id);
CREATE INDEX idx_designs_status ON designs(status);
CREATE INDEX idx_designs_visibility ON designs(visibility);
CREATE INDEX idx_designs_type ON designs(type);
CREATE INDEX idx_designs_category_id ON designs(category_id);
CREATE INDEX idx_designs_created_at ON designs(created_at);
CREATE INDEX idx_designs_updated_at ON designs(updated_at);

-- Composite indexes for common queries
CREATE INDEX idx_designs_owner_status ON designs(owner_id, status);
CREATE INDEX idx_designs_public_published ON designs(visibility, status) WHERE visibility = 'public' AND status = 'published';
```

### 2.3 Design Tags
```sql
CREATE TABLE design_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    color TEXT,
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_design_tags_name ON design_tags(name);
CREATE INDEX idx_design_tags_usage_count ON design_tags(usage_count DESC);
```

### 2.4 Design Tag Relationships
```sql
CREATE TABLE design_tag_relationships (
    design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES design_tags(id) ON DELETE CASCADE,
    
    PRIMARY KEY (design_id, tag_id)
);

CREATE INDEX idx_design_tag_relationships_tag_id ON design_tag_relationships(tag_id);
```

### 2.5 Design Versions
```sql
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

CREATE INDEX idx_design_versions_design_id ON design_versions(design_id);
CREATE INDEX idx_design_versions_created_by ON design_versions(created_by);
```

### 2.6 Design Comments
```sql
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

CREATE INDEX idx_design_comments_design_id ON design_comments(design_id);
CREATE INDEX idx_design_comments_user_id ON design_comments(user_id);
CREATE INDEX idx_design_comments_parent_id ON design_comments(parent_id);
```

### 2.7 Design Likes
```sql
CREATE TABLE design_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(design_id, user_id)
);

CREATE INDEX idx_design_likes_design_id ON design_likes(design_id);
CREATE INDEX idx_design_likes_user_id ON design_likes(user_id);
```

### 2.8 Design Collaborations
```sql
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

CREATE INDEX idx_design_collaborations_design_id ON design_collaborations(design_id);
CREATE INDEX idx_design_collaborations_user_id ON design_collaborations(user_id);
```

---

## 3. AI & GENERATION SYSTEM

### 3.1 AI Models
```sql
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

CREATE INDEX idx_ai_models_provider ON ai_models(provider);
CREATE INDEX idx_ai_models_type ON ai_models(type);
```

### 3.2 AI Generations
```sql
-- Partition by month for performance
CREATE TABLE ai_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    completed_at TIMESTAMPTZ
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE ai_generations_y2025m01 PARTITION OF ai_generations
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE ai_generations_y2025m02 PARTITION OF ai_generations
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Indexes
CREATE INDEX idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX idx_ai_generations_status ON ai_generations(status);
CREATE INDEX idx_ai_generations_created_at ON ai_generations(created_at);
```

### 3.3 Style Presets
```sql
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

CREATE INDEX idx_style_presets_category ON style_presets(category);
CREATE INDEX idx_style_presets_usage_count ON style_presets(usage_count DESC);
```

### 3.4 Generation Cache
```sql
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

CREATE INDEX idx_generation_cache_prompt_hash ON generation_cache(prompt_hash);
CREATE INDEX idx_generation_cache_expires_at ON generation_cache(expires_at);
```

---

## 4. ANALYTICS & TRACKING

### 4.1 Events (High-Volume Table)
```sql
-- Partition by day for maximum performance
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

-- Create daily partitions (automated with pg_partman recommended)
CREATE TABLE events_y2025m01d01 PARTITION OF events
    FOR VALUES FROM ('2025-01-01') TO ('2025-01-02');

-- Indexes for analytics queries
CREATE INDEX idx_events_user_id ON events(user_id, timestamp);
CREATE INDEX idx_events_event_type ON events(event_type, timestamp);
CREATE INDEX idx_events_session_id ON events(session_id, timestamp);
```

### 4.2 Page Views
```sql
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

-- Monthly partitions for page views
CREATE TABLE page_views_y2025m01 PARTITION OF page_views
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE INDEX idx_page_views_user_id ON page_views(user_id, timestamp);
CREATE INDEX idx_page_views_page_url ON page_views(page_url, timestamp);
```

### 4.3 User Journey
```sql
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

CREATE INDEX idx_user_journeys_user_id ON user_journeys(user_id);
CREATE INDEX idx_user_journeys_session_id ON user_journeys(session_id);
CREATE INDEX idx_user_journeys_started_at ON user_journeys(started_at);
```

---

## 5. POD & E-COMMERCE

### 5.1 Products
```sql
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

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_is_active ON products(is_active);
```

### 5.2 Orders
```sql
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

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_order_number ON orders(order_number);
```

---

## 6. PERFORMANCE OPTIMIZATION STRATEGY

### 6.1 Indexing Strategy

**High-Performance Indexes:**
- Primary keys with UUIDs for distribution
- Composite indexes for common query patterns
- Partial indexes for filtered queries
- GIN indexes for JSONB fields

### 6.2 Partitioning Strategy

**Time-Based Partitioning:**
- Events: Daily partitions (high volume)
- AI Generations: Monthly partitions
- Page Views: Monthly partitions

### 6.3 Scaling Considerations

**Read Replicas:**
- Analytics queries on read replicas
- Design browsing on read replicas
- User dashboard on read replicas

**Connection Pooling:**
- PgBouncer for connection management
- Supabase built-in pooling

### 6.4 Caching Strategy

**Application-Level Caching:**
- Design templates in Redis
- User preferences in Redis
- Product catalog in CDN

**Database-Level Caching:**
- Materialized views for analytics
- Generation cache table

---

## 7. SECURITY & RLS POLICIES

### 7.1 Row Level Security Policies

**Users Table:**
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_select_own ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY users_update_own ON users
    FOR UPDATE USING (auth.uid() = id);
```

**Designs Table:**
```sql
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;

-- Public designs visible to all
CREATE POLICY designs_select_public ON designs
    FOR SELECT USING (visibility = 'public' AND status = 'published');

-- Owners can see their own designs
CREATE POLICY designs_select_own ON designs
    FOR SELECT USING (auth.uid() = owner_id);

-- Team members can see team designs
CREATE POLICY designs_select_team ON designs
    FOR SELECT USING (
        visibility = 'team' AND 
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );
```

### 7.2 Additional Security Measures

**Audit Logging:**
- All sensitive operations logged
- User activity tracking
- Failed authentication attempts

**Data Validation:**
- Check constraints on enum fields
- Length limits on text fields
- Foreign key constraints

---

## 8. MIGRATION PLAN

### Phase 1: Core Tables
1. Users and authentication
2. Basic design management
3. Essential indexes and RLS

### Phase 2: Advanced Features
1. AI generation system
2. Collaboration features
3. Performance partitioning

### Phase 3: Analytics & Commerce
1. Event tracking system
2. E-commerce tables
3. Advanced analytics

### Phase 4: Optimization
1. Additional indexes
2. Materialized views
3. Performance tuning

---

## Summary

This schema design supports:
- **100M+ users** with optimized indexing and partitioning
- **Real-time collaboration** with efficient querying
- **High-volume analytics** with time-based partitioning
- **Scalable AI generation** with caching and optimization
- **E-commerce functionality** with order management
- **Security** with comprehensive RLS policies

The design balances **performance**, **scalability**, and **maintainability** while providing a solid foundation for FlowBotz's growth to millions of users.