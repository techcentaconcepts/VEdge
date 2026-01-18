// Vantedge - Bet9ja Content Script
// Extracts bet data and odds from bet9ja.com

(function() {
  'use strict';
  
  const BOOKMAKER = 'bet9ja';
  
  console.log('[Vantedge] Bet9ja content script loaded');
  
  // Debounce utility
  function debounce(fn, ms) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), ms);
    };
  }
  
  // Extract match info from event element
  function extractMatch(eventEl) {
    try {
      const teams = eventEl.querySelectorAll('.event-name span, .team-name');
      const homeTeam = teams[0]?.textContent?.trim() || '';
      const awayTeam = teams[1]?.textContent?.trim() || '';
      
      const league = eventEl.querySelector('.league-name, .competition-name')?.textContent?.trim() || '';
      const sport = eventEl.closest('[data-sport]')?.dataset?.sport || 'football';
      
      return {
        match_name: `${homeTeam} vs ${awayTeam}`,
        home_team: homeTeam,
        away_team: awayTeam,
        league,
        sport,
      };
    } catch (e) {
      console.error('[Vantedge] Error extracting match:', e);
      return null;
    }
  }
  
  // Extract odds from the page
  function extractOdds(oddsEl) {
    try {
      const oddsText = oddsEl.textContent?.trim();
      return parseFloat(oddsText) || null;
    } catch (e) {
      return null;
    }
  }
  
  // Extract selection name from bet slip
  function extractSelection(selectionEl) {
    try {
      const market = selectionEl.querySelector('.market-name, .bet-type')?.textContent?.trim() || '';
      const selection = selectionEl.querySelector('.selection-name, .bet-pick')?.textContent?.trim() || '';
      return { market, selection };
    } catch (e) {
      return { market: '', selection: '' };
    }
  }
  
  // Extract bet from bet slip
  function extractBetFromSlip() {
    try {
      const betslip = document.querySelector('.betslip, #betslip, .coupon-container');
      if (!betslip) return [];
      
      const bets = [];
      const selections = betslip.querySelectorAll('.selection, .bet-item, .coupon-item');
      
      selections.forEach(sel => {
        const matchInfo = extractMatch(sel);
        const { market, selection } = extractSelection(sel);
        const odds = extractOdds(sel.querySelector('.odds, .odd-value'));
        
        if (matchInfo && odds) {
          bets.push({
            ...matchInfo,
            market,
            selection,
            odds,
            bookmaker: BOOKMAKER,
            external_bet_id: `${BOOKMAKER}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          });
        }
      });
      
      return bets;
    } catch (e) {
      console.error('[Vantedge] Error extracting betslip:', e);
      return [];
    }
  }
  
  // Extract stake amount
  function extractStake() {
    try {
      const stakeInput = document.querySelector('.stake-input, input[name="stake"], #stake');
      return parseFloat(stakeInput?.value) || 0;
    } catch (e) {
      return 0;
    }
  }
  
  // Watch for bet placement
  function watchBetPlacement() {
    // Method 1: Watch for submit button clicks
    document.addEventListener('click', (e) => {
      const target = e.target;
      const isBetButton = 
        target.matches('.place-bet, .submit-bet, .bet-now, [data-action="place-bet"]') ||
        target.closest('.place-bet, .submit-bet, .bet-now');
      
      if (isBetButton) {
        const bets = extractBetFromSlip();
        const stake = extractStake();
        
        if (bets.length > 0 && stake > 0) {
          const betData = bets.map(bet => ({
            ...bet,
            stake,
            currency: 'NGN',
            placed_at: new Date().toISOString(),
            synced_from: 'extension',
          }));
          
          // Send to background script
          chrome.runtime.sendMessage({
            type: 'BETS_SCRAPED',
            payload: betData,
          }).then(response => {
            console.log('[Vantedge] Bets sent for sync:', response);
          }).catch(err => {
            console.error('[Vantedge] Error sending bets:', err);
          });
        }
      }
    }, true);
    
    // Method 2: Watch for network requests (bet confirmations)
    // This is more reliable but requires intercepting fetch/XHR
  }
  
  // Extract bet history from My Bets page
  function extractBetHistory() {
    try {
      const historyContainer = document.querySelector('.bet-history, .my-bets, #bet-history');
      if (!historyContainer) return [];
      
      const bets = [];
      const betRows = historyContainer.querySelectorAll('.bet-row, .history-item, tr[data-bet-id]');
      
      betRows.forEach(row => {
        const betId = row.dataset?.betId || row.querySelector('[data-bet-id]')?.dataset?.betId;
        const matchName = row.querySelector('.match-name, .event-name')?.textContent?.trim();
        const market = row.querySelector('.market')?.textContent?.trim();
        const selection = row.querySelector('.selection')?.textContent?.trim();
        const odds = parseFloat(row.querySelector('.odds')?.textContent?.trim());
        const stake = parseFloat(row.querySelector('.stake')?.textContent?.replace(/[^\d.]/g, ''));
        const outcome = row.querySelector('.status, .result')?.textContent?.toLowerCase()?.trim();
        const profitLoss = parseFloat(row.querySelector('.profit, .winnings')?.textContent?.replace(/[^\d.-]/g, ''));
        
        if (betId && matchName) {
          bets.push({
            external_bet_id: `${BOOKMAKER}-${betId}`,
            bookmaker: BOOKMAKER,
            match_name: matchName,
            market: market || '',
            selection: selection || '',
            odds: odds || 0,
            stake: stake || 0,
            currency: 'NGN',
            outcome: normalizeOutcome(outcome),
            profit_loss: profitLoss || null,
            synced_from: 'extension',
          });
        }
      });
      
      return bets;
    } catch (e) {
      console.error('[Vantedge] Error extracting bet history:', e);
      return [];
    }
  }
  
  // Normalize outcome status
  function normalizeOutcome(outcome) {
    if (!outcome) return 'pending';
    const lower = outcome.toLowerCase();
    if (lower.includes('won') || lower.includes('win')) return 'won';
    if (lower.includes('lost') || lower.includes('lose')) return 'lost';
    if (lower.includes('void') || lower.includes('cancel')) return 'void';
    if (lower.includes('cash')) return 'cashout';
    return 'pending';
  }
  
  // Sync bet history when on My Bets page
  const syncBetHistory = debounce(() => {
    if (window.location.pathname.includes('/my-bets') || 
        window.location.pathname.includes('/bet-history')) {
      const bets = extractBetHistory();
      if (bets.length > 0) {
        chrome.runtime.sendMessage({
          type: 'BETS_SCRAPED',
          payload: bets,
        }).then(response => {
          console.log('[Vantedge] Bet history synced:', response);
        });
      }
    }
  }, 2000);
  
  // Initialize
  function init() {
    watchBetPlacement();
    
    // Watch for page changes (SPA navigation)
    const observer = new MutationObserver(debounce(() => {
      syncBetHistory();
    }, 1000));
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    // Initial check
    syncBetHistory();
    
    console.log('[Vantedge] Bet9ja integration ready');
  }
  
  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
