"""
Quick test script to inspect SportyBet API response
"""
import httpx
import json
import time

url = "https://www.sportybet.com/api/ng/factsCenter/flexiblebet/v2/getOddsKey"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en",
    "Referer": "https://www.sportybet.com/ng/sport/football/",
    "clientid": "web",
    "platform": "web",
    "operid": "2"
}

params = {
    "_t": str(int(time.time() * 1000))
}

print(f"Fetching: {url}")
print(f"Params: {params}\n")

try:
    response = httpx.get(url, headers=headers, params=params, timeout=30.0)
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.headers.get('content-type')}\n")
    
    if response.status_code == 200:
        data = response.json()
        
        print("=" * 60)
        print("RESPONSE STRUCTURE:")
        print("=" * 60)
        
        if isinstance(data, dict):
            print(f"\nTop-level keys: {list(data.keys())}")
            print(f"\nFull response (formatted):\n")
            print(json.dumps(data, indent=2, ensure_ascii=False)[:2000])  # First 2000 chars
            print("\n... (truncated)")
        elif isinstance(data, list):
            print(f"\nResponse is a list with {len(data)} items")
            if len(data) > 0:
                print(f"First item: {json.dumps(data[0], indent=2)[:500]}")
        else:
            print(f"\nUnexpected type: {type(data)}")
    else:
        print(f"Error: {response.text[:500]}")
        
except Exception as e:
    print(f"❌ Error: {e}")
