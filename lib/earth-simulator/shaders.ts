/**
 * Custom Shaders for Earth Simulator
 * 
 * GLSL shaders for rendering layers, heat maps, and mycelium density.
 */

export const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const myceliumFragmentShader = `
  uniform float probability;
  uniform float opacity;
  uniform vec3 highColor;
  uniform vec3 lowColor;
  uniform vec3 noDataColor;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    vec3 color;
    
    if (probability < 0.01) {
      // No data
      color = noDataColor;
    } else if (probability < 0.25) {
      // Low density - green
      color = mix(noDataColor, lowColor, probability * 4.0);
    } else if (probability < 0.75) {
      // Medium density - yellow
      float t = (probability - 0.25) / 0.5;
      color = mix(lowColor, vec3(1.0, 0.8, 0.0), t);
    } else {
      // High density - red/orange
      float t = (probability - 0.75) / 0.25;
      color = mix(vec3(1.0, 0.8, 0.0), highColor, t);
    }
    
    gl_FragColor = vec4(color, opacity);
  }
`;

export const heatMapFragmentShader = `
  uniform float temperature;
  uniform float minTemp;
  uniform float maxTemp;
  uniform float opacity;
  
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    // Normalize temperature to 0-1
    float t = (temperature - minTemp) / (maxTemp - minTemp);
    t = clamp(t, 0.0, 1.0);
    
    // Color gradient: blue (cold) -> green -> yellow -> red (hot)
    vec3 color;
    if (t < 0.33) {
      // Blue to green
      float localT = t / 0.33;
      color = mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0), localT);
    } else if (t < 0.66) {
      // Green to yellow
      float localT = (t - 0.33) / 0.33;
      color = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0), localT);
    } else {
      // Yellow to red
      float localT = (t - 0.66) / 0.34;
      color = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), localT);
    }
    
    gl_FragColor = vec4(color, opacity);
  }
`;

export const gridFragmentShader = `
  uniform vec3 gridColor;
  uniform float gridOpacity;
  uniform float gridSize;
  
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    // Create grid lines
    vec2 grid = abs(fract(vUv * gridSize - 0.5));
    float gridLine = smoothstep(0.0, 0.02, min(grid.x, grid.y));
    
    vec3 color = mix(gridColor, vec3(0.0), gridLine);
    gl_FragColor = vec4(color, gridOpacity * (1.0 - gridLine));
  }
`;

export const organismFragmentShader = `
  uniform vec3 organismColor;
  uniform float size;
  uniform float opacity;
  
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    // Draw circular marker
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center);
    float circle = smoothstep(size, size - 0.1, dist);
    
    vec3 color = organismColor;
    gl_FragColor = vec4(color, opacity * circle);
  }
`;
