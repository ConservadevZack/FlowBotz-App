#!/usr/bin/env python3
"""
Test environment variable loading in the same way as the server
"""
import os
from dotenv import load_dotenv

print("Testing environment variable loading...")

# Load from same location as server
load_dotenv()

print(f"PRINTFUL_API_KEY: {repr(os.getenv('PRINTFUL_API_KEY', 'NOT_FOUND')[:30])}...")
print(f"PRINTIFY_API_KEY: {repr(os.getenv('PRINTIFY_API_KEY', 'NOT_FOUND')[:30])}...")

# Check if the values match our expected prefixes
printful_key = os.getenv('PRINTFUL_API_KEY', '')
printify_key = os.getenv('PRINTIFY_API_KEY', '')

if printful_key and printful_key != 'your_printful_api_key':
    print("✅ Printful API key is configured")
else:
    print("❌ Printful API key not configured or is placeholder")

if printify_key and printify_key != 'your_printify_api_key':
    print("✅ Printify API key is configured") 
else:
    print("❌ Printify API key not configured or is placeholder")