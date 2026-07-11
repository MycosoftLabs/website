// ═══════════════════════════════════════════════════════════════════════════
// Report document renderer — reusable, government-standard HTML → PDF
// ═══════════════════════════════════════════════════════════════════════════
//
// Renders a structured ReportDocument into a self-contained, print-ready HTML
// document with CUI banner markings, a cover page, table of contents, sections,
// a signature/affirmation block, and document control. Company-wide reusable —
// any subsystem (security, finance, ops) can build a ReportDocument and render.
// The client opens the HTML and prints to PDF (or a server-side headless print).

export interface ReportOrg {
  legalName: string;
  parent?: string;
  uei?: string;
  cage?: string;
  sao?: string; // Senior Affirming Official
  site?: string;
}

export interface ReportDocControl {
  number: string; // e.g. MYC-SEC-2026-0001
  date: string; // ISO or display
  version?: string;
  distribution?: string;
  preparedBy?: string;
}

export interface ReportSection {
  id: string;
  heading: string;
  /** Pre-rendered, trusted HTML body (built server-side from real data). */
  bodyHtml: string;
}

export interface ReportDocument {
  classification?: string | null; // 'CUI' | 'CUI//SP-CTI' | null
  title: string;
  subtitle?: string;
  org: ReportOrg;
  docControl: ReportDocControl;
  sections: ReportSection[];
  affirmation?: string; // signature-block statement
  generatedBy?: string; // e.g. "MYCA Reports Agent · Perplexity sonar-pro"
}

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Render a table from headers + rows (all values escaped). */
export function renderTable(headers: string[], rows: (string | number)[][]): string {
  return `<table class="rpt-table"><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

/** Render markdown-ish LLM prose (paragraphs, bullets, bold) into safe HTML. */
export function renderProse(text: string): string {
  const lines = String(text ?? '').split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { if (inList) { out.push('</ul>'); inList = false; } continue; }
    if (/^[-*•]\s+/.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(line.replace(/^[-*•]\s+/, ''))}</li>`);
    } else {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  if (inList) out.push('</ul>');
  return out.join('');
}

export function renderReportHtml(doc: ReportDocument): string {
  const cls = doc.classification?.trim();
  const banner = cls ? `<div class="cui-banner">${esc(cls)}</div>` : '';
  const toc = doc.sections
    .map((s, i) => `<li><span class="toc-n">${i + 1}.</span> ${esc(s.heading)}</li>`)
    .join('');
  const sections = doc.sections
    .map((s, i) => `<section id="${esc(s.id)}"><h2><span class="sec-n">${i + 1}.</span> ${esc(s.heading)}</h2>${s.bodyHtml}</section>`)
    .join('');
  const org = doc.org;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(doc.title)}</title>
<style>
  :root { --ink:#111; --muted:#555; --line:#d0d3d8; --accent:#6b21a8; --cui:#5a0000; }
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", Georgia, serif; color: var(--ink); margin: 0; font-size: 11pt; line-height: 1.45; }
  .page { padding: 0.9in 0.85in; max-width: 8.5in; margin: 0 auto; }
  .cui-banner { background: var(--cui); color: #fff; text-align: center; font-weight: 700; letter-spacing: 2px; padding: 4px 0; font-family: Arial, sans-serif; font-size: 10pt; position: sticky; top: 0; }
  .cover { min-height: 8.6in; display: flex; flex-direction: column; }
  .cover .seal { font-size: 40pt; }
  .cover h1 { font-size: 26pt; margin: 0.3in 0 0.1in; color: var(--accent); }
  .cover .sub { font-size: 14pt; color: var(--muted); }
  .cover .spacer { flex: 1; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; font-size: 10.5pt; border-top: 2px solid var(--accent); padding-top: 10px; }
  .meta-grid .k { color: var(--muted); }
  h2 { font-size: 14pt; color: var(--accent); border-bottom: 1px solid var(--line); padding-bottom: 4px; margin-top: 26px; }
  .sec-n, .toc-n { color: var(--accent); font-weight: 700; margin-right: 6px; }
  p { margin: 8px 0; }
  ul { margin: 6px 0 6px 18px; }
  .rpt-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9.5pt; font-family: Arial, sans-serif; }
  .rpt-table th { background: #f0e8f7; color: var(--accent); text-align: left; padding: 5px 7px; border: 1px solid var(--line); }
  .rpt-table td { padding: 4px 7px; border: 1px solid var(--line); vertical-align: top; }
  .toc { list-style: none; padding: 0; font-size: 11pt; }
  .toc li { padding: 3px 0; border-bottom: 1px dotted var(--line); }
  .callout { background: #f6f2fb; border-left: 3px solid var(--accent); padding: 8px 12px; margin: 10px 0; font-size: 10pt; }
  .sig { margin-top: 30px; border-top: 1px solid var(--line); padding-top: 14px; font-size: 10.5pt; }
  .sig .line { display: inline-block; width: 3in; border-bottom: 1px solid var(--ink); margin: 22px 0 4px; }
  .footer { color: var(--muted); font-size: 8.5pt; font-family: Arial, sans-serif; text-align: center; margin-top: 24px; border-top: 1px solid var(--line); padding-top: 6px; }
  @media print { .cover { min-height: 9.4in; } section { page-break-inside: auto; } h2 { page-break-after: avoid; } .no-print { display:none; } }
  .toolbar { position: sticky; top: 0; background: #1e1b2e; color:#fff; padding:8px 12px; font-family: Arial; font-size: 12px; display:flex; gap:10px; align-items:center; }
  .toolbar button { background: var(--accent); color:#fff; border:0; padding:6px 12px; border-radius:6px; cursor:pointer; }
</style></head>
<body>
  <div class="toolbar no-print">
    <strong>${esc(doc.title)}</strong>
    <span style="opacity:.7">${esc(doc.generatedBy ?? '')}</span>
    <button onclick="window.print()">Download / Print PDF</button>
  </div>
  ${banner}
  <div class="page">
    <div class="cover">
      <div class="seal">🛡️</div>
      <div style="font-family:Arial;font-size:11pt;letter-spacing:1px;color:var(--muted)">${esc(org.legalName)}</div>
      <h1>${esc(doc.title)}</h1>
      ${doc.subtitle ? `<div class="sub">${esc(doc.subtitle)}</div>` : ''}
      <div class="spacer"></div>
      <div class="meta-grid">
        ${org.uei ? `<div><span class="k">UEI:</span> ${esc(org.uei)}</div>` : ''}
        ${org.cage ? `<div><span class="k">CAGE:</span> ${esc(org.cage)}</div>` : ''}
        ${org.sao ? `<div><span class="k">Senior Affirming Official:</span> ${esc(org.sao)}</div>` : ''}
        ${org.site ? `<div><span class="k">Site:</span> ${esc(org.site)}</div>` : ''}
        <div><span class="k">Document №:</span> ${esc(doc.docControl.number)}</div>
        <div><span class="k">Date:</span> ${esc(doc.docControl.date)}</div>
        ${doc.docControl.version ? `<div><span class="k">Version:</span> ${esc(doc.docControl.version)}</div>` : ''}
        ${doc.docControl.preparedBy ? `<div><span class="k">Prepared by:</span> ${esc(doc.docControl.preparedBy)}</div>` : ''}
        ${doc.docControl.distribution ? `<div style="grid-column:1/3"><span class="k">Distribution:</span> ${esc(doc.docControl.distribution)}</div>` : ''}
      </div>
    </div>

    <h2><span class="sec-n">§</span> Table of Contents</h2>
    <ol class="toc" style="list-style:none">${toc}</ol>

    ${sections}

    ${doc.affirmation ? `<div class="sig"><strong>Affirmation.</strong> ${esc(doc.affirmation)}
      <div><span class="line"></span><br>${esc(org.sao ?? '')}, Senior Affirming Official — ${esc(org.legalName)}</div>
    </div>` : ''}

    <div class="footer">
      ${esc(org.legalName)} · ${esc(doc.docControl.number)} · Generated ${esc(doc.docControl.date)} · ${esc(doc.generatedBy ?? 'MYCA Reports Agent')}
      ${cls ? `<br>${esc(cls)} — handle per 32 CFR Part 2002 / DFARS 252.204-7012` : ''}
    </div>
  </div>
  ${banner}
</body></html>`;
}
