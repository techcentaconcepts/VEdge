// Vantedge - BetKing Content Script
// Extracts bet data and odds from betking.com

(function() {
  'use strict';
  
  const BOOKMAKER = 'betking';
  
  console.log('[Vantedge] BetKing content script loaded');
  
  function debounce(fn, ms) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), ms);
    };
  }
  
  function extractBetFromSlip() {
    try {
      const betslip = document.querySelector('.betslip, .bet-slip, [class*="coupon"]');
      if (!betslip) return [];
      
      const bets = [];
      const selections = betslip.querySelectorAll('.bet-item, .selection-item, [class*="slip-item"]');
      
      selections.forEach(sel => {
        const matchName = sel.querySelector('.match-name, .event-name, [class*="teams"]')?.textContent?.trim() || '';
        const market = sel.querySelector('.market-name, .bet-type, [class*="market"]')?.textContent?.trim() || '';
        const selection = sel.querySelector('.selection-name, .pick, [class*="selection"]')?.textContent?.trim() || '';
        const oddsText = sel.querySelector('.odds, .odd-value, [class*="price"]')?.textContent?.trim() || '';
        const odds = parseFloat(oddsText.replace(/[^\d.]/g, ''));
        
        if (matchName && odds) {
          bets.push({
            match_name: matchName,
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
  
  function extractStake() {
    try {
      const stakeInput = document.querySelector('input[class*="stake"], input[name*="stake"], input[placeholder*="stake" i]');
      return parseFloat(stakeInput?.value) || 0;
    } catch (e) {
      return 0;
    }
  }
  
  function watchBetPlacement() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      const isBetButton = 
        target.matches('.place-bet, .submit-bet, [class*="place"], button[type="submit"]') ||
        target.closest('.place-bet, .submit-bet') ||
        (target.tagName === 'BUTTON' && target.textContent?.toLowerCase()?.includes('place'));
      
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
              console.log('[Vantedge] BetKing bets sent:', response);
            });
          }
        }, 500);
      }
    }, true);
  }
  
  function extractBetHistory() {
    try {
      const historyContainer = document.querySelector('[class*="history"], [class*="my-bets"]');
      if (!historyContainer) return [];
      
      const bets = [];
      const betItems = historyContainer.querySelectorAll('[class*="bet-card"], [class*="bet-item"], tr[data-bet]');
      
      betItems.forEach(item => {
        const betId = item.dataset?.betId || item.querySelector('[data-bet-id]')?.dataset?.betId || '';
        const matchName = item.querySelector('[class*="match"], [class*="event"]')?.textContent?.trim() || '';
        const market = item.querySelector('[class*="market"]')?.textContent?.trim() || '';
        const selection = item.querySelector('[class*="selection"]')?.textContent?.trim() || '';
        const oddsText = item.querySelector('[class*="odds"]')?.textContent?.trim() || '';
        const stakeText = item.querySelector('[class*="stake"]')?.textContent?.trim() || '';
        const statusText = item.querySelector('[class*="status"]')?.textContent?.toLowerCase() || '';
        const winningsText = item.querySelector('[class*="winnings"], [class*="return"]')?.textContent?.trim() || '';
        
        const odds = parseFloat(oddsText.replace(/[^\d.]/g, ''));
        const stake = parseFloat(stakeText.replace(/[^\d.]/g, ''));
        const winnings = parseFloat(winningsText.replace(/[^\d.]/g, ''));
        
        if (betId || matchName) {
          bets.push({
            external_bet_id: `${BOOKMAKER}-${betId || Date.now()}`,
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
    if (lower.includes('won') || lower.includes('win')) return 'won';
    if (lower.includes('lost') || lower.includes('lose')) return 'lost';
    if (lower.includes('void') || lower.includes('cancel')) return 'void';
    if (lower.includes('cash')) return 'cashout';
    return 'pending';
  }
  
  const syncBetHistory = debounce(() => {
    const url = window.location.href;
    if (url.includes('/history') || url.includes('/my-bets') || url.includes('/account')) {
      const bets = extractBetHistory();
      if (bets.length > 0) {
        chrome.runtime.sendMessage({
          type: 'BETS_SCRAPED',
          payload: bets,
        }).then(response => {
          console.log('[Vantedge] BetKing history synced:', response);
        });
      }
    }
  }, 2000);
  
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
    
    console.log('[Vantedge] BetKing integration ready');
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
