// Vantedge - SportyBet Content Script
// Extracts bet data and odds from sportybet.com

(function() {
  'use strict';
  
  const BOOKMAKER = 'sportybet';
  
  console.log('[Vantedge] SportyBet content script loaded');
  
  // Debounce utility
  function debounce(fn, ms) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), ms);
    };
  }
  
  // Extract match info
  function extractMatch(eventEl) {
    try {
      const homeTeam = eventEl.querySelector('.home-team, [class*="home"]')?.textContent?.trim() || '';
      const awayTeam = eventEl.querySelector('.away-team, [class*="away"]')?.textContent?.trim() || '';
      const league = eventEl.querySelector('.league, .tournament, [class*="competition"]')?.textContent?.trim() || '';
      
      return {
        match_name: `${homeTeam} vs ${awayTeam}`,
        home_team: homeTeam,
        away_team: awayTeam,
        league,
        sport: 'football', // SportyBet is primarily football
      };
    } catch (e) {
      console.error('[Vantedge] Error extracting match:', e);
      return null;
    }
  }
  
  // Extract bet slip data
  function extractBetFromSlip() {
    try {
      // SportyBet uses React, so we need to find the right selectors
      const betslip = document.querySelector('[class*="betslip"], [class*="bet-slip"], [class*="coupon"]');
      if (!betslip) return [];
      
      const bets = [];
      const selections = betslip.querySelectorAll('[class*="selection"], [class*="bet-item"], [class*="match-item"]');
      
      selections.forEach(sel => {
        const matchText = sel.querySelector('[class*="match"], [class*="event"]')?.textContent?.trim() || '';
        const market = sel.querySelector('[class*="market"], [class*="bet-type"]')?.textContent?.trim() || '';
        const selection = sel.querySelector('[class*="pick"], [class*="outcome"]')?.textContent?.trim() || '';
        const oddsText = sel.querySelector('[class*="odds"], [class*="price"]')?.textContent?.trim() || '';
        const odds = parseFloat(oddsText.replace(/[^\d.]/g, ''));
        
        if (matchText && odds) {
          bets.push({
            match_name: matchText,
            market,
            selection,
            odds,
            bookmaker: BOOKMAKER,
            external_bet_id: `${BOOKMAKER}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sport: 'football',
            league: '',
          });
        }
      });
      
      return bets;
    } catch (e) {
      console.error('[Vantedge] Error extracting betslip:', e);
      return [];
    }
  }
  
  // Extract stake
  function extractStake() {
    try {
      const stakeInput = document.querySelector('[class*="stake"] input, input[type="number"][class*="amount"]');
      return parseFloat(stakeInput?.value) || 0;
    } catch (e) {
      return 0;
    }
  }
  
  // Watch for bet placement
  function watchBetPlacement() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      const isBetButton = 
        target.matches('[class*="place-bet"], [class*="submit"], [class*="confirm-bet"]') ||
        target.closest('[class*="place-bet"], [class*="submit"]') ||
        target.textContent?.toLowerCase()?.includes('place bet');
      
      if (isBetButton) {
        setTimeout(() => {
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
            
            chrome.runtime.sendMessage({
              type: 'BETS_SCRAPED',
              payload: betData,
            }).then(response => {
              console.log('[Vantedge] SportyBet bets sent:', response);
            }).catch(err => {
              console.error('[Vantedge] Error sending bets:', err);
            });
          }
        }, 500); // Wait for UI to update
      }
    }, true);
  }
  
  // Extract bet history
  function extractBetHistory() {
    try {
      const historyContainer = document.querySelector('[class*="history"], [class*="my-bets"], [class*="bet-record"]');
      if (!historyContainer) return [];
      
      const bets = [];
      const betItems = historyContainer.querySelectorAll('[class*="bet-card"], [class*="bet-item"], [class*="record-item"]');
      
      betItems.forEach(item => {
        const betId = item.dataset?.id || item.querySelector('[data-id]')?.dataset?.id || '';
        const matchName = item.querySelector('[class*="match"], [class*="event"]')?.textContent?.trim() || '';
        const market = item.querySelector('[class*="market"]')?.textContent?.trim() || '';
        const selection = item.querySelector('[class*="selection"], [class*="pick"]')?.textContent?.trim() || '';
        const oddsText = item.querySelector('[class*="odds"]')?.textContent?.trim() || '';
        const stakeText = item.querySelector('[class*="stake"], [class*="amount"]')?.textContent?.trim() || '';
        const statusText = item.querySelector('[class*="status"], [class*="result"]')?.textContent?.toLowerCase() || '';
        const winningsText = item.querySelector('[class*="winnings"], [class*="return"]')?.textContent?.trim() || '';
        
        const odds = parseFloat(oddsText.replace(/[^\d.]/g, ''));
        const stake = parseFloat(stakeText.replace(/[^\d.]/g, ''));
        const winnings = parseFloat(winningsText.replace(/[^\d.]/g, ''));
        
        if (betId && matchName) {
          bets.push({
            external_bet_id: `${BOOKMAKER}-${betId}`,
            bookmaker: BOOKMAKER,
            match_name: matchName,
            market: market,
            selection: selection,
            odds: odds || 0,
            stake: stake || 0,
            currency: 'NGN',
            outcome: normalizeOutcome(statusText),
            profit_loss: winnings ? winnings - stake : null,
            sport: 'football',
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
  
  function normalizeOutcome(outcome) {
    if (!outcome) return 'pending';
    const lower = outcome.toLowerCase();
    if (lower.includes('won') || lower.includes('win') || lower.includes('success')) return 'won';
    if (lower.includes('lost') || lower.includes('lose') || lower.includes('fail')) return 'lost';
    if (lower.includes('void') || lower.includes('cancel') || lower.includes('refund')) return 'void';
    if (lower.includes('cash')) return 'cashout';
    return 'pending';
  }
  
  // Sync bet history
  const syncBetHistory = debounce(() => {
    const url = window.location.href;
    if (url.includes('/bet-history') || url.includes('/my-bets') || url.includes('/account')) {
      const bets = extractBetHistory();
      if (bets.length > 0) {
        chrome.runtime.sendMessage({
          type: 'BETS_SCRAPED',
          payload: bets,
        }).then(response => {
          console.log('[Vantedge] SportyBet history synced:', response);
        });
      }
    }
  }, 2000);
  
  // Initialize
  function init() {
    watchBetPlacement();
    
    const observer = new MutationObserver(debounce(() => {
      syncBetHistory();
    }, 1000));
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    syncBetHistory();
    
    console.log('[Vantedge] SportyBet integration ready');
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
