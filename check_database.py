#!/usr/bin/env python3

import os
import sys
import asyncio
import asyncpg

async def check_database():
    """Check current database state and list existing tables"""
    
    # Database connection string for Supabase
    database_url = "postgresql://postgres.vpfphtrjvomejsxjmxut:password123!@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        
        # Query for existing tables
        query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
        """
        
        rows = await conn.fetch(query)
        tables = [row['table_name'] for row in rows]
        
        print("🔍 Current Supabase Database Analysis")
        print("=" * 50)
        print(f"Total tables found: {len(tables)}")
        print("\nExisting tables:")
        for table in tables:
            print(f"  ✅ {table}")
        
        # Expected tables from our schema
        expected_tables = [
            'users', 'user_preferences', 'user_sessions', 'user_stats',
            'teams', 'team_members', 'designs', 'design_categories', 
            'design_tags', 'design_tag_relationships', 'design_versions',
            'design_comments', 'design_likes', 'design_collaborations',
            'ai_models', 'ai_generations', 'style_presets', 'generation_cache',
            'events', 'page_views', 'user_journeys', 'products', 'orders'
        ]
        
        missing_tables = [table for table in expected_tables if table not in tables]
        
        print(f"\n📊 Schema Analysis:")
        print(f"Expected tables: {len(expected_tables)}")
        print(f"Existing tables: {len(tables)}")
        print(f"Missing tables: {len(missing_tables)}")
        
        if missing_tables:
            print("\n❌ Missing tables:")
            for table in missing_tables:
                print(f"  - {table}")
        else:
            print("\n✅ All tables exist!")
        
        # Check a few key tables for structure
        if 'users' in tables:
            columns = await conn.fetch("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'users' AND table_schema = 'public'
                ORDER BY ordinal_position;
            """)
            
            print(f"\n🔧 Users table structure ({len(columns)} columns):")
            for col in columns[:5]:  # Show first 5 columns
                print(f"  - {col['column_name']}: {col['data_type']} {'NULL' if col['is_nullable'] == 'YES' else 'NOT NULL'}")
            if len(columns) > 5:
                print(f"  ... and {len(columns) - 5} more columns")
        
        await conn.close()
        return len(tables), missing_tables
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        print("\nTrying alternative connection method...")
        
        # Try with different credentials
        try:
            # Use service role key for direct connection
            alt_url = "postgresql://postgres:password123!@db.vpfphtrjvomejsxjmxut.supabase.co:5432/postgres"
            conn = await asyncpg.connect(alt_url)
            
            query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
            rows = await conn.fetch(query)
            tables = [row['table_name'] for row in rows]
            
            print(f"✅ Alternative connection successful!")
            print(f"Found {len(tables)} tables via direct connection")
            
            await conn.close()
            return len(tables), []
            
        except Exception as e2:
            print(f"❌ Alternative connection also failed: {e2}")
            return 0, []

if __name__ == "__main__":
    result = asyncio.run(check_database())
    print(f"\nDatabase check completed. Found {result[0]} tables.")