import type { HeatField, VisualDataState, VisualProvenance } from "@/lib/fusarium/sensing-visuals/contracts"
import { heatCells } from "@/lib/fusarium/sensing-visuals/transforms"
import { VisualFrame, sensingVisualStyles as styles } from "./visual-frame"

const color=(ratio:number)=>`hsl(${190-ratio*160} 82% ${25+ratio*35}%)`
export function HeatFieldVisual({ title, field, state = field.values.length ? "ready" : "idle", provenance, subtitle="Spatial intensity field" }: { title:string; field:HeatField; state?:VisualDataState; provenance?:VisualProvenance; subtitle?:string }) {
 const cells=heatCells(field); const cellWidth=600/field.width; const cellHeight=180/field.height
 return <VisualFrame title={title} subtitle={subtitle} state={state} unit={field.unit} provenance={provenance} legend={cells.length?<><span>low <b className={styles.value}>{Math.min(...field.values).toPrecision(4)}</b></span><span>high <b className={styles.value}>{Math.max(...field.values).toPrecision(4)}</b></span></>:null}><svg className={styles.svg} viewBox="0 0 600 180" role="img" aria-label={`${title} heat map`}>{cells.map(c=><rect key={`${c.x}-${c.y}`} x={c.x*cellWidth} y={c.y*cellHeight} width={cellWidth+.2} height={cellHeight+.2} fill={color(c.ratio)}><title>{c.value} {field.unit}</title></rect>)}</svg></VisualFrame>
}
