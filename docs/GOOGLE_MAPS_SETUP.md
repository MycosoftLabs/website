# Google Maps API Setup

The NatureOS dashboard uses Google Maps for the Mycelium Network visualization, device locations, and Spore Tracker features.

## Getting Your API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Places API** (for search functionality)
4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > API Key**
6. Copy your new API key

## Restricting Your API Key (Recommended)

For security, restrict your API key:

1. In the Google Cloud Console, click on your API key
2. Under **Application restrictions**, select:
   - **HTTP referrers (websites)** for production
   - Add your domain: `*.mycosoft.org/*`
   - For development: `http://localhost:3000/*`
3. Under **API restrictions**, select **Restrict key** and enable:
   - Maps JavaScript API
   - Places API

## Adding to Your Project

Add the API key to your `.env.local` file:

```env
# Google Maps API Key (for maps, not OAuth)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Important:** This is different from the Google OAuth credentials (`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`).

## Verifying It Works

After adding the key:

1. Restart your development server: `npm run dev`
2. Navigate to `/natureos` → Overview or Mycelium Network tab
3. The map should load with satellite imagery
4. If you see "Google Maps API key not set", check your `.env.local` file

## Features Using Google Maps

| Feature | Location | Description |
|---------|----------|-------------|
| Global Network | `/natureos` Overview | Shows observations and device locations |
| Mycelium Network | `/natureos` Mycelium Network tab | Full-screen network topology |
| Spore Tracker | `/apps/spore-tracker` | Real-time spore tracking with markers |
| Device Locations | `/natureos` Devices tab | MycoBrain and sensor locations |

## Fallback Mode

If no API key is provided, the maps will render in a simplified CSS-based mode that still shows:
- Observation point markers
- Device locations
- Basic map controls

This allows development without a Maps API key, but with reduced functionality.

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Google Maps API key not set" | Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.local` |
| "RefererNotAllowedMapError" | Check API key restrictions in Google Cloud Console |
| "InvalidKeyMapError" | Verify the API key is correct |
| Map loads but no satellite | Enable "Maps JavaScript API" in Google Cloud Console |
| "This page can't load Google Maps correctly" | Check billing is enabled for your Google Cloud project |
