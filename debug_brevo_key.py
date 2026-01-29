import os
from dotenv import load_dotenv
import requests

# Load env exactly like main.py
BASE_DIR = os.getcwd()
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(env_path)

api_key = os.getenv("BREVO_API_KEY")

print(f"Loading .env from: {env_path}")
print("-" * 50)

if not api_key:
    print("❌ BREVO_API_KEY is NOT set in environment")
else:
    print(f"✅ BREVO_API_KEY found")
    print(f"Length: {len(api_key)}")
    print(f"First 5 chars: {repr(api_key[:5])}")
    print(f"Last 5 chars:  {repr(api_key[-5:])}")
    
    # Check for whitespace
    if api_key.strip() != api_key:
        print("⚠️ WARNING: API Key contains surrounding whitespace!")
        print(f"Cleaned key length: {len(api_key.strip())}")
    
    # Check for quotes
    if (api_key.startswith('"') and api_key.endswith('"')) or (api_key.startswith("'") and api_key.endswith("'")):
        print("⚠️ WARNING: API Key appears to be wrapped in quotes")
        print(f"Cleaned key: {api_key.strip('\"\'')}")

    print("-" * 50)
    print("Testing raw API connection...")
    
    # Clean key for test
    clean_key = api_key.strip().strip("'").strip('"')
    
    headers = {
        "api-key": clean_key,
        "accept": "application/json"
    }
    
    try:
        response = requests.get("https://api.brevo.com/v3/account", headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
             print("✅ SUCCESS: Key is valid (after cleaning)")
        elif response.status_code == 401:
             print("❌ FAILED: 401 Unauthorized - Key is invalid")
        else:
             print(f"❌ FAILED: {response.status_code}")
             
    except Exception as e:
        print(f"Error making request: {e}")
