-- FlowBotz Indexes and Row Level Security Migration
-- Migration: 002_indexes_and_rls
-- Description: Creates performance indexes and security policies

-- =========================================================
-- PERFORMANCE INDEXES
-- =========================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login);

-- User preferences
CREATE UNIQUE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- User sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Teams
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_slug ON teams(slug);

-- Team members  
CREATE UNIQUE INDEX idx_team_members_team_user ON team_members(team_id, user_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- Design categories
CREATE INDEX idx_design_categories_parent_id ON design_categories(parent_id);
CREATE INDEX idx_design_categories_slug ON design_categories(slug);

-- Design tags
CREATE INDEX idx_design_tags_name ON design_tags(name);
CREATE INDEX idx_design_tags_usage_count ON design_tags(usage_count DESC);

-- Designs table (critical performance indexes)
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
CREATE INDEX idx_designs_public_published ON designs(visibility, status) 
    WHERE visibility = 'public' AND status = 'published';

-- Design relationships
CREATE INDEX idx_design_tag_relationships_tag_id ON design_tag_relationships(tag_id);

-- Design versions
CREATE INDEX idx_design_versions_design_id ON design_versions(design_id);
CREATE INDEX idx_design_versions_created_by ON design_versions(created_by);

-- Design comments
CREATE INDEX idx_design_comments_design_id ON design_comments(design_id);
CREATE INDEX idx_design_comments_user_id ON design_comments(user_id);
CREATE INDEX idx_design_comments_parent_id ON design_comments(parent_id);

-- Design likes
CREATE INDEX idx_design_likes_design_id ON design_likes(design_id);
CREATE INDEX idx_design_likes_user_id ON design_likes(user_id);

-- Design collaborations
CREATE INDEX idx_design_collaborations_design_id ON design_collaborations(design_id);
CREATE INDEX idx_design_collaborations_user_id ON design_collaborations(user_id);

-- AI models
CREATE INDEX idx_ai_models_provider ON ai_models(provider);
CREATE INDEX idx_ai_models_type ON ai_models(type);

-- AI generations (on each partition)
CREATE INDEX idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX idx_ai_generations_status ON ai_generations(status);
CREATE INDEX idx_ai_generations_created_at ON ai_generations(created_at);

-- Style presets
CREATE INDEX idx_style_presets_category ON style_presets(category);
CREATE INDEX idx_style_presets_usage_count ON style_presets(usage_count DESC);

-- Generation cache
CREATE INDEX idx_generation_cache_prompt_hash ON generation_cache(prompt_hash);
CREATE INDEX idx_generation_cache_expires_at ON generation_cache(expires_at);

-- Events (high-volume indexes)
CREATE INDEX idx_events_user_id ON events USING BTREE (user_id, timestamp);
CREATE INDEX idx_events_event_type ON events USING BTREE (event_type, timestamp);
CREATE INDEX idx_events_session_id ON events USING BTREE (session_id, timestamp);

-- Page views
CREATE INDEX idx_page_views_user_id ON page_views(user_id, timestamp);
CREATE INDEX idx_page_views_page_url ON page_views USING BTREE (page_url, timestamp);

-- User journeys
CREATE INDEX idx_user_journeys_user_id ON user_journeys(user_id);
CREATE INDEX idx_user_journeys_session_id ON user_journeys(session_id);
CREATE INDEX idx_user_journeys_started_at ON user_journeys(started_at);

-- Products
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_is_active ON products(is_active);

-- Orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- =========================================================
-- ROW LEVEL SECURITY POLICIES
-- =========================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- USERS TABLE POLICIES
-- =========================================================

-- Users can view their own data
CREATE POLICY users_select_own ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY users_update_own ON users  
    FOR UPDATE USING (auth.uid() = id);

-- Public user profiles (limited fields)
CREATE POLICY users_select_public ON users
    FOR SELECT USING (
        is_verified = TRUE AND 
        status = 'active' AND
        auth.uid() IS NOT NULL
    );

-- =========================================================
-- USER PREFERENCES POLICIES
-- =========================================================

CREATE POLICY user_preferences_own ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- =========================================================
-- USER SESSIONS POLICIES  
-- =========================================================

CREATE POLICY user_sessions_own ON user_sessions
    FOR ALL USING (auth.uid() = user_id);

-- =========================================================
-- USER STATS POLICIES
-- =========================================================

CREATE POLICY user_stats_own ON user_stats
    FOR ALL USING (auth.uid() = user_id);

-- =========================================================
-- TEAMS POLICIES
-- =========================================================

-- Team owners can manage their teams
CREATE POLICY teams_owner_all ON teams
    FOR ALL USING (auth.uid() = owner_id);

-- Team members can view their teams
CREATE POLICY teams_members_select ON teams
    FOR SELECT USING (
        id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );

-- Public teams visible to authenticated users
CREATE POLICY teams_public_select ON teams
    FOR SELECT USING (is_public = TRUE AND auth.uid() IS NOT NULL);

-- =========================================================
-- TEAM MEMBERS POLICIES
-- =========================================================

-- Team owners can manage members
CREATE POLICY team_members_owner_all ON team_members
    FOR ALL USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()
        )
    );

-- Members can view other team members
CREATE POLICY team_members_view ON team_members
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );

-- =========================================================
-- DESIGNS POLICIES
-- =========================================================

-- Owners can manage their designs
CREATE POLICY designs_owner_all ON designs
    FOR ALL USING (auth.uid() = owner_id);

-- Public designs visible to all authenticated users
CREATE POLICY designs_public_select ON designs
    FOR SELECT USING (
        visibility = 'public' AND 
        status = 'published' AND 
        auth.uid() IS NOT NULL
    );

-- Team designs visible to team members
CREATE POLICY designs_team_select ON designs
    FOR SELECT USING (
        visibility = 'team' AND 
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );

-- Collaborators can view and edit based on permissions
CREATE POLICY designs_collaborators ON designs
    FOR SELECT USING (
        id IN (
            SELECT design_id FROM design_collaborations 
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );

-- =========================================================
-- DESIGN VERSIONS POLICIES
-- =========================================================

CREATE POLICY design_versions_via_design ON design_versions
    FOR SELECT USING (
        design_id IN (
            SELECT id FROM designs 
            WHERE (
                owner_id = auth.uid() OR
                visibility = 'public' OR
                (visibility = 'team' AND team_id IN (
                    SELECT team_id FROM team_members 
                    WHERE user_id = auth.uid() AND is_active = TRUE
                ))
            )
        )
    );

-- =========================================================
-- DESIGN COMMENTS POLICIES  
-- =========================================================

-- View comments on accessible designs
CREATE POLICY design_comments_select ON design_comments
    FOR SELECT USING (
        design_id IN (
            SELECT id FROM designs 
            WHERE (
                owner_id = auth.uid() OR
                visibility = 'public' OR
                (visibility = 'team' AND team_id IN (
                    SELECT team_id FROM team_members 
                    WHERE user_id = auth.uid() AND is_active = TRUE
                )) OR
                id IN (
                    SELECT design_id FROM design_collaborations 
                    WHERE user_id = auth.uid() AND is_active = TRUE
                )
            )
        )
    );

-- Create comments on accessible designs
CREATE POLICY design_comments_insert ON design_comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        design_id IN (
            SELECT id FROM designs 
            WHERE (
                owner_id = auth.uid() OR
                (visibility = 'team' AND team_id IN (
                    SELECT team_id FROM team_members 
                    WHERE user_id = auth.uid() AND is_active = TRUE
                )) OR
                id IN (
                    SELECT design_id FROM design_collaborations 
                    WHERE user_id = auth.uid() AND is_active = TRUE AND 
                    (role = 'commenter' OR role = 'editor' OR role = 'admin')
                )
            )
        )
    );

-- Users can update/delete their own comments
CREATE POLICY design_comments_own ON design_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY design_comments_delete_own ON design_comments
    FOR DELETE USING (auth.uid() = user_id);

-- =========================================================
-- DESIGN LIKES POLICIES
-- =========================================================

CREATE POLICY design_likes_own ON design_likes
    FOR ALL USING (auth.uid() = user_id);

-- =========================================================
-- DESIGN COLLABORATIONS POLICIES
-- =========================================================

-- Design owners can manage collaborations
CREATE POLICY design_collaborations_owner ON design_collaborations
    FOR ALL USING (
        design_id IN (
            SELECT id FROM designs WHERE owner_id = auth.uid()
        )
    );

-- Collaborators can view their collaborations
CREATE POLICY design_collaborations_own ON design_collaborations
    FOR SELECT USING (auth.uid() = user_id);

-- =========================================================
-- AI GENERATIONS POLICIES
-- =========================================================

-- Users can manage their own AI generations
CREATE POLICY ai_generations_own ON ai_generations
    FOR ALL USING (auth.uid() = user_id);

-- =========================================================
-- ORDERS POLICIES
-- =========================================================

-- Users can manage their own orders
CREATE POLICY orders_own ON orders
    FOR ALL USING (auth.uid() = user_id);

-- =========================================================
-- FUNCTIONS FOR AUTOMATIC UPDATES
-- =========================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at 
    BEFORE UPDATE ON teams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_designs_updated_at 
    BEFORE UPDATE ON designs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_design_comments_updated_at 
    BEFORE UPDATE ON design_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at 
    BEFORE UPDATE ON user_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- HELPFUL FUNCTIONS
-- =========================================================

-- Function to generate design slug from title
CREATE OR REPLACE FUNCTION generate_design_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Function to increment tag usage count
CREATE OR REPLACE FUNCTION increment_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE design_tags SET usage_count = usage_count + 1 
    WHERE id = NEW.tag_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_tag_usage_trigger
    AFTER INSERT ON design_tag_relationships
    FOR EACH ROW EXECUTE FUNCTION increment_tag_usage();

-- Function to decrement tag usage count
CREATE OR REPLACE FUNCTION decrement_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE design_tags SET usage_count = GREATEST(usage_count - 1, 0) 
    WHERE id = OLD.tag_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decrement_tag_usage_trigger
    AFTER DELETE ON design_tag_relationships
    FOR EACH ROW EXECUTE FUNCTION decrement_tag_usage();

-- Function to update design metrics
CREATE OR REPLACE FUNCTION update_design_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'design_likes' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE designs SET like_count = like_count + 1 WHERE id = NEW.design_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE designs SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.design_id;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_design_like_count_trigger
    AFTER INSERT OR DELETE ON design_likes
    FOR EACH ROW EXECUTE FUNCTION update_design_metrics();

-- =========================================================
-- INITIAL DATA
-- =========================================================

-- Insert default design categories
INSERT INTO design_categories (name, slug, description, sort_order) VALUES
('T-Shirts', 't-shirts', 'T-shirt designs and mockups', 1),
('Posters', 'posters', 'Poster and print designs', 2),
('Logos', 'logos', 'Logo designs and branding', 3),
('Social Media', 'social-media', 'Social media graphics and posts', 4),
('Business Cards', 'business-cards', 'Business card designs', 5),
('Stickers', 'stickers', 'Sticker designs and decals', 6);

-- Insert default style presets
INSERT INTO style_presets (name, description, category, parameters, is_system_preset) VALUES
('Minimalist', 'Clean and minimal design style', 'general', '{"style": "minimalist", "colors": ["#ffffff", "#000000"], "typography": "clean"}', true),
('Vintage', 'Retro and vintage aesthetic', 'general', '{"style": "vintage", "colors": ["#8B4513", "#F4A460"], "filters": ["sepia", "grain"]}', true),
('Modern', 'Contemporary and sleek design', 'general', '{"style": "modern", "colors": ["#FF6B35", "#004E98"], "typography": "bold"}', true),
('Artistic', 'Creative and artistic style', 'general', '{"style": "artistic", "effects": ["painterly", "abstract"], "colors": ["#FF006E", "#8338EC"]}', true);

-- Insert default AI models
INSERT INTO ai_models (name, provider, model_id, type, cost_per_generation, is_active) VALUES
('DALL-E 3', 'openai', 'dall-e-3', 'text-to-image', 0.0400, true),
('Stable Diffusion XL', 'stability', 'stable-diffusion-xl-1024-v1-0', 'text-to-image', 0.0200, true),
('Stable Diffusion Inpainting', 'stability', 'stable-inpainting-v1-0', 'image-to-image', 0.0300, true);