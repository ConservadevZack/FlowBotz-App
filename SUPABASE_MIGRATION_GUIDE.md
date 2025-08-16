# FlowBotz Supabase Database Migration Guide

## ⚠️ CRITICAL: Database Schema Missing

**Analysis Results**: 
- Expected tables: 23
- Existing tables: 3 (only basic auth-related tables)
- Missing tables: 20+ core FlowBotz tables
- **Status**: Database migration is REQUIRED for FlowBotz functionality

## 🚨 Migration Required Immediately

The database analysis reveals that most FlowBotz tables are missing from the Supabase database. This explains why the orchestrator identified only 3 of 21 required tables existing.

## 📋 Migration Steps (Manual Execution Required)

### Step 1: Access Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/vpfphtrjvomejsxjmxut
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query

### Step 2: Execute Core Schema Migration

**File**: `project-vault/supabase_migration_001_core_schema.sql`

Copy the entire contents of this file and execute it in the SQL Editor. This will create:

- **User Management**: `users`, `user_preferences`, `user_sessions`, `user_stats`, `teams`, `team_members`
- **Design System**: `designs`, `design_categories`, `design_tags`, `design_versions`, `design_comments`, `design_likes`, `design_collaborations`
- **AI Generation**: `ai_models`, `ai_generations`, `style_presets`, `generation_cache`
- **Analytics**: `events`, `page_views`, `user_journeys`
- **E-commerce**: `products`, `orders`

### Step 3: Execute Indexes and Security Migration

**File**: `project-vault/supabase_migration_002_indexes_and_rls.sql`

Copy and execute this file to add:

- Performance indexes for all tables
- Row Level Security (RLS) policies
- Database triggers and functions
- Initial seed data

### Step 4: Verify Migration Success

Run this verification script to confirm all tables exist:

```bash
node check_supabase_tables.js
```

Expected output: "🎉 All tables exist! Database schema is complete."

## 🔧 Migration File Contents Summary

### Core Schema (001_core_schema.sql)
- **Extensions**: UUID generation, encryption
- **User System**: Complete user management with preferences, sessions, stats
- **Team Collaboration**: Teams, members, permissions
- **Design Management**: Full design lifecycle with versioning, comments, likes
- **AI Integration**: Models, generations with partitioned storage
- **Analytics**: Event tracking with partitioned tables
- **E-commerce**: Products and order management

### Indexes & Security (002_indexes_and_rls.sql)
- **Performance Indexes**: 50+ indexes for optimal query performance
- **Row Level Security**: Comprehensive policies for data protection
- **Database Functions**: Automatic timestamp updates, metric calculations
- **Seed Data**: Default categories, AI models, style presets

## 🎯 Expected Results After Migration

### Database Tables (23 total)
1. `users` - User accounts and profiles
2. `user_preferences` - UI and app preferences
3. `user_sessions` - Session management
4. `user_stats` - User activity statistics
5. `teams` - Team/workspace management
6. `team_members` - Team membership
7. `designs` - Main design storage
8. `design_categories` - Design categorization
9. `design_tags` - Tagging system
10. `design_tag_relationships` - Tag associations
11. `design_versions` - Version control
12. `design_comments` - Collaboration comments
13. `design_likes` - User engagement
14. `design_collaborations` - Sharing permissions
15. `ai_models` - Available AI models
16. `ai_generations` - AI generation history
17. `style_presets` - Design style templates
18. `generation_cache` - AI response caching
19. `events` - Analytics event tracking
20. `page_views` - Page view analytics
21. `user_journeys` - User behavior tracking
22. `products` - POD product catalog
23. `orders` - Order management

### Essential Data Populated
- **AI Models**: DALL-E 3, Stable Diffusion XL, Inpainting models
- **Design Categories**: T-Shirts, Posters, Logos, Social Media, Business Cards, Stickers
- **Style Presets**: Minimalist, Vintage, Modern, Artistic styles

## 🔐 Security Features

### Row Level Security (RLS)
- Users can only access their own data
- Public designs visible to authenticated users
- Team designs accessible to team members
- Collaboration-based permissions

### Performance Optimization
- Partitioned tables for high-volume data (events, AI generations)
- Strategic indexes for common query patterns
- Automatic timestamp updates
- Metric calculation triggers

## 🧪 Verification Commands

After migration, run these tests:

```bash
# Check table existence
node check_supabase_tables.js

# Verify schema structure
node verify_schema_structure.js

# Test CRUD operations
node simple_migration_check.js
```

## 🚨 Troubleshooting

### If Migration Fails

1. **Permission Error**: Ensure you're using the service role key
2. **Syntax Error**: Copy-paste issues - re-copy the SQL files
3. **Partial Success**: Some commands may fail if tables already exist (this is OK)
4. **RLS Issues**: Policies may need manual adjustment

### Common Issues

- **"Table already exists"**: Safe to ignore - indicates partial previous migration
- **"Permission denied"**: Check RLS policies are correctly applied
- **"Function does not exist"**: Run the indexes migration (002) after core migration (001)

## 📊 Impact on FlowBotz Application

### Before Migration (Current State)
- ❌ AI generation fails (no ai_models table)
- ❌ Design saving broken (no designs table)
- ❌ User preferences lost (no user_preferences table)
- ❌ Analytics not working (no events table)
- ❌ Product catalog empty (no products table)

### After Migration (Expected State)
- ✅ AI generation fully functional
- ✅ Design creation and management
- ✅ User preferences and settings
- ✅ Complete analytics tracking
- ✅ POD product catalog ready
- ✅ Team collaboration features
- ✅ Order management system

## 🎯 Next Steps After Migration

1. **Verify Tables**: Run verification scripts
2. **Test API Endpoints**: Ensure backend can access all tables
3. **Populate Products**: Add POD product catalog via API
4. **Test AI Generation**: Verify AI models are accessible
5. **Update Middleware**: Confirm database service integration works

## 📞 Support

If migration fails or issues persist:
1. Check Supabase logs in the dashboard
2. Verify service role key permissions
3. Review RLS policies for access issues
4. Test individual table creation manually

---

**⚡ URGENT**: This migration must be completed before FlowBotz can function properly. The current database state is insufficient for any core application features.