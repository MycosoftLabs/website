export type ITDXContext={schema:'itdx-session/v1';sessionId:string|null;runId:string|null;datasetId:string|null;documentId:string|null;dataOrigin:string;revision:number};
export type ITDXPatch=Partial<Pick<ITDXContext,'runId'|'datasetId'|'documentId'|'dataOrigin'>>;
export interface ITDXAdapter {appId:string;onContext:(context:ITDXContext)=>void}
export function createSession(options?:{emit?:(context:ITDXContext)=>void;newId?:()=>string}):{empty:ITDXContext;get:()=>ITDXContext;subscribe:(fn:()=>void)=>()=>void;select:(patch:ITDXPatch)=>void;register:(adapter:ITDXAdapter)=>()=>void;registered:()=>string[]};
