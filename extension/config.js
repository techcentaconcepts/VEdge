// Vantedge Extension Configuration
// Update these values before building the extension

const CONFIG = {
  // API Endpoints
  API_URL: 'http://localhost:3000/api', // Change to production URL: https://vantedge.io/api
  
  // Supabase Configuration
  // Get these from your .env.local file or Supabase dashboard
  SUPABASE_URL: 'YOUR_SUPABASE_URL', // e.g., https://xxxxx.supabase.co
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY', // Public anon key
  
  // Sync Settings
  SYNC_INTERVAL_MINUTES: 1, // How often to sync bets
  MAX_QUEUE_SIZE: 100, // Maximum number of synced bets to keep in storage
  
  // Feature Flags
  AUTO_SYNC: true,
  SHOW_OVERLAY: true,
  DEBUG_MODE: true, // Set to false in production
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
