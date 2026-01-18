// Vantedge Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const authSection = document.getElementById('authSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const loginForm = document.getElementById('loginForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const refreshOpps = document.getElementById('refreshOpps');
  const syncNow = document.getElementById('syncNow');
  const userEmail = document.getElementById('userEmail');
  const opportunitiesList = document.getElementById('opportunitiesList');
  const syncStatus = document.getElementById('syncStatus');
  
  // Check auth status
  async function checkAuth() {
    const response = await chrome.runtime.sendMessage({ type: 'AUTH_CHECK' });
    
    if (response.authenticated) {
      showDashboard();
      loadUserData();
      loadOpportunities();
      loadSyncStatus();
    } else {
      showAuth();
    }
  }
  
  function showAuth() {
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
  }
  
  function showDashboard() {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
  }
  
  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'LOGIN',
        payload: { email, password },
      });
      
      if (response.success) {
        userEmail.textContent = email;
        showDashboard();
        loadOpportunities();
        loadSyncStatus();
      } else {
        alert(response.error || 'Login failed');
      }
    } catch (error) {
      alert('Login error: ' + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
  
  // Logout
  logoutBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    showAuth();
  });
  
  // Settings
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Load user data
  async function loadUserData() {
    const stored = await chrome.storage.local.get(['userEmail', 'stats']);
    if (stored.userEmail) {
      userEmail.textContent = stored.userEmail;
    }
    
    // Update stats (would come from API in production)
    document.getElementById('statProfit').textContent = formatCurrency(stored.stats?.profit || 0);
    document.getElementById('statBets').textContent = stored.stats?.total_bets || 0;
    document.getElementById('statWinRate').textContent = (stored.stats?.win_rate || 0).toFixed(1) + '%';
  }
  
  // Load opportunities
  async function loadOpportunities() {
    opportunitiesList.innerHTML = '<div class="loading">Loading...</div>';
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_OPPORTUNITIES',
        payload: { minEdge: 3, limit: 5 },
      });
      
      if (response.opportunities && response.opportunities.length > 0) {
        opportunitiesList.innerHTML = response.opportunities.map(opp => `
          <div class="opportunity-item">
            <div class="opp-header">
              <span class="opp-match">${opp.match_name}</span>
              <span class="opp-edge ${getEdgeClass(opp.edge_percent)}">+${opp.edge_percent.toFixed(1)}%</span>
            </div>
            <div class="opp-details">
              <span>${opp.market} • ${opp.selection}</span>
              <span class="opp-odds">${opp.soft_bookmaker} @ ${opp.soft_odds}</span>
            </div>
            ${opp.bet_link ? `<a href="${opp.bet_link}" target="_blank" class="opp-link">Bet Now →</a>` : ''}
          </div>
        `).join('');
      } else {
        opportunitiesList.innerHTML = `
          <div class="empty-state">
            <p>No active opportunities</p>
            <p class="text-muted">Check back soon!</p>
          </div>
        `;
      }
    } catch (error) {
      opportunitiesList.innerHTML = `
        <div class="error-state">
          <p>Failed to load opportunities</p>
        </div>
      `;
    }
  }
  
  // Refresh opportunities
  refreshOpps.addEventListener('click', () => {
    refreshOpps.classList.add('spinning');
    loadOpportunities().finally(() => {
      refreshOpps.classList.remove('spinning');
    });
  });
  
  // Sync now
  syncNow.addEventListener('click', async () => {
    syncNow.disabled = true;
    syncNow.textContent = 'Syncing...';
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
      if (response.success) {
        syncStatus.textContent = `Synced ${response.synced} bets just now`;
      } else {
        syncStatus.textContent = response.error || 'Sync failed';
      }
    } catch (error) {
      syncStatus.textContent = 'Sync error';
    } finally {
      syncNow.disabled = false;
      syncNow.textContent = 'Sync Now';
    }
  });
  
  // Load sync status
  async function loadSyncStatus() {
    const { lastSync } = await chrome.storage.local.get('lastSync');
    if (lastSync) {
      const date = new Date(lastSync);
      syncStatus.textContent = `Last sync: ${formatRelativeTime(date)}`;
    } else {
      syncStatus.textContent = 'Last sync: Never';
    }
  }
  
  // Helpers
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  }
  
  function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  }
  
  function getEdgeClass(edge) {
    if (edge >= 10) return 'edge-high';
    if (edge >= 5) return 'edge-medium';
    return 'edge-low';
  }
  
  // Initialize
  checkAuth();
});
