/**
 * Shared Google Maps API loader
 * Ensures the script is only loaded once, even if multiple components need it.
 * 
 * FIXES for "map disappears" issue:
 * 1. Better state synchronization with actual DOM/window state
 * 2. Retry logic when API key is valid but load fails temporarily
 * 3. Graceful recovery when navigating between MapLibre and Google Maps pages
 */

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google?: {
      maps: typeof google.maps
    }
    __googleMapsCallback?: () => void
  }
}

// Filter out placeholder values that indicate no real key is set
const rawApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
const GOOGLE_MAPS_API_KEY = rawApiKey && !rawApiKey.includes("your-") && rawApiKey !== "your-api-key-here" ? rawApiKey : ""

// State management - sync with actual window state
let loadPromise: Promise<void> | null = null
let loadAttempts = 0
const MAX_LOAD_ATTEMPTS = 3

// Track which libraries are needed (union of all requested libraries)
const requestedLibraries = new Set<string>()

/**
 * Check if Google Maps is actually loaded and usable
 */
function checkGoogleMapsReady(): boolean {
  if (typeof window === "undefined") return false
  return !!(window.google?.maps?.Map)
}

/**
 * Reset loader state - useful when recovering from errors
 */
export function resetGoogleMapsLoader(): void {
  loadPromise = null
  loadAttempts = 0
}

/**
 * Load Google Maps API
 * @param libraries - Array of library names to load (e.g., ["visualization", "places"])
 * @returns Promise that resolves when Google Maps is ready
 */
export function loadGoogleMaps(libraries: string[] = ["visualization", "places"]): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only be loaded in browser"))
  }

  // Track requested libraries
  libraries.forEach(lib => requestedLibraries.add(lib))

  // If already loaded and working, return immediately
  if (checkGoogleMapsReady()) {
    return Promise.resolve()
  }

  // If currently loading, return the existing promise
  if (loadPromise) {
    return loadPromise
  }

  // Check if script already exists in DOM
  const existingScript = document.querySelector(
    'script[src*="maps.googleapis.com/maps/api/js"]'
  ) as HTMLScriptElement

  if (existingScript) {
    // Script exists in DOM - wait for it to be ready
    loadPromise = new Promise((resolve, reject) => {
      // Check if already loaded
      if (checkGoogleMapsReady()) {
        loadPromise = null
        resolve()
        return
      }

      let checkCount = 0
      const maxChecks = 100 // 10 seconds max

      const checkLoaded = () => {
        checkCount++
        if (checkGoogleMapsReady()) {
          loadPromise = null
          resolve()
        } else if (checkCount >= maxChecks) {
          loadPromise = null
          reject(new Error("Google Maps failed to load within timeout"))
        } else {
          setTimeout(checkLoaded, 100)
        }
      }

      // Start checking
      checkLoaded()
    })
    return loadPromise
  }

  // No script exists, create and load it
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("[Google Maps] API key not set. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local")
    return Promise.reject(new Error("Google Maps API key not set. Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local"))
  }

  loadAttempts++

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    // Use all requested libraries (union)
    const allLibraries = Array.from(requestedLibraries)
    const librariesParam = allLibraries.length > 0 ? `&libraries=${allLibraries.join(",")}` : ""
    
    // Use callback to ensure proper initialization
    const callbackName = `__googleMapsCallback_${Date.now()}`
    ;(window as any)[callbackName] = () => {
      delete (window as any)[callbackName]
      if (checkGoogleMapsReady()) {
        loadPromise = null
        resolve()
      } else {
        loadPromise = null
        reject(new Error("Google Maps loaded but not properly initialized"))
      }
    }
    
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}${librariesParam}&callback=${callbackName}`
    script.async = true
    script.defer = true
    script.id = "google-maps-script"
    
    script.onerror = () => {
      delete (window as any)[callbackName]
      loadPromise = null
      
      // Retry logic
      if (loadAttempts < MAX_LOAD_ATTEMPTS) {
        console.warn(`[Google Maps] Load attempt ${loadAttempts} failed, retrying...`)
        // Remove failed script
        script.remove()
        // Retry after a short delay
        setTimeout(() => {
          loadGoogleMaps(libraries).then(resolve).catch(reject)
        }, 1000)
      } else {
        console.error("[Google Maps] Failed to load after multiple attempts")
        reject(new Error("Failed to load Google Maps script after multiple attempts"))
      }
    }
    
    // Timeout fallback
    const timeout = setTimeout(() => {
      if (!checkGoogleMapsReady()) {
        delete (window as any)[callbackName]
        loadPromise = null
        reject(new Error("Google Maps load timeout"))
      }
    }, 15000)
    
    // Clear timeout on successful load
    const originalCallback = (window as any)[callbackName]
    ;(window as any)[callbackName] = () => {
      clearTimeout(timeout)
      originalCallback()
    }
    
    document.head.appendChild(script)
  })

  return loadPromise
}

/**
 * Check if Google Maps is loaded and ready
 */
export function isGoogleMapsLoaded(): boolean {
  return checkGoogleMapsReady()
}

/**
 * Get the Google Maps API key (for components that need it directly)
 */
export function getGoogleMapsApiKey(): string {
  return GOOGLE_MAPS_API_KEY
}

/**
 * Check if a valid API key is configured
 */
export function hasGoogleMapsApiKey(): boolean {
  return !!GOOGLE_MAPS_API_KEY
}



































