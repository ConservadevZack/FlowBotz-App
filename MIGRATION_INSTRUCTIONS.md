# FlowBotz Database Migration Instructions

## Overview
This document provides step-by-step instructions for setting up the FlowBotz production database schema in Supabase. The migrations will create a comprehensive database structure with all necessary tables, indexes, security policies, and initial data.

## Prerequisites
- Access to the FlowBotz Supabase project dashboard
- Admin privileges on the Supabase project
- The migration files in this repository

## Migration Files
1. **supabase_migration_001_core_schema.sql** - Core database schema
2. **supabase_migration_002_indexes_and_rls.sql** - Performance indexes and Row Level Security

## Step-by-Step Instructions

### 1. Access Supabase SQL Editor
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/vpfphtrjvomejsxjmxut/sql)
2. Login with your credentials
3. Navigate to the **SQL Editor** tab

### 2. Execute Core Schema Migration
1. Open the file: `project-vault/supabase_migration_001_core_schema.sql`
2. Copy the entire contents of the file
3. In the Supabase SQL Editor:
   - Create a new query
   - Paste the SQL content
   - Click **Run** to execute
4. Wait for completion (this may take 1-2 minutes)
5. Verify no errors occurred

**What this migration creates:**
- ✅ User management and authentication tables
- ✅ Design management system with versioning
- ✅ AI generation tracking and caching
- ✅ Analytics and event tracking (partitioned tables)
- ✅ POD e-commerce tables (products, orders)
- ✅ Team collaboration features
- ✅ Initial seed data (categories, AI models, style presets)

### 3. Execute Indexes and RLS Migration
1. Open the file: `project-vault/supabase_migration_002_indexes_and_rls.sql`
2. Copy the entire contents of the file
3. In the Supabase SQL Editor:
   - Create a new query
   - Paste the SQL content
   - Click **Run** to execute
4. Wait for completion
5. Verify no errors occurred

**What this migration creates:**
- ✅ Performance indexes for all tables
- ✅ Composite indexes for common query patterns
- ✅ Row Level Security (RLS) policies
- ✅ Automated triggers and functions
- ✅ Helper functions for data management

### 4. Verify Migration Success
After both migrations are complete, run the verification script:

```bash
node verify_migration.js
```

This will check:
- ✅ All expected tables exist and are accessible
- ✅ Row Level Security is working correctly
- ✅ Basic CRUD operations function properly
- ✅ Initial seed data is present

## Expected Database Schema

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | User accounts and profiles |
| `user_preferences` | User settings and preferences |
| `user_sessions` | Active user sessions |
| `user_stats` | User activity statistics |
| `teams` | Team/organization management |
| `team_members` | Team membership relationships |

### Design Management
| Table | Purpose |
|-------|---------|
| `designs` | Main design storage |
| `design_versions` | Design version history |
| `design_categories` | Design categorization |
| `design_tags` | Tagging system |
| `design_comments` | Design feedback/comments |
| `design_likes` | Design engagement |
| `design_collaborations` | Collaborative editing |

### AI & Generation
| Table | Purpose |
|-------|---------|
| `ai_models` | Available AI models |
| `ai_generations` | AI generation requests/results |
| `style_presets` | Predefined style templates |
| `generation_cache` | Generation result caching |

### Analytics (Partitioned)
| Table | Purpose |
|-------|---------|
| `events` | User interaction events |
| `page_views` | Page visit tracking |
| `user_journeys` | User flow analysis |

### E-commerce
| Table | Purpose |
|-------|---------|
| `products` | POD product catalog |
| `orders` | Customer orders |

## Security Features

### Row Level Security (RLS)
- ✅ Users can only access their own data
- ✅ Team members can access shared team resources
- ✅ Public designs are visible to authenticated users
- ✅ Collaborators have appropriate permissions

### Performance Optimizations
- ✅ Indexes on all foreign keys
- ✅ Composite indexes for common queries
- ✅ Partitioned tables for high-volume data
- ✅ Optimized query patterns

## Initial Seed Data

### Design Categories
- T-Shirts
- Posters  
- Logos
- Social Media
- Business Cards
- Stickers

### Style Presets
- Minimalist
- Vintage
- Modern
- Artistic

### AI Models
- DALL-E 3 (OpenAI)
- Stable Diffusion XL (Stability AI)
- Stable Diffusion Inpainting (Stability AI)

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Ensure you're using the service role key
   - Check that RLS is properly configured

2. **Table Already Exists**
   - If tables exist, you may need to drop them first
   - Or run migrations on a fresh database

3. **Migration Timeout**
   - Large migrations can take time
   - Be patient and don't interrupt the process

4. **Partition Creation Errors**
   - Ensure PostgreSQL version supports partitioning
   - Check date ranges in partition definitions

### Verification Commands

After migration, you can manually verify using SQL:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public';

-- Verify seed data
SELECT name FROM design_categories;
SELECT name FROM style_presets;
SELECT name, provider FROM ai_models;
```

## Post-Migration Steps

1. **Update Application Configuration**
   - Ensure environment variables are correct
   - Test application connectivity

2. **Test Core Functionality**
   - User registration/login
   - Design creation and saving
   - AI generation requests
   - Order processing

3. **Performance Testing**
   - Monitor query performance
   - Check index usage
   - Validate partitioning

4. **Security Validation**
   - Test RLS policies
   - Verify access controls
   - Check authentication flows

## Support

If you encounter issues during migration:
1. Check the Supabase logs for detailed error messages
2. Run the verification script to identify specific problems
3. Review the migration files for any syntax errors
4. Ensure all dependencies and extensions are available

---

**Migration Status**: Ready for execution  
**Estimated Time**: 5-10 minutes  
**Database Size**: ~50MB (with indexes and initial data)  
**Production Ready**: ✅ Yes