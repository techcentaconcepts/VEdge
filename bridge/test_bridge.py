"""
Test script for the Naija Bridge service
Run locally before deploying
"""

import asyncio
import aiohttp
import sys

BASE_URL = "http://localhost:8000"

async def test_health():
    """Test health endpoint"""
    print("🔍 Testing /health endpoint...")
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{BASE_URL}/health") as response:
            data = await response.json()
            print(f"✅ Health check: {data}")
            return data.get("status") == "healthy"

async def test_bet9ja(league="premierleague"):
    """Test Bet9ja scraping"""
    print(f"\n🟢 Testing Bet9ja scraping ({league})...")
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{BASE_URL}/api/odds/bet9ja/{league}", timeout=60) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Bet9ja: Found {data.get('count', 0)} matches")
                    if data.get('matches'):
                        print(f"   Sample: {data['matches'][0]}")
                    return True
                else:
                    print(f"❌ Bet9ja failed: Status {response.status}")
                    error = await response.text()
                    print(f"   Error: {error}")
                    return False
        except asyncio.TimeoutError:
            print("⏱️  Bet9ja timeout (this is normal, scraping takes time)")
            return False
        except Exception as e:
            print(f"❌ Bet9ja error: {e}")
            return False

async def test_all_endpoints():
    """Run all tests"""
    print("\n" + "="*60)
    print("Vantedge Naija Bridge - Test Suite")
    print("="*60)
    
    # Test health
    health_ok = await test_health()
    if not health_ok:
        print("\n❌ Health check failed! Make sure the server is running.")
        print("   Run: uvicorn main:app --reload")
        sys.exit(1)
    
    # Test Bet9ja
    await test_bet9ja()
    
    print("\n" + "="*60)
    print("Test complete!")
    print("="*60)
    print("\n💡 Next steps:")
    print("1. If tests pass, deploy to Railway")
    print("2. Update NAIJA_BRIDGE_URL in Vercel environment")
    print("3. Test from Vercel frontend")

if __name__ == "__main__":
    print("\n⚠️  Make sure the server is running:")
    print("   uvicorn main:app --reload\n")
    
    asyncio.run(test_all_endpoints())
