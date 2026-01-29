import os
import time
from dotenv import load_dotenv
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from datetime import datetime

# Load env variables
load_dotenv()

# Configuration
API_KEY = os.getenv("BREVO_API_KEY", "").strip().strip('"').strip("'")
LIST_ID = int(os.getenv("BREVO_WAITLIST_ID", "0"))

print(f"API Key Length: {len(API_KEY)}")
print(f"List ID: {LIST_ID}")

# Setup API Client
configuration = sib_api_v3_sdk.Configuration()
configuration.api_key['api-key'] = API_KEY
api_instance = sib_api_v3_sdk.ContactsApi(sib_api_v3_sdk.ApiClient(configuration))

def test_add_contact(email, attributes=None):
    print(f"\nTesting email: {email}")
    print(f"Attributes: {attributes}")
    
    create_contact = sib_api_v3_sdk.CreateContact(
        email=email,
        attributes=attributes or {},
        list_ids=[LIST_ID],
        update_enabled=True
    )

    try:
        api_response = api_instance.create_contact(create_contact)
        print(f"✅ Success! ID: {api_response.id}")
        return True
    except ApiException as e:
        print(f"❌ Failed: {e.status} - {e.body}")
        return False

# Test 1: Minimal Contact (No attributes)
# Using a random email to avoid conflicts/issues
test_email_base = f"debug_test_{int(time.time())}"

print("\n=== Test 1: Minimal Contact (No Attributes) ===")
if test_add_contact(f"{test_email_base}_min@example.com"):
    print("Basic connectivity and List ID are CORRECT.")
else:
    print("Cannot proceed. Basic contact creation failed.")
    exit(1)

# Test 2: Full Attributes (Replicating the app)
print("\n=== Test 2: Full Attributes (Like App) ===")
full_attributes = {
    "SIGNUP_DATE": datetime.now().strftime("%Y-%m-%d"),
    "WAITLIST_POSITION": 1,
    "FIRSTNAME": "Debug",
    "LASTNAME": "User",
    "REFERRAL_SOURCE": "debug_script"
}
test_add_contact(f"{test_email_base}_full@example.com", full_attributes)

# Test 3: Individual Attributes (if full failed)
print("\n=== Test 3: Testing Attributes Individually ===")
for key, value in full_attributes.items():
    print(f"Testing attribute: {key}={value}")
    test_add_contact(
        f"{test_email_base}_{key}@example.com", 
        {key: value}
    )
