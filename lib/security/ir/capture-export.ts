// Client-side export helpers for the IR.L2-3.6.3 HITL tabletop capture.
//
// The generated PDF/markdown is the operator's SESSION RECORD — a working copy
// of what was said in the room. It is deliberately NOT the signed evidence
// artifact: the capture goes to Cursor, is merged into the AAR, signed through
// DocuSign, hashed, and only then registered as EV-IR-001.
//
// The PDF is written by hand (no dependency, nothing fetched — the site's CSP
// blocks external hosts anyway). Everything is coerced to ASCII first so that
// string length === byte length, which is what keeps the xref byte offsets
// valid; a mismatch there is what makes hand-rolled PDFs fail to open.

/** Coerce to printable ASCII so byte offsets in the xref table stay correct. */
export function asciify(s: string): string {
  return String(s)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[·•]/g, '-')
    .replace(/→/g, '->')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/[^\x20-\x7E]/g, '');
}

const pesc = (s: string) => s.replace(/[\\()]/g, (c) => '\\' + c);

function wrapAt(s: string, n: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (let w of s.split(/\s+/)) {
    while (w.length > n) {
      if (cur) { out.push(cur); cur = ''; }
      out.push(w.slice(0, n));
      w = w.slice(n);
    }
    if (!w) continue;
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= n) cur += ' ' + w;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}

interface Line { t: string; size: number; bold: boolean; gap: number }

/** Render the capture markdown to a single-file PDF blob. */
export function captureToPdf(md: string): Blob {
  const ML = 54, TOP = 738, BOT = 54, BASE = 10, COLS = 95;
  const items: Line[] = [];

  for (const raw of md.split('\n')) {
    let line = asciify(raw);
    if (/^\|[\s\-|:]+\|$/.test(line.trim())) continue; // table separator row
    let bold = false, size = BASE, gap = 0;
    if (line.startsWith('## ')) { line = line.slice(3); bold = true; size = 12; gap = 9; }
    else if (line.startsWith('# ')) { line = line.slice(2); bold = true; size = 14; gap = 2; }
    else if (line.startsWith('> ')) { line = '    ' + line.slice(2); }
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      line = line.trim().slice(1, -1).split('|').map((c) => c.trim()).join('   |   ');
    }
    if (/^\*\*[^*]+\*\*:?\s*$/.test(line.trim())) bold = true;
    line = line.replace(/\*\*/g, '').replace(/`/g, '');
    if (!line.trim()) { items.push({ t: '', size: BASE, bold: false, gap: 0 }); continue; }
    const indent = (line.match(/^\s*/) || [''])[0];
    wrapAt(line.trim(), Math.floor((COLS * BASE) / size)).forEach((l, i) =>
      items.push({ t: (i === 0 ? indent : indent + '  ') + l, size, bold, gap: i === 0 ? gap : 0 }));
  }

  const pages: Array<Array<Line & { y: number }>> = [];
  let cur: Array<Line & { y: number }> = [];
  let y = TOP;
  for (const it of items) {
    const adv = it.size * 1.32 + it.gap;
    if (y - adv < BOT) { pages.push(cur); cur = []; y = TOP; }
    y -= adv;
    cur.push({ ...it, y });
  }
  pages.push(cur);

  const n = pages.length;
  const pid: number[] = [], cid: number[] = [];
  for (let i = 0; i < n; i++) { pid.push(5 + i * 2); cid.push(6 + i * 2); }

  const objs: string[] = [];
  objs[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[1] = `<< /Type /Pages /Kids [${pid.map((i) => i + ' 0 R').join(' ')}] /Count ${n} >>`;
  objs[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  pages.forEach((pg, i) => {
    const body = pg.filter((it) => it.t !== '').map((it) =>
      `/${it.bold ? 'F2' : 'F1'} ${it.size} Tf 1 0 0 1 ${ML} ${it.y.toFixed(1)} Tm (${pesc(it.t)}) Tj`).join('\n');
    const stream = `BT\n${body}\nET`;
    objs[pid[i] - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cid[i]} 0 R >>`;
    objs[cid[i] - 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = '%PDF-1.4\n';
  const off: number[] = [];
  objs.forEach((o, i) => { off[i] = pdf.length; pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  objs.forEach((_, i) => { pdf += String(off[i]).padStart(10, '0') + ' 00000 n \n'; });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

/** Minimal markdown -> print-friendly HTML for the printable view. */
export function captureToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inl = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const out: string[] = [];
  let tbl = false;
  const closeTbl = () => { if (tbl) { out.push('</table>'); tbl = false; } };
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    if (/^\|[\s\-|:]+\|$/.test(line.trim())) continue;
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (!tbl) { out.push('<table class="kv">'); tbl = true; }
      out.push('<tr>' + line.trim().slice(1, -1).split('|').map((c) => `<td>${inl(c.trim())}</td>`).join('') + '</tr>');
      continue;
    }
    closeTbl();
    if (!line.trim()) continue;
    if (line.startsWith('## ')) out.push(`<h2>${inl(line.slice(3))}</h2>`);
    else if (line.startsWith('# ')) out.push(`<h1>${inl(line.slice(2))}</h1>`);
    else if (line.startsWith('> ')) out.push(`<div class="cls">${inl(line.slice(2))}</div>`);
    else if (/^\d+\.\s/.test(line.trim())) out.push(`<div class="q">${inl(line.trim())}</div>`);
    else if (/^-\s/.test(line.trim())) out.push(`<div class="a">${inl(line.trim().replace(/^-\s/, ''))}</div>`);
    else out.push(`<p>${inl(line.trim())}</p>`);
  }
  closeTbl();
  return out.join('\n');
}

const PRINT_CSS =
  '@page{size:letter;margin:.75in}' +
  'body{font:10.5pt/1.45 Georgia,"Times New Roman",serif;color:#000;background:#fff;max-width:7in;margin:24px auto;padding:0 16px}' +
  'h1{font-size:15pt;margin:0 0 2pt}h2{font-size:12pt;margin:14pt 0 4pt;border-bottom:1px solid #999;padding-bottom:2pt}' +
  'table.kv{border-collapse:collapse;width:100%;margin:6pt 0}table.kv td{border:1px solid #bbb;padding:3pt 6pt;vertical-align:top}' +
  'table.kv td:first-child{width:32%;font-weight:700}.q{margin:7pt 0 0}.a{margin:1pt 0 0 16pt}' +
  '.cls{font-size:9pt;border:1px solid #000;padding:4pt 6pt;margin:6pt 0}' +
  'code{font-family:ui-monospace,Consolas,monospace;font-size:9.5pt}@media print{.hint{display:none}}';

/** Trigger a download. Returns false when the browser blocks it. */
export function download(blob: Blob, name: string): boolean {
  try {
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 8000);
    return true;
  } catch { return false; }
}

/** Open the capture in a standalone tab where Ctrl+P reliably works. */
export function openPrintable(md: string, title: string): boolean {
  const html =
    `<!doctype html><meta charset="utf-8"><title>${title}</title><style>${PRINT_CSS}</style>` +
    '<p class="hint" style="font:12px system-ui;background:#fffbe6;border:1px solid #e0c060;padding:8px 10px">' +
    'Press <b>Ctrl+P</b> (Cmd+P) and choose <b>Save as PDF</b>. This is the session record, not the signed evidence artifact.</p>' +
    captureToHtml(md);
  try {
    const w = window.open('', '_blank');
    if (w && w.document) { w.document.write(html); w.document.close(); return true; }
  } catch { /* fall through */ }
  try {
    const u = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    return !!window.open(u, '_blank');
  } catch { return false; }
}

export async function copyText(text: string, el?: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through to legacy path */ }
  try {
    if (!el) return false;
    el.focus(); el.select(); el.setSelectionRange(0, el.value.length);
    return document.execCommand('copy');
  } catch { return false; }
}
