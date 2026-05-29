#!/bin/bash
set -e

source .env

add_env() {
  local key=$1
  local val=$2
  
  if [ -n "$val" ]; then
    echo "Adding $key..."
    npx vercel env rm "$key" production -y >/dev/null 2>&1 || true
    echo -n "$val" | npx vercel env add "$key" production
  fi
}

echo "Adding environment variables to Vercel (Production only)..."
add_env "BOT_TOKEN" "$BOT_TOKEN"
add_env "SUPABASE_URL" "$SUPABASE_URL"
add_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
add_env "CRON_SECRET" "$CRON_SECRET"
add_env "WEBHOOK_SECRET" "$WEBHOOK_SECRET"
add_env "ADMIN_TELEGRAM_IDS" "$ADMIN_TELEGRAM_IDS"

echo "Deploying to Vercel..."
npx vercel --prod --yes > vercel_url.txt
VERCEL_URL=$(cat vercel_url.txt)
echo "Deployed to: $VERCEL_URL"

# Avoid duplicate WEBHOOK_URL in .env if running multiple times
sed -i.bak '/^WEBHOOK_URL=/d' .env
echo "WEBHOOK_URL=${VERCEL_URL}/api/bot" >> .env

echo "Adding WEBHOOK_URL to Vercel..."
add_env "WEBHOOK_URL" "${VERCEL_URL}/api/bot"

echo "Deployment complete! Now setting webhook..."
source .env
npm run set-webhook
