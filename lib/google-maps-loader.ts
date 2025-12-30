/**
 * Shared Google Maps API loader
 * Ensures the script is only loaded once, even if multiple components need it
 */

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google?: {
      maps: typeof google.maps
    }
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

let loadPromise: Promise<void> | null = null
let isLoaded = false
let isLoading = false

// Track which libraries are needed (union of all requested libraries)
const requestedLibraries = new Set<string>()

export function loadGoogleMaps(libraries: string[] = ["visualization", "places"]): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only be loaded in browser"))
  }

  // Track requested libraries
  libraries.forEach(lib => requestedLibraries.add(lib))

  // If already loaded, return immediately
  if (isLoaded && window.google?.maps) {
    return Promise.resolve()
  }

  // If currently loading, return the existing promise
  if (isLoading && loadPromise) {
    return loadPromise
  }

  // Check if script already exists in DOM
  const existingScript = document.querySelector(
    'script[src*="maps.googleapis.com/maps/api/js"]'
  ) as HTMLScriptElement

  if (existingScript) {
    // Script exists, wait for it to load
    isLoading = true
    loadPromise = new Promise((resolve, reject) => {
      const checkLoaded = () => {
        if (window.google?.maps) {
          isLoaded = true
          isLoading = false
          resolve()
        } else {
          // Wait a bit and check again (max 10 seconds)
          setTimeout(checkLoaded, 100)
        }
      }
      
      // Check if already loaded
      if (window.google?.maps) {
        isLoaded = true
        isLoading = false
        resolve()
      } else {
        // Wait for existing script to load
        const onLoad = () => {
          isLoaded = true
          isLoading = false
          existingScript.removeEventListener("load", onLoad)
          existingScript.removeEventListener("error", onError)
          resolve()
        }
        
        const onError = () => {
          isLoading = false
          existingScript.removeEventListener("load", onLoad)
          existingScript.removeEventListener("error", onError)
          reject(new Error("Google Maps script failed to load"))
        }
        
        existingScript.addEventListener("load", onLoad)
        existingScript.addEventListener("error", onError)
        
        // Fallback timeout
        setTimeout(() => {
          if (window.google?.maps) {
            isLoaded = true
            isLoading = false
            existingScript.removeEventListener("load", onLoad)
            existingScript.removeEventListener("error", onError)
            resolve()
          } else if (!isLoaded) {
            isLoading = false
            existingScript.removeEventListener("load", onLoad)
            existingScript.removeEventListener("error", onError)
            reject(new Error("Google Maps failed to load within timeout"))
          }
        }, 10000)
      }
    })
    return loadPromise
  }

  // No script exists, create and load it
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error("Google Maps API key not set"))
  }

  isLoading = true
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    // Use all requested libraries (union)
    const allLibraries = Array.from(requestedLibraries)
    const librariesParam = allLibraries.length > 0 ? `&libraries=${allLibraries.join(",")}` : ""
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}${librariesParam}`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      isLoaded = true
      isLoading = false
      resolve()
    }
    
    script.onerror = () => {
      isLoading = false
      loadPromise = null
      reject(new Error("Failed to load Google Maps script"))
    }
    
    document.head.appendChild(script)
  })

  return loadPromise
}

export function isGoogleMapsLoaded(): boolean {
  if (typeof window === "undefined") return false
  return isLoaded && !!window.google?.maps
}










