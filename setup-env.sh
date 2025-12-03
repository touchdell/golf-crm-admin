#!/bin/bash

echo "=========================================="
echo "Supabase Environment Variables Setup"
echo "=========================================="
echo ""
echo "Your Supabase Project URL:"
echo "https://mekooocjsomkbhifnnqy.supabase.co"
echo ""
echo "To get your API keys:"
echo "1. Go to: https://supabase.com/dashboard/project/mekooocjsomkbhifnnqy/settings/api"
echo "2. Click the 'Connect' button (top right)"
echo "3. Look for 'anon' or 'public' key in the connection string"
echo "4. Copy the key (it starts with 'eyJ...')"
echo ""
echo "Or go directly to API Keys:"
echo "https://supabase.com/dashboard/project/mekooocjsomkbhifnnqy/settings/api-keys"
echo ""
read -p "Enter your Supabase URL (or press Enter to use default): " SUPABASE_URL
read -p "Enter your Supabase Anon Key: " SUPABASE_KEY

SUPABASE_URL=${SUPABASE_URL:-https://mekooocjsomkbhifnnqy.supabase.co}

if [ -z "$SUPABASE_KEY" ]; then
  echo "Error: Anon key is required!"
  exit 1
fi

cat > .env << ENVFILE
# Supabase Configuration
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY
ENVFILE

echo ""
echo "✅ .env file created successfully!"
echo ""
echo "Your .env file contains:"
echo "VITE_SUPABASE_URL=$SUPABASE_URL"
echo "VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY"
