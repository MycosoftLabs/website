import type {Map,LayerSpecification} from 'maplibre-gl';
export const SOURCE_ID:string;
export const LAYERS:LayerSpecification[];
export interface ReplayLayerController {update(index:number):void;setFusion(byAssetId:Record<string,unknown>):void;setLayers(layers:Partial<Record<'assets'|'tracks'|'uncertainty'|'boundary'|'corridor',boolean>>):void;focus():void;focusAsset(id:string):void;dispose():void}
export function attachReplay(map:Map,handlers?:{onSelect?:(id:string)=>void;onStatus?:(status:string)=>void}):ReplayLayerController;
