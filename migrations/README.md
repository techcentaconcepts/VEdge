# Vantedge Database Migration Scripts

Run these scripts **in order** in the Supabase SQL Editor.

## Migration Order

| Script | Description |
|--------|-------------|
| `01_extensions.sql` | Enable required PostgreSQL extensions |
| `02_tables.sql` | Create all database tables |
| `03_indexes.sql` | Create performance indexes |
| `04_functions.sql` | Create core database functions |
| `05_admin_functions.sql` | Create admin-specific functions |
| `06_triggers.sql` | Create database triggers |
| `07_rls_policies.sql` | Enable RLS and create security policies |
| `08_default_data.sql` | Insert default payment gateways, plans, settings |
| `09_cron_job.sql` | Setup scheduled odds scraping (configure first!) |

## Instructions

1. **Create a new Supabase project** at https://supabase.com

2. **Run each script sequentially** in the SQL Editor:
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste each script content
   - Click "Run" and wait for success
   - Move to the next script

3. **Before running `09_cron_job.sql`**:
   - Replace `YOUR_NEW_PROJECT_ID` with your project ID (found in project URL)
   - Replace `YOUR_SERVICE_ROLE_KEY` with your service role key (Settings > API)
   - Deploy the `scrape-odds` Edge Function first

4. **After all migrations complete**:
   - Update `.env.local` with new Supabase URL and anon key
   - Update Railway bridge environment variables
   - Create an admin user:
     ```sql
     INSERT INTO admin_users (user_id, role) 
     VALUES ('YOUR_USER_UUID', 'super_admin');
     ```

## Troubleshooting

**If a script fails:**
- Read the error message carefully
- The script name and line number will help identify the issue
- Fix the issue and re-run just that script
- Continue with the next script

**Common issues:**
- Extensions not enabled: Run `01_extensions.sql` first
- Table doesn't exist: Make sure you ran `02_tables.sql`
- Function doesn't exist: Make sure you ran `04_functions.sql`
- Type doesn't exist: The table for that type wasn't created yet
