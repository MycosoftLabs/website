import type {Map,LayerSpecification} from 'maplibre-gl';
export const SOURCE_ID:string;
export const LAYERS:LayerSpecification[];
export interface ReplayLayerController {update(index:number):void;focus():void;dispose():void}
export function attachReplay(map:Map,handlers?:{onSelect?:(id:string)=>void;onStatus?:(status:string)=>void}):ReplayLayerController;
