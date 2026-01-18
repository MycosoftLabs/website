"use client";

import { useEffect, useRef, useState } from "react";

interface GridTile {
  id: string;
  lat: number;
  lon: number;
  latEnd: number;
  lonEnd: number;
  centerLat: number;
  centerLon: number;
  region?: string;
  isLand: boolean;
  areaKm2: number;
}

interface FungalObservation {
  id: number;
  observed_on: string;
  latitude: number;
  longitude: number;
  species: string;
  scientificName?: string;
  source: string;
  imageUrl?: string;
  place_guess?: string;
  user_login?: string;
  quality_grade?: string;
}

interface CesiumGlobeProps {
  onViewportChange?: (viewport: { north: number; south: number; east: number; west: number }) => void;
  onCellClick?: (cellId: string, lat: number, lon: number) => void;
  onTileClick?: (tile: GridTile) => void;
  showLandGrid?: boolean;
  gridTileSize?: number;
  layers?: {
    fungi: boolean;
    devices: boolean;
    mycelium: boolean;
    heat: boolean;
    organisms: boolean;
    weather: boolean;
    inat: boolean;
  };
}

export function CesiumGlobe({ 
  onViewportChange, 
  onCellClick, 
  onTileClick,
  showLandGrid = false,
  gridTileSize = 0.5,
  layers 
}: CesiumGlobeProps) {
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const gridEntitiesRef = useRef<any[]>([]);
  const fungalEntitiesRef = useRef<any[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gridLoaded, setGridLoaded] = useState(false);
  const [gridStats, setGridStats] = useState<{ totalTiles: number; landTiles: number } | null>(null);
  const [fungalObservations, setFungalObservations] = useState<FungalObservation[]>([]);

  useEffect(() => {
    if (!cesiumContainerRef.current || initialized) return;

    // Load Cesium from CDN
    const loadCesium = async () => {
      try {
        // Load Cesium CSS
        if (!document.querySelector('link[href*="cesium"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          // Use unpkg CDN as alternative (more reliable)
          link.href = "https://unpkg.com/cesium@1.115.0/Build/Cesium/Widgets/widgets.css";
          link.onerror = () => {
            // Fallback to official CDN
            const fallbackLink = document.createElement("link");
            fallbackLink.rel = "stylesheet";
            fallbackLink.href = "https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Widgets/widgets.css";
            document.head.appendChild(fallbackLink);
          };
          document.head.appendChild(link);
        }

        // Load Cesium JS
        if (!(window as any).Cesium) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            // Use unpkg CDN as alternative (more reliable)
            script.src = "https://unpkg.com/cesium@1.115.0/Build/Cesium/Cesium.js";
            script.onload = resolve;
            script.onerror = () => {
              // Fallback to official CDN
              const fallbackScript = document.createElement("script");
              fallbackScript.src = "https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Cesium.js";
              fallbackScript.onload = resolve;
              fallbackScript.onerror = reject;
              document.head.appendChild(fallbackScript);
            };
            document.head.appendChild(script);
          });
        }

        const Cesium = (window as any).Cesium;
        if (!Cesium) {
          throw new Error("Cesium failed to load");
        }

        // Set Cesium base URL (try unpkg first, fallback to official)
        (window as any).CESIUM_BASE_URL = "https://unpkg.com/cesium@1.115.0/Build/Cesium/";
        
        // Fallback to official CDN if unpkg fails
        if (!(window as any).Cesium) {
          (window as any).CESIUM_BASE_URL = "https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/";
        }

        // Disable default Cesium Ion token warning
        Cesium.Ion.defaultAccessToken = undefined;

        // Initialize Cesium Viewer with default (empty/blue) ellipsoid first
        const viewer = new Cesium.Viewer(cesiumContainerRef.current, {
          baseLayerPicker: false, // Disable to avoid Ion token errors
          imageryProvider: false, // No default imagery - we'll add our own
          vrButton: false,
          geocoder: false, // Disable geocoder (requires Ion token)
          homeButton: true,
          infoBox: true,
          sceneModePicker: true,
          selectionIndicator: true,
          timeline: false,
          animation: false,
          fullscreenButton: true,
          navigationHelpButton: true,
          shouldAnimate: true,
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
        });
        
        // Add satellite imagery via our GEE tile proxy or ESRI fallback
        // This allows us to switch to Google Earth Engine when configured
        try {
          // Try our local tile proxy first (supports GEE when configured)
          const geeProxyImagery = new Cesium.UrlTemplateImageryProvider({
            url: "/api/earth-simulator/gee/tile/satellite/{z}/{x}/{y}",
            credit: new Cesium.Credit("Mycosoft NatureOS | ESRI World Imagery", true),
            maximumLevel: 19,
            tileWidth: 256,
            tileHeight: 256,
          });
          viewer.imageryLayers.addImageryProvider(geeProxyImagery);
        } catch (proxyErr) {
          console.warn("Could not load from tile proxy, trying ESRI direct:", proxyErr);
          try {
            // Fallback to ESRI directly
            const esriImagery = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
              "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
            );
            viewer.imageryLayers.addImageryProvider(esriImagery);
          } catch (imgErr) {
            console.warn("Could not load ESRI imagery, using TileMapService fallback:", imgErr);
            // Ultimate fallback to Natural Earth II imagery (bundled with Cesium CDN)
            const fallbackImagery = await Cesium.TileMapServiceImageryProvider.fromUrl(
              Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
            );
            viewer.imageryLayers.addImageryProvider(fallbackImagery);
          }
        }

        // Set initial camera position (view of Earth from space)
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(0, 0, 20000000),
          orientation: {
            heading: 0.0,
            pitch: Cesium.Math.toRadians(-90),
            roll: 0.0,
          },
        });

        // Enable smooth transitions and viewport tracking
        viewer.camera.moveEnd.addEventListener(() => {
          if (onViewportChange) {
            const rectangle = viewer.camera.computeViewRectangle();
            if (rectangle) {
              const north = Cesium.Math.toDegrees(rectangle.north);
              const south = Cesium.Math.toDegrees(rectangle.south);
              const east = Cesium.Math.toDegrees(rectangle.east);
              const west = Cesium.Math.toDegrees(rectangle.west);
              onViewportChange({ north, south, east, west });
            }
          }
        });

        // Handle clicks on the globe
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((click: any) => {
          const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
          if (cartesian && onCellClick) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            const lat = Cesium.Math.toDegrees(cartographic.latitude);
            const lon = Cesium.Math.toDegrees(cartographic.longitude);
            const cellId = `${Math.floor(lat * 3600)}_${Math.floor(lon * 3600)}`;
            onCellClick(cellId, lat, lon);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        viewerRef.current = viewer;
        setInitialized(true);
        setError(null);

        // Cleanup
        return () => {
          handler.destroy();
          viewer.destroy();
        };
      } catch (err) {
        console.error("Error initializing Cesium:", err);
        setError(err instanceof Error ? err.message : "Failed to load Cesium");
      }
    };

    loadCesium();
  }, [initialized, onViewportChange, onCellClick]);

  // Load grid stats once
  useEffect(() => {
    if (!showLandGrid) return;

    const loadStats = async () => {
      try {
        const statsRes = await fetch(`/api/earth-simulator/land-tiles?action=stats&tileSize=${gridTileSize}`);
        const statsData = await statsRes.json();
        if (statsData.success) {
          setGridStats({ 
            totalTiles: statsData.stats.totalTiles, 
            landTiles: statsData.stats.landTiles 
          });
        }
      } catch (err) {
        console.error("Error loading grid stats:", err);
      }
    };

    loadStats();
  }, [showLandGrid, gridTileSize]);

  // Viewport-based grid loading (only load visible tiles)
  useEffect(() => {
    if (!initialized || !viewerRef.current || !showLandGrid) return;

    const Cesium = (window as any).Cesium;
    const viewer = viewerRef.current;
    let loadTimeout: NodeJS.Timeout | null = null;
    let currentViewport: { north: number; south: number; east: number; west: number } | null = null;

    const loadViewportTiles = async (viewport: { north: number; south: number; east: number; west: number }) => {
      try {
        // Calculate zoom level to limit tiles
        const latRange = viewport.north - viewport.south;
        const lonRange = viewport.east - viewport.west;
        const maxTiles = Math.min(
          Math.ceil((latRange * lonRange) / (gridTileSize * gridTileSize)) * 2, // Buffer for edge tiles
          2000 // Hard limit to prevent memory issues
        );

        // Load only tiles in current viewport
        const response = await fetch(
          `/api/earth-simulator/land-tiles?action=viewport&north=${viewport.north}&south=${viewport.south}&east=${viewport.east}&west=${viewport.west}&tileSize=${gridTileSize}&maxTiles=${maxTiles}`
        );
        const data = await response.json();

        if (!data.success || !data.tiles) {
          console.warn("Failed to load viewport tiles:", data.error);
          return;
        }

        const tiles: GridTile[] = data.tiles;
        console.log(`Loading ${tiles.length} tiles for viewport (max: ${maxTiles})`);

        // Clear existing grid entities
        gridEntitiesRef.current.forEach(entity => {
          viewer.entities.remove(entity);
        });
        gridEntitiesRef.current = [];

        // Add tiles as rectangle entities
        const regionColors: Record<string, string> = {
          "North America": "#4CAF50",
          "South America": "#8BC34A",
          "Europe": "#2196F3",
          "Africa": "#FF9800",
          "Asia": "#9C27B0",
          "Australia": "#F44336",
          "Antarctica": "#E0E0E0",
          "Greenland": "#81D4FA",
          "Unknown": "#757575",
        };

        for (const tile of tiles) {
          const color = regionColors[tile.region || "Unknown"] || "#757575";
          const cesiumColor = Cesium.Color.fromCssColorString(color).withAlpha(0.3);

          const entity = viewer.entities.add({
            id: `grid-${tile.id}`,
            rectangle: {
              coordinates: Cesium.Rectangle.fromDegrees(
                tile.lon,
                tile.lat,
                tile.lonEnd,
                tile.latEnd
              ),
              material: cesiumColor,
              outline: true,
              outlineColor: Cesium.Color.WHITE.withAlpha(0.5),
              outlineWidth: 1,
              height: 0,
            },
            properties: {
              tileId: tile.id,
              region: tile.region,
              areaKm2: tile.areaKm2,
              centerLat: tile.centerLat,
              centerLon: tile.centerLon,
            },
          });

          gridEntitiesRef.current.push(entity);
        }

        // Store tiles for click handler
        (viewer as any)._gridTiles = tiles;
        setGridLoaded(true);
      } catch (err) {
        console.error("Error loading viewport tiles:", err);
      }
    };

    // Handle viewport changes with debouncing
    const handleViewportChange = () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }

      loadTimeout = setTimeout(() => {
        const rectangle = viewer.camera.computeViewRectangle();
        if (rectangle) {
          const north = Cesium.Math.toDegrees(rectangle.north);
          const south = Cesium.Math.toDegrees(rectangle.south);
          const east = Cesium.Math.toDegrees(rectangle.east);
          const west = Cesium.Math.toDegrees(rectangle.west);

          // Only reload if viewport changed significantly (avoid reloading on tiny movements)
          if (!currentViewport || 
              Math.abs(currentViewport.north - north) > gridTileSize * 0.5 ||
              Math.abs(currentViewport.south - south) > gridTileSize * 0.5 ||
              Math.abs(currentViewport.east - east) > gridTileSize * 0.5 ||
              Math.abs(currentViewport.west - west) > gridTileSize * 0.5) {
            currentViewport = { north, south, east, west };
            loadViewportTiles(currentViewport);
          }
        }
      }, 500); // 500ms debounce
    };

    // Initial load
    const rectangle = viewer.camera.computeViewRectangle();
    if (rectangle) {
      const north = Cesium.Math.toDegrees(rectangle.north);
      const south = Cesium.Math.toDegrees(rectangle.south);
      const east = Cesium.Math.toDegrees(rectangle.east);
      const west = Cesium.Math.toDegrees(rectangle.west);
      currentViewport = { north, south, east, west };
      loadViewportTiles(currentViewport);
    }

    // Listen to camera movements
    viewer.camera.moveEnd.addEventListener(handleViewportChange);

    // Add click handler for tiles
    const clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    clickHandler.setInputAction((click: any) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id.id?.startsWith("grid-")) {
        const tileId = picked.id.properties?.tileId?.getValue();
        if (tileId && onTileClick) {
          const tiles = (viewer as any)._gridTiles || [];
          const matchingTile = tiles.find((t: GridTile) => t.id === tileId);
          if (matchingTile) {
            onTileClick(matchingTile);
          }
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      if (loadTimeout) clearTimeout(loadTimeout);
      viewer.camera.moveEnd.removeEventListener(handleViewportChange);
      clickHandler.destroy();
    };
  }, [initialized, showLandGrid, gridTileSize, onTileClick]);

  // Toggle grid visibility when showLandGrid changes
  useEffect(() => {
    if (!viewerRef.current) return;
    
    if (showLandGrid) {
      // Grid will be loaded by the viewport effect
      // Just ensure entities are visible
      gridEntitiesRef.current.forEach(entity => {
        entity.show = true;
      });
    } else {
      // Hide entities when grid is disabled
      gridEntitiesRef.current.forEach(entity => {
        entity.show = false;
      });
      // Clear grid loaded state so it can reload when re-enabled
      setGridLoaded(false);
    }
  }, [showLandGrid]);

  // Fetch and display fungal observations
  useEffect(() => {
    if (!layers?.fungi || !initialized) return;

    const fetchFungalData = async () => {
      try {
        // Try the Earth fungal API first (returns GeoJSON)
        const response = await fetch('/api/earth/fungal?limit=1000&format=json');
        if (response.ok) {
          const data = await response.json();
          
          // Handle GeoJSON format
          if (data.type === 'FeatureCollection' && data.features) {
            const observations = data.features.map((f: any) => ({
              id: f.properties?.id || Math.random(),
              observed_on: f.properties?.timestamp || new Date().toISOString(),
              latitude: f.geometry?.coordinates?.[1],
              longitude: f.geometry?.coordinates?.[0],
              species: f.properties?.species || 'Unknown',
              scientificName: f.properties?.scientificName,
              source: f.properties?.source || 'Unknown',
              imageUrl: f.properties?.imageUrl,
              place_guess: undefined,
              user_login: f.properties?.observer,
              quality_grade: f.properties?.verified ? 'research' : 'needs_id',
            })).filter((obs: FungalObservation) => obs.latitude && obs.longitude);
            
            console.log(`[Earth Simulator] Fetched ${observations.length} fungal observations from GeoJSON`);
            setFungalObservations(observations);
          } else if (data.observations) {
            // Handle regular observations format
            setFungalObservations(data.observations);
          }
        }
      } catch (err) {
        console.error('Failed to fetch fungal data:', err);
      }
    };

    fetchFungalData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchFungalData, 300000);
    return () => clearInterval(interval);
  }, [layers?.fungi, initialized]);

  // Render fungal markers on the globe
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !initialized) return;

    const Cesium = (window as any).Cesium;
    if (!Cesium) return;

    // Clear existing fungal entities
    fungalEntitiesRef.current.forEach(entity => {
      viewer.entities.remove(entity);
    });
    fungalEntitiesRef.current = [];

    // Only render if fungi layer is enabled
    if (!layers?.fungi) return;

    // Add fungal observation markers
    fungalObservations.forEach(obs => {
      if (!obs.latitude || !obs.longitude || isNaN(obs.latitude) || isNaN(obs.longitude)) return;

      // Color based on source and quality
      const isResearchGrade = obs.quality_grade === 'research';
      const isMindex = obs.source === 'MINDEX';
      
      let markerColor;
      if (isMindex) {
        markerColor = Cesium.Color.fromCssColorString('#22c55e'); // Bright green for MINDEX
      } else if (isResearchGrade) {
        markerColor = Cesium.Color.fromCssColorString('#4ade80'); // Green for research grade
      } else {
        markerColor = Cesium.Color.fromCssColorString('#eab308'); // Yellow for needs ID
      }

      const entity = viewer.entities.add({
        id: `fungal-${obs.id}`,
        position: Cesium.Cartesian3.fromDegrees(obs.longitude, obs.latitude, 1000),
        point: {
          pixelSize: isMindex ? 12 : (isResearchGrade ? 10 : 8),
          color: markerColor,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        },
        label: {
          text: `🍄 ${obs.species || 'Unknown'}`,
          font: '12px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -15),
          show: false, // Only show on hover/zoom
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500000), // Show within 500km
        },
        description: `
          <div style="padding: 10px; font-family: system-ui;">
            <h3 style="margin: 0 0 8px; color: #22c55e;">🍄 ${obs.species || 'Unknown Species'}</h3>
            ${obs.scientificName ? `<p style="margin: 0 0 8px; font-style: italic; color: #888;">${obs.scientificName}</p>` : ''}
            <p style="margin: 0 0 4px;"><strong>Source:</strong> ${obs.source}</p>
            <p style="margin: 0 0 4px;"><strong>Date:</strong> ${new Date(obs.observed_on).toLocaleDateString()}</p>
            ${obs.place_guess ? `<p style="margin: 0 0 4px;"><strong>Location:</strong> ${obs.place_guess}</p>` : ''}
            ${obs.user_login ? `<p style="margin: 0 0 4px;"><strong>Observer:</strong> ${obs.user_login}</p>` : ''}
            ${obs.quality_grade ? `<p style="margin: 0 0 4px;"><strong>Quality:</strong> ${obs.quality_grade}</p>` : ''}
            ${obs.imageUrl ? `<img src="${obs.imageUrl}" style="max-width: 200px; border-radius: 4px; margin-top: 8px;" />` : ''}
          </div>
        `,
      });

      fungalEntitiesRef.current.push(entity);
    });

    console.log(`[Earth Simulator] Rendered ${fungalEntitiesRef.current.length} fungal markers`);
  }, [fungalObservations, layers?.fungi, initialized]);

  // Add custom overlay layers when enabled
  useEffect(() => {
    if (!viewerRef.current || !initialized || !(window as any).Cesium) return;

    const Cesium = (window as any).Cesium;
    const viewer = viewerRef.current;

    // Remove existing custom layers (keep base satellite layer)
    const existingLayers = viewer.imageryLayers;
    const layersToRemove: any[] = [];
    for (let i = existingLayers.length - 1; i >= 1; i--) {
      const layer = existingLayers.get(i);
      // Check if it's a custom layer by URL pattern
      if (layer.imageryProvider && layer.imageryProvider.url) {
        const url = layer.imageryProvider.url;
        if (url.includes("mycelium-tiles") || url.includes("heat-tiles") || url.includes("weather-tiles")) {
          layersToRemove.push(layer);
        }
      }
    }
    layersToRemove.forEach(layer => viewer.imageryLayers.remove(layer));

    // Add mycelium layer if enabled
    if (layers?.mycelium) {
      try {
        const myceliumLayer = viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: "/api/earth-simulator/mycelium-tiles/{z}/{x}/{y}",
            credit: "Mycelium Probability",
            maximumLevel: 19,
            tileWidth: 256,
            tileHeight: 256,
          })
        );
        myceliumLayer.alpha = 0.5;
      } catch (err) {
        console.warn("Could not add mycelium layer:", err);
      }
    }

    // Add heat map layer if enabled
    if (layers?.heat) {
      try {
        const heatLayer = viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: "/api/earth-simulator/heat-tiles/{z}/{x}/{y}",
            credit: "Heat Map",
            maximumLevel: 19,
            tileWidth: 256,
            tileHeight: 256,
          })
        );
        heatLayer.alpha = 0.6;
      } catch (err) {
        console.warn("Could not add heat layer:", err);
      }
    }

    // Add weather layer if enabled
    if (layers?.weather) {
      try {
        const weatherLayer = viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: "/api/earth-simulator/weather-tiles/{z}/{x}/{y}",
            credit: "Weather Data",
            maximumLevel: 19,
            tileWidth: 256,
            tileHeight: 256,
          })
        );
        weatherLayer.alpha = 0.4;
      } catch (err) {
        console.warn("Could not add weather layer:", err);
      }
    }
  }, [layers, initialized]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading Cesium Globe</p>
          <p className="text-sm text-gray-400">{error}</p>
          <p className="text-xs text-gray-500 mt-4">
            Please ensure you have internet connection to load Cesium from CDN
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div ref={cesiumContainerRef} className="w-full h-full" />
      
      {/* Grid Stats Overlay */}
      {showLandGrid && gridStats && (
        <div className="absolute top-4 left-4 bg-black/70 text-white p-3 rounded-lg text-sm">
          <div className="font-bold mb-1">24x24 Land Grid</div>
          <div>Total Land Tiles: {gridStats.landTiles.toLocaleString()}</div>
          <div>Tile Size: {gridTileSize}° (~{Math.round(111 * gridTileSize)} km)</div>
          {gridLoaded ? (
            <div className="text-green-400 text-xs mt-1">✓ Grid Loaded</div>
          ) : (
            <div className="text-yellow-400 text-xs mt-1">Loading grid...</div>
          )}
        </div>
      )}
      
      <style jsx global>{`
        .cesium-viewer {
          width: 100% !important;
          height: 100% !important;
        }
        .cesium-viewer-toolbar {
          display: none;
        }
        .cesium-viewer-bottom {
          display: none;
        }
      `}</style>
    </div>
  );
}
