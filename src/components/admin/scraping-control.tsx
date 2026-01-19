# Admin Dashboard Component for Manual Scraping Control

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Play, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

interface ScrapingResult {
  success: boolean;
  oddsScraped: number;
  opportunitiesDetected: number;
  duration: number;
  errors?: string[];
}

export function ScrapingControl() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScrapingResult | null>(null);
  const [status, setStatus] = useState<{ lastScrape: string | null; activeOpportunities: number } | null>(null);

  const triggerScraping = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport: 'football' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Scraping failed');
      }

      setResult(data.result);
      
      // Refresh status
      fetchStatus();
    } catch (error) {
      console.error('Scraping error:', error);
      setResult({
        success: false,
        oddsScraped: 0,
        opportunitiesDetected: 0,
        duration: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/scrape');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  // Fetch status on mount
  useState(() => {
    fetchStatus();
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Odds Scraping Control</CardTitle>
          <CardDescription>
            Manually trigger odds scraping from bookmakers. Automated scraping runs every 2 minutes via cron job.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={triggerScraping}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Trigger Scraping
                </>
              )}
            </Button>

            <Button
              onClick={fetchStatus}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Status
            </Button>
          </div>

          {/* Status */}
          {status && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Last Scrape</p>
                <p className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {status.lastScrape
                    ? new Date(status.lastScrape).toLocaleString()
                    : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Active Opportunities</p>
                <p className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {status.activeOpportunities}
                </p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg border ${
              result.success
                ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <p className={`font-semibold ${
                    result.success ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
                  }`}>
                    {result.success ? 'Scraping Completed Successfully' : 'Scraping Failed'}
                  </p>
                  
                  {result.success && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-neutral-600 dark:text-neutral-400">Odds Scraped</p>
                        <p className="font-semibold">{result.oddsScraped}</p>
                      </div>
                      <div>
                        <p className="text-neutral-600 dark:text-neutral-400">Opportunities</p>
                        <p className="font-semibold">{result.opportunitiesDetected}</p>
                      </div>
                      <div>
                        <p className="text-neutral-600 dark:text-neutral-400">Duration</p>
                        <p className="font-semibold">{(result.duration / 1000).toFixed(2)}s</p>
                      </div>
                    </div>
                  )}

                  {result.errors && result.errors.length > 0 && (
                    <div className="text-sm">
                      <p className="font-semibold mb-1">Errors:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {result.errors.map((error, i) => (
                          <li key={i} className="text-red-700 dark:text-red-300">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scraping Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">Schedule:</span>
            <span className="font-semibold">Every 2 minutes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">Soft Bookmakers:</span>
            <span className="font-semibold">Bet9ja, SportyBet, BetKing</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">Sharp Bookmakers:</span>
            <span className="font-semibold">Pinnacle (via OddsAPI)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">Markets:</span>
            <span className="font-semibold">1X2, O/U 2.5, BTTS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">Min Edge:</span>
            <span className="font-semibold">2%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
