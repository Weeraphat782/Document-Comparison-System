# Environment Setup

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration (Required - Use SAME project as Export Tracker)
NEXT_PUBLIC_SUPABASE_URL=https://your-export-tracker-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_export_tracker_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_export_tracker_service_role_key

# Export Tracker API Configuration (Required)
NEXT_PUBLIC_EXPORT_TRACKER_API_URL=https://exportation-tracker.vercel.app
```

## Getting Supabase Credentials

**⚠️ IMPORTANT: Use the SAME Supabase project as Export Tracker**

1. **DO NOT create a new Supabase project**
2. Use the existing Supabase project that Export Tracker uses
3. Go to Settings > API in your existing Supabase project
4. Copy the following values:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY`

## Database Setup

Run the SQL migration file to set up the database schema:

### Step 1: Run the Migration
```sql
-- Execute the contents of migrations/create_document_comparison_tables.sql
-- in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
--
-- This creates the analysis_sessions table with foreign key to auth.users(id)
-- No profiles table needed - uses auth.users directly
```

### Step 2: Verify the Migration
Run these queries to verify the table was created correctly:

```sql
-- Check if table exists
SELECT * FROM information_schema.tables WHERE table_name = 'analysis_sessions';

-- Check foreign key constraints
SELECT * FROM information_schema.table_constraints WHERE table_name = 'analysis_sessions';

-- Check RLS policies
SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'analysis_sessions';

-- Check permissions
SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'analysis_sessions';
```

## Testing the Setup

1. Start the development server: `npm run dev`
2. Visit `http://localhost:3000`
3. Try registering a new account
4. Verify that rules are created automatically
5. Test document comparison functionality

## Troubleshooting

### Authentication Issues
- Verify Supabase credentials are correct
- Check that database schema is properly set up
- Ensure RLS policies are enabled

### API Connection Issues
- Verify `NEXT_PUBLIC_EXPORT_TRACKER_API_URL` is accessible
- Check that Export Tracker backend is running
- Test API endpoints manually with tools like Postman

### Database Issues
- Run the migration SQL again
- Check Supabase dashboard for any errors
- Verify table creation and permissions
