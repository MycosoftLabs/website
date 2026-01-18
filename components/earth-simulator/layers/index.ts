/**
 * Earth Simulator Layers Index
 * 
 * Exports all visualization layer components for the Earth Simulator
 */

// deck.gl layer utilities and data generators
export * from "./deckgl-layers"

// Biodiversity layer (GBIF, eBird, OBIS, iNaturalist)
export { BiodiversityLayer, default as BiodiversityLayerDefault } from "./biodiversity-layer"
export type { BiodiversityLayerProps, BiodiversitySource } from "./biodiversity-layer"

// Air Quality layer (OpenAQ)
export { AirQualityLayer, default as AirQualityLayerDefault } from "./air-quality-layer"
export type { AirQualityLayerProps } from "./air-quality-layer"
