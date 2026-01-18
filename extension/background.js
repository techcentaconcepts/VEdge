// Vantedge Background Service Worker
// Handles auth state, bet syncing, and communication with content scripts

const VANTEDGE_API = 'https://vantedge.io/api';

// State
let authToken = null;
let userId = null;
let syncQueue = [];

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Vantedge] Extension installed:', details.reason);
  
  // Set default settings
  await chrome.storage.local.set({
    settings: {
      autoSync: true,
      showOverlay: true,
      syncInterval: 30, // seconds
    },
    syncQueue: [],
    lastSync: null,
  });
  
  // Set up sync alarm
  chrome.alarms.create('syncBets', { periodInMinutes: 1 });
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
    const response = await fetch(`${VANTEDGE_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      throw new Error('Invalid credentials');
    }
    
    const data = await response.json();
    authToken = data.access_token;
    userId = data.user.id;
    
    await chrome.storage.local.set({ 
      authToken, 
      userId,
      userEmail: email,
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
    const response = await fetch(`${VANTEDGE_API}/bets/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ bets: unsynced }),
    });
    
    if (!response.ok) {
      throw new Error('Sync failed');
    }
    
    const result = await response.json();
    
    // Mark synced bets
    const syncedIds = new Set(result.synced_ids);
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
    
    console.log(`[Vantedge] Synced ${result.synced_ids.length} bets`);
    return { success: true, synced: result.synced_ids.length };
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
