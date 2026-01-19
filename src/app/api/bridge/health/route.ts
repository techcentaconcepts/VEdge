import { NextResponse } from 'next/server';

const BRIDGE_URL = process.env.NAIJA_BRIDGE_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bridge/health
 * 
 * Check if the FastAPI bridge service is reachable and healthy
 */
export async function GET() {
  try {
    const response = await fetch(`${BRIDGE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          bridge_status: 'unreachable',
          bridge_url: BRIDGE_URL,
          error: `HTTP ${response.status}`,
        },
        { status: 503 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      bridge_status: 'healthy',
      bridge_url: BRIDGE_URL,
      bridge_info: data,
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        bridge_status: 'error',
        bridge_url: BRIDGE_URL,
        error: error.message,
        hint: 'Make sure the bridge service is running and NAIJA_BRIDGE_URL is configured',
      },
      { status: 503 }
    );
  }
}
