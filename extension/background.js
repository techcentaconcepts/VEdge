// Vantedge Background Service Worker
// Handles auth state, bet syncing, and communication with content scripts

// Load configuration
importScripts('config.js');

// State
let authToken = null;
let userId = null;
let syncQueue = [];

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Vantedge] Extension installed:', details.reason);
  
  // Set default settings with values from config
  await chrome.storage.local.set({
    settings: {
      autoSync: CONFIG.AUTO_SYNC,
      showOverlay: CONFIG.SHOW_OVERLAY,
      syncInterval: CONFIG.SYNC_INTERVAL_MINUTES * 60, // convert to seconds
    },
    syncQueue: [],
    lastSync: null,
    // API configuration from config.js
    apiUrl: CONFIG.API_URL,
    supabaseUrl: CONFIG.SUPABASE_URL,
    supabaseAnonKey: CONFIG.SUPABASE_ANON_KEY,
  });
  
  // Set up sync alarm
  chrome.alarms.create('syncBets', { periodInMinutes: CONFIG.SYNC_INTERVAL_MINUTES });
});

// Listen for alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'syncBets') {
    await processSyncQueue();
  }
});

// Message handler from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(err => sendResponse({ error: err.message }));
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'AUTH_CHECK':
      return { authenticated: !!authToken, userId };
      
    case 'LOGIN':
      return await handleLogin(message.payload);
      
    case 'LOGOUT':
      return await handleLogout();
      
    case 'BET_PLACED':
      return await queueBetForSync(message.payload, sender.tab?.url);
      
    case 'BETS_SCRAPED':
      return await queueBetsForSync(message.payload, sender.tab?.url);
      
    case 'GET_SETTINGS':
      return await getSettings();
      
    case 'UPDATE_SETTINGS':
      return await updateSettings(message.payload);
      
    case 'GET_OPPORTUNITIES':
      return await fetchOpportunities(message.payload);
      
    case 'SYNC_NOW':
      return await processSyncQueue();
      
    default:
      console.warn('[Vantedge] Unknown message type:', message.type);
      return { error: 'Unknown message type' };
  }
}

// Authentication
async function handleLogin({ email, password }) {
  try {
    // Load Supabase config
    const config = await chrome.storage.local.get(['supabaseUrl', 'supabaseAnonKey']);
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error('Supabase config not set. Please update extension settings.');
    }
    
    // Sign in with Supabase
    const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.supabaseAnonKey,
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Invalid credentials');
    }
    
    const data = await response.json();
    authToken = data.access_token;
    userId = data.user.id;
    
    await chrome.storage.local.set({ 
      authToken, 
      userId,
      userEmail: email,
      refreshToken: data.refresh_token,
    });
    
    return { success: true, user: data.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleLogout() {
  authToken = null;
  userId = null;
  await chrome.storage.local.remove(['authToken', 'userId', 'userEmail']);
  return { success: true };
}

// Load auth on startup
async function loadAuth() {
  const stored = await chrome.storage.local.get(['authToken', 'userId']);
  authToken = stored.authToken || null;
  userId = stored.userId || null;
}
loadAuth();

// Bet Syncing
async function queueBetForSync(bet, sourceUrl) {
  const { syncQueue = [] } = await chrome.storage.local.get('syncQueue');
  
  const enrichedBet = {
    ...bet,
    queued_at: new Date().toISOString(),
    source_url: sourceUrl,
    synced: false,
  };
  
  syncQueue.push(enrichedBet);
  await chrome.storage.local.set({ syncQueue });
  
  console.log('[Vantedge] Bet queued for sync:', bet.match_name);
  return { success: true, queued: true };
}

async function queueBetsForSync(bets, sourceUrl) {
  const { syncQueue = [] } = await chrome.storage.local.get('syncQueue');
  
  const enrichedBets = bets.map(bet => ({
    ...bet,
    queued_at: new Date().toISOString(),
    source_url: sourceUrl,
    synced: false,
  }));
  
  syncQueue.push(...enrichedBets);
  await chrome.storage.local.set({ syncQueue });
  
  console.log(`[Vantedge] ${bets.length} bets queued for sync`);
  return { success: true, queued: bets.length };
}

async function processSyncQueue() {
  if (!authToken) {
    console.log('[Vantedge] Not authenticated, skipping sync');
    return { success: false, error: 'Not authenticated' };
  }
  
  const { syncQueue = [] } = await chrome.storage.local.get('syncQueue');
  const unsynced = syncQueue.filter(b => !b.synced);
  
  if (unsynced.length === 0) {
    return { success: true, synced: 0 };
  }
  
  try {
    // Get API URL from config
    const { apiUrl = 'http://localhost:3000/api' } = await chrome.storage.local.get('apiUrl');
    
    const response = await fetch(`${apiUrl}/bets/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ bets: unsynced }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Sync failed');
    }
    
    const result = await response.json();
    
    // Mark synced bets - response includes created and updated arrays
    const syncedIds = new Set([
      ...(result.created || []).map(b => b.external_bet_id),
      ...(result.updated || []).map(b => b.external_bet_id),
    ]);
    
    const updatedQueue = syncQueue.map(bet => 
      syncedIds.has(bet.external_bet_id) ? { ...bet, synced: true } : bet
    );
    
    // Keep only last 100 synced bets, remove older ones
    const recentSynced = updatedQueue.filter(b => b.synced).slice(-100);
    const pendingSync = updatedQueue.filter(b => !b.synced);
    
    await chrome.storage.local.set({ 
      syncQueue: [...pendingSync, ...recentSynced],
      lastSync: new Date().toISOString(),
    });
    
    console.log(`[Vantedge] Synced ${syncedIds.size} bets (${result.created?.length || 0} created, ${result.updated?.length || 0} updated)`);
    return { success: true, synced: syncedIds.size, created: result.created?.length, updated: result.updated?.length };
  } catch (error) {
    console.error('[Vantedge] Sync error:', error);
    return { success: false, error: error.message };
  }
}

// Settings
async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return settings || {
    autoSync: true,
    showOverlay: true,
    syncInterval: 30,
  };
}

async function updateSettings(newSettings) {
  const { settings } = await chrome.storage.local.get('settings');
  const updated = { ...settings, ...newSettings };
  await chrome.storage.local.set({ settings: updated });
  return { success: true, settings: updated };
}

// Opportunities
async function fetchOpportunities({ minEdge = 3, limit = 10 }) {
  try {
    const params = new URLSearchParams({ min_edge: minEdge, limit });
    const response = await fetch(`${VANTEDGE_API}/opportunities?${params}`, {
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch opportunities');
    }
    
    return await response.json();
  } catch (error) {
    console.error('[Vantedge] Opportunities fetch error:', error);
    return { opportunities: [], error: error.message };
  }
}
