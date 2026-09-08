export const GATEWAY_BASE:string;
export function allowedPath(parts:string[],method:string):string|null;
export function rewriteAsset(text:string):string;
export function limitedBody(response:Response,limit?:number):Promise<Uint8Array>;
