# Earth Simulator - NatureOS Environmental Intelligence Platform

## 🌍 Overview

The Earth Simulator is a comprehensive, real-time 3D visualization and analysis platform for environmental intelligence, mycelium network mapping, and global ecosystem monitoring. Built on CesiumJS and integrated with Google Earth Engine, it provides scientific-grade geospatial analysis capabilities for the Mycosoft NatureOS platform.

## 🎯 Mission

To create the world's most advanced environmental intelligence platform that:
- **Visualizes** global ecosystems in real-time 3D
- **Tracks** mycelium networks and fungal intelligence across continents
- **Monitors** environmental conditions through MycoBrain sensor networks
- **Analyzes** biodiversity, climate patterns, and ecological interactions
- **Predicts** ecosystem changes using Nature Learning Models (NLM)
- **Enables** scientific research and conservation efforts at planetary scale

## 🚀 Core Capabilities

### 1. **24x24 Inch Land Grid System**
- Unique tile IDs for every landmass on Earth (75,168+ tiles)
- Excludes all ocean areas automatically
- Supports multiple resolutions: Coarse (1°), Medium (0.5°), Fine (0.1°)
- Viewport-based lazy loading (max 2000 tiles) for optimal performance
- Region-based color coding for visual distinction
- Click-to-inspect tile details (ID, region, area, coordinates)

### 2. **Real-Time 3D Globe Visualization**
- High-resolution satellite imagery (ESRI World Imagery / Google Earth Engine)
- Smooth camera controls (drag, zoom, rotate)
- Multiple view modes (3D, 2D, orthographic)
- WebGL-accelerated rendering
- Responsive to viewport changes

### 3. **Environmental Data Layers**
- **Mycelium Networks**: Visualize fungal intelligence networks
- **Heat Maps**: Temperature and thermal anomaly detection
- **Organisms**: iNaturalist biodiversity data integration
- **Weather**: Real-time meteorological data
- **Device Markers**: MycoBrain sensor locations and telemetry

### 4. **Google Earth Engine Integration**
- Satellite imagery processing
- Elevation data (SRTM)
- Land cover classification (ESA WorldCover)
- Vegetation indices (NDVI, MODIS)
- Custom dataset support

### 5. **MycoBrain Device Integration**
- Real-time sensor data visualization
- Device location mapping
- Telemetry overlays
- Environmental monitoring dashboards

### 6. **Scientific Analysis Tools**
- Viewport statistics
- Species observation counts
- Grid cell analysis
- Probability mapping
- Data aggregation

## 📐 Architecture

### Frontend Components
```
components/earth-simulator/
├── cesium-globe.tsx          # Main 3D globe renderer
├── earth-simulator-container.tsx  # Main container component
├── comprehensive-side-panel.tsx   # Data visualization panel
├── layer-controls.tsx         # Layer toggle controls
├── hud.tsx                    # Heads-up display overlay
├── controls.tsx               # Navigation controls
├── mycelium-layer.tsx         # Mycelium network visualization
├── heat-layer.tsx             # Thermal data layer
├── organism-layer.tsx         # Biodiversity markers
├── weather-layer.tsx          # Meteorological data
└── device-markers.tsx         # MycoBrain device locations
```

### API Endpoints
```
app/api/earth-simulator/
├── land-tiles/                # 24x24 grid system API
├── gee/                       # Google Earth Engine proxy
├── gee/tile/[type]/[z]/[x]/[y]/  # GEE tile proxy
├── grid/                      # Grid cell calculations
├── inaturalist/               # Biodiversity data
├── devices/                    # MycoBrain device data
├── layers/                     # Layer data aggregation
├── aggregate/                  # Data aggregation
├── mycelium-probability/       # Fungal network predictions
└── search/                     # Location search
```

### Core Libraries
- **CesiumJS**: 3D globe rendering engine
- **Google Earth Engine**: Satellite imagery and geospatial analysis
- **Next.js**: React framework with API routes
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Styling and responsive design

## 🎨 UI/UX Design Philosophy

### Scientific Clarity
- Clean, uncluttered interface
- Data-first visualization
- Color-coded regions for quick identification
- Real-time statistics and metrics

### Performance Optimization
- Viewport-based lazy loading
- Debounced viewport updates (500ms)
- Maximum tile limits (2000 per viewport)
- WebGL hardware acceleration

### User Experience
- Intuitive camera controls
- Contextual information panels
- Click-to-inspect interactions
- Responsive design (desktop, tablet, mobile)

### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Touch gesture support

## 🔧 Technical Specifications

### Performance Metrics
- **Initial Load**: < 3 seconds
- **Viewport Updates**: < 500ms
- **Tile Loading**: Max 2000 tiles per viewport
- **Memory Usage**: ~4MB per viewport (vs 150MB for full globe)
- **Frame Rate**: 60 FPS target

### Browser Requirements
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- WebGL 2.0 support required

### Memory Management
- Viewport-based tile loading
- Automatic tile cleanup on viewport change
- Debounced API calls
- Efficient entity management in Cesium

## 📊 Data Sources

### Primary Sources
- **ESRI World Imagery**: High-resolution satellite imagery
- **Google Earth Engine**: Advanced geospatial datasets
- **iNaturalist API**: Biodiversity observations
- **MycoBrain Devices**: Real-time sensor telemetry
- **MINDEX Database**: Mycelium network data

### Grid System Data
- **Total Land Tiles**: 75,168 (at 0.5° resolution)
- **Ocean Tiles**: Excluded automatically
- **Regions**: North America, South America, Europe, Africa, Asia, Australia, Antarctica, Greenland

## 🚧 Current Status

### ✅ Implemented
- [x] 24x24 land grid system with unique tile IDs
- [x] Viewport-based lazy loading
- [x] CesiumJS 3D globe integration
- [x] ESRI World Imagery support
- [x] Google Earth Engine tile proxy
- [x] Grid controls and statistics
- [x] Region-based color coding
- [x] Click-to-inspect tile details
- [x] Responsive UI components
- [x] Memory optimization

### 🚧 In Progress
- [ ] Full Google Earth Engine dataset integration
- [ ] Mycelium network visualization
- [ ] Real-time device telemetry overlays
- [ ] Weather data layer
- [ ] Heat map layer
- [ ] Organism markers from iNaturalist

### 📋 Planned Features
- [ ] Advanced filtering and search
- [ ] Data export capabilities
- [ ] Custom layer creation
- [ ] Collaborative annotations
- [ ] Time-series analysis
- [ ] Predictive modeling visualization
- [ ] Mobile app integration
- [ ] VR/AR support

## 🔮 Future Vision

### Short-Term (3-6 months)
- Complete all planned data layers
- Integrate full MycoBrain device network
- Implement advanced filtering
- Add data export features

### Medium-Term (6-12 months)
- Machine learning predictions overlay
- Real-time collaboration features
- Mobile application
- API for third-party integrations

### Long-Term (12+ months)
- VR/AR immersive experiences
- Global mycelium network AI predictions
- Climate change modeling
- Conservation impact tracking
- Scientific publication integration

## 🛠️ Development

### Getting Started
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Navigate to Earth Simulator
http://localhost:3002/apps/earth-simulator
```

### Environment Variables
```env
# Google Earth Engine (optional)
GEE_PROJECT_ID=your-project-id
GEE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY=your-private-key
GEE_CLIENT_ID=your-client-id
```

### Building for Production
```bash
npm run build
npm start
```

## 📚 Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [API Reference](./API.md)
- [UI/UX Design Guide](./UIUX.md)
- [Grid System Specification](./GRID_SYSTEM.md)
- [Performance Optimization](./PERFORMANCE.md)
- [Deployment Guide](./DEPLOYMENT.md)

## 🤝 Contributing

This is part of the Mycosoft NatureOS platform. For contributions:
1. Follow the existing code style
2. Add comprehensive tests
3. Update documentation
4. Submit pull requests for review

## 📄 License

Part of the Mycosoft platform. See main repository license.

## 🙏 Acknowledgments

- **CesiumJS**: 3D globe rendering
- **Google Earth Engine**: Geospatial data platform
- **ESRI**: Satellite imagery
- **iNaturalist**: Biodiversity data
- **Mycosoft Team**: Platform development

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: Active Development
