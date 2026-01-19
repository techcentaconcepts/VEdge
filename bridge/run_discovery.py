import asyncio
import httpx
import json

async def check_url(client, url, method="GET", json_data=None):
    try:
        if method == "GET":
            response = await client.get(url)
        else:
            response = await client.post(url, json=json_data)
        
        print(f"[{method}] {url} -> {response.status_code}")
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"    Success! Keys: {list(data.keys())}")
                if 'bizCode' in data:
                    print(f"    bizCode: {data['bizCode']}")
                    if data['bizCode'] == 10000:
                         print("    (Business Success Code 10000)")
                if 'data' in data:
                    d = data['data']
                    if isinstance(d, list):
                        print(f"    Data (List): len={len(d)}")
                        if len(d) > 0:
                            print(f"    Sample: {str(d[0])[:100]}")
                    elif isinstance(d, dict):
                         print(f"    Data (Dict): Keys={list(d.keys())}")
            except:
                print("    (Not JSON)")
        elif response.status_code == 404:
             pass
        else:
             print(f"    Response: {response.text[:200]}")
    except Exception as e:
        print(f"[{method}] {url} -> Error: {e}")

async def main():
    base_url = "https://www.sportybet.com/api/ng/factsCenter"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Referer": "https://www.sportybet.com/ng/sport/football",
    }

    async with httpx.AsyncClient(headers=headers, timeout=10.0) as client:
        print("Testing discovered endpoints...")

        # 1. flexiblebet/v2/getOddsKey (Confirmed working by user)
        await check_url(client, f"{base_url}/flexiblebet/v2/getOddsKey")

        # Payload variations
        payloads = [
            [{"sportId": "sr:sport:1"}], # Array implies bulk fetch?
            {"sportId": "sr:sport:1"},
            {"sportId": "1"}, 
            {"sId": "1"},
        ]
        
        # 2. pcEvents (POST)
        print("\n--- Testing pcEvents (POST) ---")
        for p in payloads:
            await check_url(client, f"{base_url}/pcEvents", method="POST", json_data=p)

        # 3. popularAndSportList (POST)
        print("\n--- Testing popularAndSportList (POST) ---")
        for p in payloads:
             await check_url(client, f"{base_url}/popularAndSportList", method="POST", json_data=p)

        # 4. pcUpcomingEvents (POST)
        print("\n--- Testing pcUpcomingEvents (POST) ---")
        for p in payloads:
             await check_url(client, f"{base_url}/pcUpcomingEvents", method="POST", json_data=p)
        
        # 5. liveOrPrematchEvents (GET)
        print("\n--- Testing liveOrPrematchEvents (GET) ---")
        await check_url(client, f"{base_url}/liveOrPrematchEvents?sportId=sr:sport:1")

if __name__ == "__main__":
    asyncio.run(main())
