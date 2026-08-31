#!/bin/sh
# Names only — never print values.
set -eu
cd /opt/mycosoft/website
echo "host_git=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "=== host .env names ==="
for k in LAUNCHPAD_ENABLED LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED STRIPE_SECRET_KEY STRIPE_LAUNCHPAD_WEBHOOK_SECRET STRIPE_WEBHOOK_SECRET NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY SAM_API_KEY CALCOM_API_KEY CALCOM_WEBHOOK_SECRET CALCOM_BOOKING_BASE_URL CALCOM_EVENT_TYPE_ADVISORY_15 CALCOM_EVENT_TYPE_ADVISORY_30 CALCOM_EVENT_TYPE_ADVISORY_60 CALCOM_EVENT_TYPE_ADVISORY_90 DOCUSIGN_INTEGRATION_KEY DOCUSIGN_SECRET_KEY DOCUSIGN_CONNECT_HMAC LAUNCHPAD_INGEST_BEARER NVIDIA_NIM_API_KEY MAS_API_URL; do
  if grep -q "^${k}=" .env 2>/dev/null; then
    val=$(grep "^${k}=" .env | head -1 | cut -d= -f2-)
    if [ -n "$val" ]; then echo "$k=set"; else echo "$k=empty"; fi
  else
    echo "$k=absent"
  fi
done
echo "=== container names ==="
for c in mycosoft-website-blue mycosoft-website-green; do
  echo "-- $c --"
  docker exec "$c" sh -c 'for k in LAUNCHPAD_ENABLED STRIPE_SECRET_KEY STRIPE_LAUNCHPAD_WEBHOOK_SECRET SAM_API_KEY CALCOM_WEBHOOK_SECRET DOCUSIGN_INTEGRATION_KEY LAUNCHPAD_INGEST_BEARER NVIDIA_NIM_API_KEY; do if [ -n "$(printenv $k)" ]; then echo "$k=set"; else echo "$k=absent"; fi; done' 2>/dev/null || echo "exec_failed"
done
