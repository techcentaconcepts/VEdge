import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const BRIDGE_URL = process.env.NAIJA_BRIDGE_URL || 'https://vantedge-production.up.railway.app';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!adminData) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Test Railway Bridge health
    const bridgeHealth = await testBridgeHealth();
    
    // Get scraper health from database
    const { data: scraperData } = await supabase
      .from('scraper_health')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get proxy stats
    const { data: proxyData } = await supabase
      .from('proxy_pool')
      .select('status');

    const proxyStats = {
      total: proxyData?.length || 0,
      active: proxyData?.filter(p => p.status === 'active').length || 0,
      banned: proxyData?.filter(p => p.status === 'banned').length || 0,
      cooling: proxyData?.filter(p => p.status === 'cooling').length || 0,
    };

    // Get recent value opportunities count
    const { data: opportunitiesCount } = await supabase
      .from('value_opportunities')
      .select('match_id', { count: 'exact', head: true });

    return NextResponse.json({
      bridge: bridgeHealth,
      scrapers: scraperData || [],
      proxyStats,
      opportunitiesCount: opportunitiesCount || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scraper status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function testBridgeHealth() {
  try {
    const response = await fetch(`${BRIDGE_URL}/health`, {
      method: 'GET',
      headers: { 'User-Agent': 'Vantedge-Admin/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        status: 'healthy',
        ...data,
      };
    } else {
      return {
        status: 'degraded',
        error: `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
