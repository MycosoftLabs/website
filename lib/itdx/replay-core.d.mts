import type {FeatureCollection} from 'geojson';
export interface ReplayAsset {
 id:string;label:string;kind:string;color:string;fault:string;path:number[][];
 position:number[]|null;observed_at:string|null;age_seconds:number|null;
 current_position_status:string;latest_error_at_observation_m:number|null;nominal_radius_m:number;
 received_reports:number;valid_reports:number;missing_reports:number;coverage_count:number;
 empirical_coverage:number|null;rmse_m:number|null;assumption_status:string;
 probability_data_true:number|null;probability_deception:number|null;
 p_truth?:number|null;p_unsupported?:number|null;p_truth_pct?:string;p_unsupported_pct?:string;
 halo_color?:string;data_quality?:string;quality_flags?:string[];deception_status?:string;
 circle_hold?:boolean|null;corridor_hold?:boolean|null;boundary_hold?:boolean|null;
 haversine_error_m?:number|null;truth_fusion?:Record<string,any>;
}
export interface ReplaySnapshot {
 schema:string;data_origin:'SYNTHETIC_EXERCISE';execution_mode:string;index:number;replay_time:string;
 assets:ReplayAsset[];model:{sigma_m:number;nominal_coverage:number;radius_m:number;formula:string;empirical_formula:string;boundary:string;ao_place:string;ao_origin:number[];ao_geocode_source:string};geojson:FeatureCollection;
}
export const REPLAY_SCHEMA:string,STEP_SECONDS:number,SAMPLE_COUNT:number,EARTH_RADIUS_M:number,NOMINAL_COVERAGE:number,SIGMA_M:number,RADIUS_M:number,START_UTC:string;
export const AO_PLACE:string,AO_ORIGIN_LNG:number,AO_ORIGIN_LAT:number,AO_GEOCODE_SOURCE:string;
export const BOUNDS:number[][];
export const ASSETS:Pick<ReplayAsset,'id'|'label'|'kind'|'color'|'fault'|'path'>[];
export function snapshot(index?:number):ReplaySnapshot;
export function allMeasurements():{schema:string;data_origin:string;records:Record<string,unknown>[]};
export function distanceM(a:number[],b:number[]):number;
export function toLngLat(x:number,y:number):number[];
export function truthAt(asset:typeof ASSETS[number],index:number):number[];
export function circle(center:number[],radius:number):number[][];
