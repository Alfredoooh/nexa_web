// src/pages/ChatPage.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import InstallPrompt from '../components/InstallPrompt';
import Drawer from '../components/Drawer';
import {
  Conversation, Message,
  apiListConversations, apiCreateConversation,
  apiUpdateConversation, apiGenerateTitle, apiChatStream,
  apiDeleteConversation, apiPinConversation, apiArchiveConversation,
} from '../lib/api';
import { getToken, getStoredUser } from '../lib/auth';

// ─── Greeting ────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ─── LaTeX / unicode cleaner ─────────────────────────────────────────────────
function cleanLatex(text: string): string {
  return text
    .replace(/\$\$([^$]+)\$\$/g, '$1')
    .replace(/\$([^$\n]+)\$/g, '$1')
    .replace(/\\\((.+?)\\\)/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sqrt\s+(\S+)/g, '√$1')
    .replace(/\\pm/g, '±').replace(/\\mp/g, '∓')
    .replace(/\\times/g, '×').replace(/\\cdot/g, '·').replace(/\\div/g, '÷')
    .replace(/\\leq/g, '≤').replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠').replace(/\\approx/g, '≈')
    .replace(/\\infty/g, '∞').replace(/\\partial/g, '∂')
    .replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β').replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ').replace(/\\Delta/g, 'Δ').replace(/\\epsilon/g, 'ε')
    .replace(/\\pi/g, 'π').replace(/\\theta/g, 'θ').replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ').replace(/\\sigma/g, 'σ').replace(/\\Sigma/g, 'Σ')
    .replace(/\\omega/g, 'Ω').replace(/\\phi/g, 'φ').replace(/\\psi/g, 'ψ')
    .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>')
    .replace(/\^([0-9+\-a-zA-Z])/g, '<sup>$1</sup>')
    .replace(/_\{([^}]+)\}/g, (_, s) => toSubscript(s))
    .replace(/_([0-9])/g, (_, d) => subDigit(d))
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '');
}

function toSubscript(s: string): string {
  const map: Record<string, string> = {
    '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',
    '+':'₊','-':'₋','a':'ₐ','e':'ₑ','i':'ᵢ','o':'ₒ','u':'ᵤ','n':'ₙ',
  };
  return s.split('').map(c => map[c] ?? c).join('');
}
function subDigit(d: string): string { return toSubscript(d); }

// ─── Inline markdown → React nodes ───────────────────────────────────────────
function parseInline(text: string): React.ReactNode[] {
  const cleaned = cleanLatex(text);
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|`(.+?)`|<sup>(.+?)<\/sup>)/g;
  let last = 0; let match: RegExpExecArray | null; let key = 0;
  while ((match = pattern.exec(cleaned)) !== null) {
    if (match.index > last) parts.push(cleaned.slice(last, match.index));
    if (match[2]) parts.push(<strong key={key++}>{match[2]}</strong>);
    else if (match[3]) parts.push(<strong key={key++}>{match[3]}</strong>);
    else if (match[4]) parts.push(<em key={key++}>{match[4]}</em>);
    else if (match[5]) parts.push(<code key={key++} style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.06)', borderRadius: 4, padding: '1px 5px', fontSize: 13 }}>{match[5]}</code>);
    else if (match[6]) parts.push(<sup key={key++} style={{ fontSize: '0.65em' }}>{match[6]}</sup>);
    last = match.index + match[0].length;
  }
  if (last < cleaned.length) parts.push(cleaned.slice(last));
  return parts;
}

// ─── Widget HTML — fiel aos ficheiros originais dos widgets ──────────────────
function getWidgetHtml(type: string, jsonStr: string, isDark: boolean): string {
  try { JSON.parse(jsonStr); } catch { jsonStr = '{}'; }
  const cls = isDark ? 'dark' : '';
  switch (type) {
    case 'widget_bar':     return barChartHtml(jsonStr, cls);
    case 'widget_pie':     return pieChartHtml(jsonStr, cls);
    case 'widget_table':   return tableHtml(jsonStr, isDark);
    case 'widget_code':    return codeHtml(jsonStr, isDark);
    case 'widget_timer':   return timerHtml(jsonStr, cls);
    case 'widget_graph':   return mathGraphHtml(jsonStr, cls);
    case 'widget_mindmap': return mindmapHtml(jsonStr, cls);
    case 'widget_market':  return marketHtml(jsonStr);
    case 'widget_map':     return mapHtml(jsonStr);
    case 'widget_calendar':return calendarHtml(jsonStr, cls);
    case 'widget_sheet':   return sheetHtml(jsonStr, isDark);
    default: return `<body>${jsonStr}</body>`;
  }
}

// ── BAR CHART (fiel ao bar_chart.html) ───────────────────────────────────────
function barChartHtml(jsonStr: string, cls: string): string {
  const data = JSON.parse(jsonStr);
  const items = (data.items || []) as { label: string; value: number; color?: string }[];
  const COLORS = ['#6F5AF6','#e74c3c','#27ae60','#f39c12','#3b82f6','#10b981','#ec4899','#8b5cf6','#f59e0b','#2f80ed'];
  const max = Math.max(...items.map(i => i.value), 1);
  const barsHtml = items.map((item, i) => {
    const pct = (item.value / max) * 100;
    const color = item.color || COLORS[i % COLORS.length];
    return `<div class="item">
      <div class="value">${item.value}${(item as any).unit||''}</div>
      <div class="bar-wrap"><div class="bar" style="--h:${pct}%;background:${color};animation-delay:${i*70}ms"></div></div>
      <div class="label">${item.label}</div>
    </div>`;
  }).join('');
  const legendHtml = items.map((item, i) => {
    const color = item.color || COLORS[i % COLORS.length];
    return `<span class="legend-item"><span class="color-dot" style="background:${color}"></span>${item.label} (${item.value})</span>`;
  }).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:${cls==='dark'?'#121212':'#f4f4f4'};font-family:'Segoe UI',Roboto,system-ui,sans-serif;padding:24px;}
.chart-container{width:min(100%,500px);display:flex;flex-direction:column;align-items:center;gap:14px;}
.title{font-size:14px;font-weight:700;color:${cls==='dark'?'#eee':'#222'};}
.chart{width:100%;display:flex;align-items:flex-end;gap:10px;height:220px;padding:20px 14px;border-radius:14px;}
.item{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;}
.value{font-size:12px;font-weight:700;margin-bottom:8px;color:${cls==='dark'?'#eee':'#333'};}
.bar-wrap{width:100%;height:150px;display:flex;align-items:flex-end;justify-content:center;}
.bar{width:100%;max-width:48px;height:var(--h);border-radius:8px 8px 0 0;transform-origin:bottom;animation:grow 700ms ease-out forwards;transform:scaleY(0);box-shadow:0 4px 14px rgba(111,90,246,0.25);}
.bar:hover{box-shadow:0 6px 20px rgba(111,90,246,0.40);}
.label{margin-top:10px;font-size:11px;font-weight:500;color:${cls==='dark'?'#aaa':'#666'};text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}
@keyframes grow{to{transform:scaleY(1);}}
.legend{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;font-size:13px;font-weight:500;color:${cls==='dark'?'#ccc':'#444'};}
.legend-item{display:flex;align-items:center;gap:6px;}
.color-dot{width:12px;height:12px;border-radius:4px;display:inline-block;}
</style></head><body class="${cls}">
<div class="chart-container">
${data.title?`<div class="title">${data.title}</div>`:''}
<div class="chart">${barsHtml}</div>
<div class="legend">${legendHtml}</div>
</div>
</body></html>`;
}

// ── PIE CHART (fiel ao pie_chart.html) ───────────────────────────────────────
function pieChartHtml(jsonStr: string, cls: string): string {
  const data = JSON.parse(jsonStr);
  const slices = (data.slices || []) as { label: string; value: number; color?: string }[];
  const COLORS = ['#2f80ed','#e74c3c','#27ae60','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e','#c0392b','#2980b9'];
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let startAngle = -Math.PI / 2;
  const paths = slices.map((s, i) => {
    const color = s.color || COLORS[i % COLORS.length];
    const sweep = (s.value / total) * 2 * Math.PI;
    const end = startAngle + sweep;
    const x1 = 140 * Math.cos(startAngle); const y1 = 140 * Math.sin(startAngle);
    const x2 = 140 * Math.cos(end); const y2 = 140 * Math.sin(end);
    const large = sweep > Math.PI ? 1 : 0;
    const mid = startAngle + sweep / 2;
    const tx = 85 * Math.cos(mid); const ty = 85 * Math.sin(mid);
    const pct = ((s.value / total) * 100).toFixed(1) + '%';
    const p = `<path fill="${color}" stroke="transparent" class="slice" d="M0,0 L${x1},${y1} A140,140 0 ${large},1 ${x2},${y2} Z"/>
    <text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="12" font-weight="700" class="percentage-text" style="pointer-events:none">${pct}</text>`;
    startAngle = end;
    return p;
  }).join('');
  const legendHtml = slices.map((s, i) => {
    const color = s.color || COLORS[i % COLORS.length];
    return `<span class="legend-item"><span class="color-dot" style="background:${color}"></span>${s.label} (${s.value})</span>`;
  }).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:${cls==='dark'?'#121212':'#f4f4f4'};font-family:system-ui,sans-serif;padding:24px;}
.chart-container{width:min(100%,480px);display:flex;flex-direction:column;align-items:center;gap:16px;}
.title{font-size:14px;font-weight:700;color:${cls==='dark'?'#eee':'#222'};}
svg{width:100%;height:auto;background:transparent;}
.slice{transition:transform 0.3s ease,opacity 0.3s ease;cursor:pointer;transform-origin:50% 50%;}
.slice:hover{opacity:.85;transform:scale(1.04);}
.legend{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;font-size:14px;font-weight:500;color:${cls==='dark'?'#eee':'#333'};}
.legend-item{display:flex;align-items:center;gap:6px;}
.color-dot{width:12px;height:12px;border-radius:4px;display:inline-block;}
</style></head><body class="${cls}">
<div class="chart-container">
${data.title?`<div class="title">${data.title}</div>`:''}
<svg viewBox="-200 -200 400 400" aria-label="Gráfico de pizza">
  <g>${paths}</g>
</svg>
<div class="legend">${legendHtml}</div>
</div>
</body></html>`;
}

// ── TABLE (fiel ao table_dark / table_light) ──────────────────────────────────
function tableHtml(jsonStr: string, isDark: boolean): string {
  const data = JSON.parse(jsonStr);
  const headers = (data.headers || []) as string[];
  const rows = (data.rows || []) as string[][];
  const aligns = (data.align || []) as string[];
  const bg = isDark ? '#1b1b1b' : '#ffffff';
  const headerBg = isDark ? '#252525' : '#f2f2f2';
  const border = isDark ? '#4a4a4a' : '#bdbdbd';
  const text = isDark ? '#f4f4f4' : '#222222';
  const bodybg = isDark ? '#121212' : '#f3f3f3';
  const headersHtml = headers.map((h, i) => `<th style="text-align:${aligns[i]||'left'}">${h}</th>`).join('');
  const rowsHtml = rows.map(row =>
    `<tr>${row.map((c, i) => `<td style="text-align:${aligns[i]||'left'}">${c}</td>`).join('')}</tr>`
  ).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:${bodybg};padding:16px;font-family:Georgia,"Times New Roman",serif;color:${text};}
.table-wrap{width:min(100%,560px);border:1.2px solid ${border};background:${bg};overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;}
table{width:100%;min-width:520px;border-collapse:collapse;table-layout:auto;background:${bg};}
th,td{border:1.2px solid ${border};padding:10px 12px;text-align:left;font-size:16px;line-height:1.2;color:${text};background:${bg};white-space:nowrap;}
th{background:${headerBg};font-weight:700;}
.center{text-align:center;}
</style></head><body>
<div class="table-wrap"><table>
${headers.length?`<thead><tr>${headersHtml}</tr></thead>`:''}
<tbody>${rowsHtml}</tbody>
</table></div>
</body></html>`;
}

// ── CODE BLOCK (fiel ao code_block_dark / light) ──────────────────────────────
function codeHtml(jsonStr: string, isDark: boolean): string {
  const data = JSON.parse(jsonStr);
  const lang = (data.language || 'CODE').toUpperCase();
  const code = (data.code || '') as string;
  const bg = isDark ? '#1b1b1b' : '#ffffff';
  const headerBg = isDark ? '#2a2a2a' : '#f0f0f0';
  const border = isDark ? '#2f2f2f' : '#d7d7d7';
  const borderHeader = isDark ? '#3a3a3a' : '#dedede';
  const text = isDark ? '#e8e8e8' : '#222222';
  const lineNum = isDark ? '#7d7d7d' : '#8a8a8a';
  const titleColor = isDark ? '#f2f2f2' : '#2a2a2a';
  const copyBtnBg = isDark ? '#353535' : '#ffffff';
  const copyBtnBorder = isDark ? '#4a4a4a' : '#cfcfcf';
  const lines = code.split('\n');
  const linesHtml = lines.map((line, idx) => {
    const safe = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<span class="line" data-n="${idx+1}">${safe||' '}</span>`;
  }).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:${isDark?'#121212':'#f3f3f3'};padding:24px;font-family:Arial,sans-serif;}
.code-widget{width:min(100%,760px);background:${bg};border:1.5px solid ${border};border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,${isDark?'0.18':'0.05'});}
.code-header{height:42px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 12px 0 14px;background:${headerBg};border-bottom:1px solid ${borderHeader};}
.code-title{font-size:13px;font-weight:700;color:${titleColor};letter-spacing:.2px;text-transform:uppercase;}
.copy-btn{width:30px;height:30px;border:1px solid ${copyBtnBorder};background:${copyBtnBg};border-radius:10px;display:grid;place-items:center;cursor:pointer;padding:0;transition:.2s;color:${titleColor};flex:0 0 auto;}
.copy-btn:hover{background:${isDark?'#404040':'#f3f3f3'};}
.copy-btn svg{width:16px;height:16px;display:block;}
.copy-feedback{position:absolute;top:48px;right:14px;background:rgba(20,20,20,0.92);color:#fff;font-size:12px;padding:6px 10px;border-radius:999px;opacity:0;transform:translateY(-4px);transition:.2s;pointer-events:none;}
.copy-feedback.show{opacity:1;transform:translateY(0);}
.code-body{background:${bg};overflow-x:auto;-webkit-overflow-scrolling:touch;}
pre{margin:0;padding:16px 16px 16px 52px;color:${text};font-size:14px;line-height:1.7;white-space:pre;min-width:100%;font-family:Consolas,Monaco,"Courier New",monospace;counter-reset:line;}
code{display:block;}
.line{display:block;position:relative;padding-left:8px;}
.line::before{counter-increment:line;content:counter(line);position:absolute;left:-38px;width:28px;text-align:right;color:${lineNum};user-select:none;}
</style></head><body>
<div style="position:relative;width:min(100%,760px)">
<div class="code-widget">
  <div class="code-header">
    <div class="code-title">${lang}</div>
    <button class="copy-btn" id="copyBtn" title="Copiar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>
  </div>
  <div class="copy-feedback" id="feedback">Copiado</div>
  <div class="code-body"><pre><code>${linesHtml}</code></pre></div>
</div>
</div>
<script>
const plainCode=${JSON.stringify(code)};
const copyBtn=document.getElementById('copyBtn');
const feedback=document.getElementById('feedback');
copyBtn.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(plainCode);feedback.textContent='Copiado';}
  catch{feedback.textContent='Erro';}
  feedback.classList.add('show');
  setTimeout(()=>feedback.classList.remove('show'),1000);
});
<\/script>
</body></html>`;
}

// ── TIMER ─────────────────────────────────────────────────────────────────────
function timerHtml(jsonStr: string, cls: string): string {
  const data = JSON.parse(jsonStr);
  const ms = data.milliseconds || 0;
  const countdown = !!data.countdown;
  const label = data.label || '';
  const bg = cls === 'dark' ? '#121212' : '#f4f4f4';
  const cardBg = cls === 'dark' ? '#1b1b1b' : '#fff';
  const textColor = cls === 'dark' ? '#eee' : '#222';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:${bg};display:grid;place-items:center;min-height:100vh;font-family:'SF Mono','Fira Code',Consolas,monospace;padding:20px;}
.card{background:${cardBg};border-radius:24px;box-shadow:0 12px 30px rgba(0,0,0,0.15);padding:24px 32px;display:flex;flex-direction:column;align-items:center;gap:16px;}
.label{font-size:13px;color:${cls==='dark'?'#888':'#666'};}
.display{font-size:clamp(2rem,7vw,3rem);font-weight:800;color:${textColor};letter-spacing:2px;}
.btns{display:flex;gap:10px;}
.btn{width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;background:#3B82F6;color:#fff;font-size:18px;}
</style></head><body>
<div class="card">
${label?`<div class="label">${label}</div>`:''}
<div class="display" id="d">00:00:00:00</div>
<div class="btns">
  <button class="btn" onclick="toggle()">▶</button>
  <button class="btn" onclick="reset()">↺</button>
</div>
</div>
<script>
let startMs=${countdown&&ms>0?ms:0};let elapsed=${countdown&&ms>0?ms:0};
let startTime=0,running=false,raf=null,isCountdown=${countdown&&ms>0};
function fmt(ms){const cs=Math.floor(ms/10)%100,s=Math.floor(ms/1000)%60,m=Math.floor(ms/60000)%60,h=Math.floor(ms/3600000);return[h,m,s,cs].map(x=>String(x).padStart(2,'0')).join(':');}
function tick(){const now=performance.now();if(isCountdown){elapsed=Math.max(0,startMs-(now-startTime));if(elapsed===0)running=false;}else{elapsed=startMs+(now-startTime);}document.getElementById('d').textContent=fmt(elapsed);if(running)raf=requestAnimationFrame(tick);}
function toggle(){if(running){running=false;cancelAnimationFrame(raf);startMs=elapsed;}else{running=true;startTime=performance.now();tick();}}
function reset(){running=false;cancelAnimationFrame(raf);elapsed=${countdown&&ms>0?ms:0};startMs=elapsed;document.getElementById('d').textContent=fmt(elapsed);}
${data.autoStart!==false?'toggle();':''}
<\/script>
</body></html>`;
}

// ── MATH GRAPH (fiel ao math_graph.html) ──────────────────────────────────────
function mathGraphHtml(jsonStr: string, cls: string): string {
  const data = JSON.parse(jsonStr);
  const expr = data.expression || 'sin(x)';
  const xMin = data.xMin ?? -10;
  const xMax = data.xMax ?? 10;
  const title = data.title || '';
  const isDark = cls === 'dark';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.8.0/math.min.js"><\/script>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
:root{--bg:${isDark?'#121212':'#f4f4f4'};--text:${isDark?'#eee':'#222'};--muted:${isDark?'#999':'#666'};--grid:${isDark?'#2a2a2a':'#e0e0e0'};--axis:${isDark?'#ccc':'#555'};--tick:${isDark?'#aaa':'#888'};}
body{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg);font-family:Arial,sans-serif;color:var(--text);padding:16px;gap:10px;}
.title{font-size:14px;font-weight:700;color:var(--text);}
.chart-container{width:min(100%,960px);display:flex;flex-direction:column;align-items:center;position:relative;}
svg{display:block;width:100%;height:auto;background:transparent;cursor:grab;}
svg:active{cursor:grabbing;}
.axis-label{font-size:12px;fill:var(--muted);user-select:none;}
.tick-label{font-size:10px;fill:var(--muted);user-select:none;}
.grid-line{stroke:var(--grid);stroke-width:.8;shape-rendering:crispEdges;}
.axis-line{stroke:var(--axis);stroke-width:2;shape-rendering:crispEdges;}
.tick-line{stroke:var(--tick);stroke-width:1;shape-rendering:crispEdges;}
.origin-dot{fill:var(--axis);}
.curve{fill:none;stroke:#6cb6ff;stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round;}
.point{fill:#e74c3c;stroke:${isDark?'#121212':'#f4f4f4'};stroke-width:1.5;}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted);justify-content:center;}
.legend-item{display:inline-flex;align-items:center;gap:5px;}
.swatch{width:12px;height:12px;border-radius:50%;display:inline-block;}
.tooltip{position:absolute;background:${isDark?'#1e1e1e':'#fff'};border:1px solid ${isDark?'#444':'#ccc'};border-radius:4px;padding:2px 6px;font-size:12px;color:${isDark?'#eee':'#222'};pointer-events:none;display:none;white-space:nowrap;}
</style></head><body>
${title?`<div class="title">${title}</div>`:''}
<div class="chart-container" id="chartContainer">
<svg id="graphSvg" viewBox="0 0 960 540">
  <defs><clipPath id="plotClip"><rect x="60" y="40" width="840" height="440"></rect></clipPath></defs>
  <g id="gridGroup"></g><g id="axisGroup"></g><g id="tickGroup"></g><g id="labelGroup"></g>
  <g id="dataGroup" clip-path="url(#plotClip)"></g>
</svg>
<div class="tooltip" id="tooltip"></div>
<div class="legend">
  <span class="legend-item"><span class="swatch" style="background:var(--grid);border:1px solid var(--axis)"></span>Grelha</span>
  <span class="legend-item"><span class="swatch" style="background:var(--axis)"></span>Eixos</span>
  <span class="legend-item"><span class="swatch" style="background:#6cb6ff"></span>f(x)</span>
  <span class="legend-item"><span class="swatch" style="background:#e74c3c"></span>Pontos</span>
</div>
</div>
<script>
(function(){
const svg=document.getElementById('graphSvg');
const gridG=document.getElementById('gridGroup'),axisG=document.getElementById('axisGroup'),tickG=document.getElementById('tickGroup'),labelG=document.getElementById('labelGroup'),dataG=document.getElementById('dataGroup');
const tooltip=document.getElementById('tooltip'),container=document.getElementById('chartContainer');
const vb={w:960,h:540},plot={x:60,y:40,w:840,h:440};
let xMin=${xMin},xMax=${xMax},yMin=-5,yMax=5;
let compiledFunction=null,isPanning=false,panStart={x:0,y:0},panStartState={};
function mapX(x){return plot.x+(x-xMin)/(xMax-xMin)*plot.w;}
function mapY(y){return plot.y+plot.h-(y-yMin)/(yMax-yMin)*plot.h;}
function invMapX(px){return xMin+(px-plot.x)/plot.w*(xMax-xMin);}
function invMapY(py){return yMax-(py-plot.y)/plot.h*(yMax-yMin);}
function svgEl(name,attrs){const el=document.createElementNS('http://www.w3.org/2000/svg',name);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,String(v));return el;}
function addText(parent,x,y,text,cls,anchor='middle'){const t=svgEl('text',{x,y,class:cls,'text-anchor':anchor,'dominant-baseline':'middle'});t.textContent=text;parent.appendChild(t);}
function autoAdjustY(){if(!compiledFunction)return;let minY=Infinity,maxY=-Infinity;const step=(xMax-xMin)/200;for(let i=0;i<=200;i++){const x=xMin+i*step;try{const y=compiledFunction.evaluate({x});if(isFinite(y)&&!isNaN(y)){if(y<minY)minY=y;if(y>maxY)maxY=y;}}catch(e){}}if(minY===Infinity){minY=-5;maxY=5;}const range=maxY-minY||2;yMin=minY-range*.1;yMax=maxY+range*.1;}
function draw(){
  gridG.innerHTML='';axisG.innerHTML='';tickG.innerHTML='';labelG.innerHTML='';dataG.innerHTML='';
  const xZero=mapX(0),yZero=mapY(0);
  const xRange=xMax-xMin,yRange=yMax-yMin;
  let xStep=Math.pow(10,Math.floor(Math.log10(xRange/6)));if(xRange/xStep>12)xStep*=2;if(xRange/xStep<4)xStep/=2;
  let yStep=Math.pow(10,Math.floor(Math.log10(yRange/6)));if(yRange/yStep>12)yStep*=2;if(yRange/yStep<4)yStep/=2;
  const xStart=Math.ceil(xMin/xStep)*xStep,yStart=Math.ceil(yMin/yStep)*yStep;
  for(let x=xStart;x<=xMax;x+=xStep){const px=mapX(x);if(px<plot.x||px>plot.x+plot.w)continue;gridG.appendChild(svgEl('line',{x1:px,y1:plot.y,x2:px,y2:plot.y+plot.h,class:'grid-line'}));tickG.appendChild(svgEl('line',{x1:px,y1:yZero-3,x2:px,y2:yZero+3,class:'tick-line'}));if(Math.abs(x)>xStep/100)addText(labelG,px,yZero+14,parseFloat(x.toFixed(8)),'tick-label');}
  for(let y=yStart;y<=yMax;y+=yStep){const py=mapY(y);if(py<plot.y||py>plot.y+plot.h)continue;gridG.appendChild(svgEl('line',{x1:plot.x,y1:py,x2:plot.x+plot.w,y2:py,class:'grid-line'}));tickG.appendChild(svgEl('line',{x1:xZero-3,y1:py,x2:xZero+3,y2:py,class:'tick-line'}));if(Math.abs(y)>yStep/100)addText(labelG,xZero-14,py,parseFloat(y.toFixed(8)),'tick-label','end');}
  if(0>=xMin&&0<=xMax)axisG.appendChild(svgEl('line',{x1:plot.x,y1:yZero,x2:plot.x+plot.w,y2:yZero,class:'axis-line'}));
  if(0>=yMin&&0<=yMax){axisG.appendChild(svgEl('line',{x1:xZero,y1:plot.y,x2:xZero,y2:plot.y+plot.h,class:'axis-line'}));axisG.appendChild(svgEl('circle',{cx:xZero,cy:yZero,r:3.5,class:'origin-dot'}));}
  addText(labelG,plot.x+plot.w-10,yZero-14,'X','axis-label','end');addText(labelG,xZero+14,plot.y+12,'Y','axis-label','start');
  if(compiledFunction){
    const points=[],steps=500,dx=(xMax-xMin)/steps;
    for(let i=0;i<=steps;i++){const x=xMin+i*dx;try{const y=compiledFunction.evaluate({x});if(isFinite(y)&&!isNaN(y)&&y>=yMin-(yMax-yMin)&&y<=yMax+(yMax-yMin))points.push([mapX(x),mapY(y),x,y]);}catch(e){}}
    if(points.length>1){let d=\`M \${points[0][0]} \${points[0][1]}\`;for(let i=1;i<points.length;i++)d+=\` L \${points[i][0]} \${points[i][1]}\`;dataG.appendChild(svgEl('path',{d,class:'curve'}));}
    const stepIdx=Math.max(1,Math.floor(points.length/8));
    for(let i=0;i<points.length;i+=stepIdx){const[px,py,rx,ry]=points[i];const circle=svgEl('circle',{cx:px,cy:py,r:3.5,class:'point'});circle.dataset.tooltip=\`(\${rx.toFixed(3)}, \${ry.toFixed(3)})\`;circle.addEventListener('mouseenter',e=>{tooltip.textContent=circle.dataset.tooltip;tooltip.style.display='block';const rect=container.getBoundingClientRect();const svgRect=svg.getBoundingClientRect();tooltip.style.left=(svgRect.left-rect.left+px*(svgRect.width/vb.w)+15)+'px';tooltip.style.top=(svgRect.top-rect.top+py*(svgRect.height/vb.h)-20)+'px';});circle.addEventListener('mouseleave',()=>{tooltip.style.display='none';});dataG.appendChild(circle);}
  }
}
svg.addEventListener('mousedown',e=>{isPanning=true;panStart={x:e.clientX,y:e.clientY};panStartState={xMin,xMax,yMin,yMax};e.preventDefault();});
window.addEventListener('mousemove',e=>{if(!isPanning)return;const dx=e.clientX-panStart.x,dy=e.clientY-panStart.y;const sx=(panStartState.xMax-panStartState.xMin)/plot.w,sy=(panStartState.yMax-panStartState.yMin)/plot.h;xMin=panStartState.xMin-dx*sx;xMax=panStartState.xMax-dx*sx;yMin=panStartState.yMin+dy*sy;yMax=panStartState.yMax+dy*sy;draw();});
window.addEventListener('mouseup',()=>{isPanning=false;});
svg.addEventListener('wheel',e=>{e.preventDefault();const rect=svg.getBoundingClientRect();const mx=e.clientX-rect.left,my=e.clientY-rect.top;const sx=vb.w/rect.width,sy=vb.h/rect.height;const svgX=mx*sx,svgY=my*sy;if(svgX<plot.x||svgX>plot.x+plot.w||svgY<plot.y||svgY>plot.y+plot.h)return;const dataX=invMapX(svgX),dataY=invMapY(svgY);const factor=e.deltaY<0?.9:1.1;const nxr=(xMax-xMin)*factor,nyr=(yMax-yMin)*factor;const rx=(dataX-xMin)/(xMax-xMin),ry=(dataY-yMin)/(yMax-yMin);xMin=dataX-rx*nxr;xMax=dataX+(1-rx)*nxr;yMin=dataY-ry*nyr;yMax=dataY+(1-ry)*nyr;draw();},{passive:false});
try{compiledFunction=math.compile(${JSON.stringify(expr)});autoAdjustY();}catch(e){}
draw();
})();
<\/script>
</body></html>`;
}

// ── MINDMAP (fiel ao mental_map.html) ─────────────────────────────────────────
function mindmapHtml(jsonStr: string, cls: string): string {
  const data = JSON.parse(jsonStr);
  const isDark = cls === 'dark';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{min-height:100vh;display:grid;place-items:center;background:${isDark?'#121212':'#f4f4f4'};font-family:'Segoe UI',Roboto,system-ui,sans-serif;padding:16px;}
.widget-card{position:relative;width:min(90vw,520px);height:min(85vh,420px);background:${isDark?'#1b1b1b':'#fff'};border-radius:24px;box-shadow:0 10px 30px rgba(0,0,0,${isDark?'0.4':'0.08'});overflow:hidden;}
.mindmap-container{width:100%;height:100%;position:relative;touch-action:none;}
svg{width:100%;height:100%;display:block;}
.node{cursor:pointer;user-select:none;}
.node rect{stroke-width:1.8;}
.node text{fill:#fff;font-size:12px;font-weight:600;text-anchor:middle;dominant-baseline:central;pointer-events:none;}
.link{stroke:${isDark?'#666':'#bbb'};stroke-width:1.8;fill:none;stroke-linecap:round;}
</style></head><body>
<div class="widget-card"><div class="mindmap-container" id="mindmapContainer"><svg id="mindmapSvg"><g id="mainGroup"></g></svg></div></div>
<script>
(function(){
const svg=document.getElementById('mindmapSvg');
const container=document.getElementById('mindmapContainer');
let mainGroup=document.getElementById('mainGroup');
let treeData=${jsonStr};
let collapsedNodes={},panX=0,panY=0,scale=1,nodePositions={};
const LW=170,NH=40,NP=28,VS=NH+NP;
function getSubtreeHeight(node){if(collapsedNodes[node.id]||!node.children||!node.children.length)return VS;return node.children.reduce((s,c)=>s+getSubtreeHeight(c),0);}
function layoutTree(node,x,yStart){const positions={},height=getSubtreeHeight(node),yCenter=yStart+height/2;positions[node.id]={x,y:yCenter};if(!collapsedNodes[node.id]&&node.children&&node.children.length){let cy=yStart;node.children.forEach(c=>{const ch=getSubtreeHeight(c);Object.assign(positions,layoutTree(c,x+LW,cy));cy+=ch;});}return positions;}
function render(animate){
  nodePositions=layoutTree(treeData,0,0);
  const newGroup=document.createElementNS('http://www.w3.org/2000/svg','g');newGroup.setAttribute('id','mainGroup');
  function drawLinks(node){if(!collapsedNodes[node.id]&&node.children){node.children.forEach(child=>{const f=nodePositions[node.id],t=nodePositions[child.id];if(f&&t){const p=document.createElementNS('http://www.w3.org/2000/svg','path');const dx=t.x-f.x;p.setAttribute('d',\`M\${f.x},\${f.y} C\${f.x+dx*.5},\${f.y} \${t.x-dx*.5},\${t.y} \${t.x},\${t.y}\`);p.setAttribute('class','link');newGroup.appendChild(p);}drawLinks(child);});}}
  function drawNodes(node,depth){if(!nodePositions[node.id])return;const{x,y}=nodePositions[node.id];const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('class','node');g.setAttribute('transform',\`translate(\${x},\${y})\`);const textLength=node.label.length*7+24,rw=Math.max(70,textLength),rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('x',-rw/2);rect.setAttribute('y',-NH/2);rect.setAttribute('width',rw);rect.setAttribute('height',NH);rect.setAttribute('fill',node.color||'#6F5AF6');rect.setAttribute('rx',8);const txt=document.createElementNS('http://www.w3.org/2000/svg','text');txt.textContent=node.label;g.appendChild(rect);g.appendChild(txt);if(animate){g.style.opacity=0;setTimeout(()=>{g.style.transition='opacity .25s ease';g.style.opacity=1;},depth*60+30);}g.addEventListener('click',()=>{if(node.children&&node.children.length){collapsedNodes[node.id]=!collapsedNodes[node.id];render(true);}});newGroup.appendChild(g);if(!collapsedNodes[node.id]&&node.children)node.children.forEach(c=>drawNodes(c,depth+1));}
  drawLinks(treeData);drawNodes(treeData,0);
  if(mainGroup)svg.removeChild(mainGroup);svg.appendChild(newGroup);mainGroup=newGroup;applyTransform();
}
function fitTree(){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const id in nodePositions){const{x,y}=nodePositions[id];if(x<minX)minX=x;if(y<minY)minY=y;if(x>maxX)maxX=x;if(y>maxY)maxY=y;}const pad=100,tw=maxX-minX+pad*2,th=maxY-minY+pad*2;svg.setAttribute('viewBox',\`\${minX-pad} \${minY-pad} \${tw} \${th}\`);}
function applyTransform(){if(mainGroup)mainGroup.setAttribute('transform',\`translate(\${panX},\${panY}) scale(\${scale})\`);}
let isPanning=false,panStart={x:0,y:0},initialPan={x:0,y:0},initPinchDist=0,initScale=1;
function getDist(t){return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);}
container.addEventListener('touchstart',e=>{if(e.touches.length===1){isPanning=true;panStart={x:e.touches[0].clientX,y:e.touches[0].clientY};initialPan={x:panX,y:panY};}else if(e.touches.length===2){isPanning=false;initPinchDist=getDist(e.touches);initScale=scale;}e.preventDefault();},{passive:false});
container.addEventListener('touchmove',e=>{if(e.touches.length===1&&isPanning){panX=initialPan.x+e.touches[0].clientX-panStart.x;panY=initialPan.y+e.touches[0].clientY-panStart.y;applyTransform();}else if(e.touches.length===2&&initPinchDist>0){const ns=Math.max(.15,Math.min(3,initScale*getDist(e.touches)/initPinchDist));const rect=container.getBoundingClientRect();const cx=(e.touches[0].clientX+e.touches[1].clientX)/2-rect.left,cy=(e.touches[0].clientY+e.touches[1].clientY)/2-rect.top;const wx=(cx-panX)/scale,wy=(cy-panY)/scale;panX=cx-wx*ns;panY=cy-wy*ns;scale=ns;applyTransform();}e.preventDefault();},{passive:false});
container.addEventListener('touchend',e=>{if(e.touches.length<2)initPinchDist=0;if(e.touches.length===0)isPanning=false;});
container.addEventListener('wheel',e=>{e.preventDefault();const f=e.deltaY<0?1.1:.9;const rect=container.getBoundingClientRect();const mx=e.clientX-rect.left,my=e.clientY-rect.top;const ns=Math.max(.15,Math.min(3,scale*f));const wx=(mx-panX)/scale,wy=(my-panY)/scale;panX=mx-wx*ns;panY=my-wy*ns;scale=ns;applyTransform();},{passive:false});
let isMousePan=false;
container.addEventListener('mousedown',e=>{if(e.target.closest('.node'))return;isMousePan=true;panStart={x:e.clientX,y:e.clientY};initialPan={x:panX,y:panY};e.preventDefault();});
window.addEventListener('mousemove',e=>{if(!isMousePan)return;panX=initialPan.x+e.clientX-panStart.x;panY=initialPan.y+e.clientY-panStart.y;applyTransform();});
window.addEventListener('mouseup',()=>{isMousePan=false;});
render(true);fitTree();
})();
<\/script>
</body></html>`;
}

// ── MARKET (fiel ao market.html) ──────────────────────────────────────────────
function marketHtml(jsonStr: string): string {
  const data = JSON.parse(jsonStr);
  const isUp = (data.change || 0) >= 0;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{min-height:100vh;display:grid;place-items:center;background:#f2f2f2;font-family:Arial,sans-serif;padding:16px;}
.widget{width:min(92vw,420px);background:#111318;border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.22);}
.asset-info{display:flex;align-items:center;justify-content:space-between;padding:20px 16px 8px;}
.asset-left{display:flex;align-items:center;gap:12px;}
.asset-logo{width:44px;height:44px;border-radius:50%;object-fit:cover;background:#1e2128;}
.asset-logo-fallback{width:44px;height:44px;border-radius:50%;background:#1e2128;display:none;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#fff;letter-spacing:-1px;}
.asset-name{font-size:15px;font-weight:700;color:#fff;}
.asset-symbol{font-size:12px;color:#555;margin-top:2px;}
.asset-right{text-align:right;}
.asset-price{font-size:24px;font-weight:800;color:#fff;letter-spacing:-.5px;}
.asset-change{display:inline-flex;align-items:center;font-size:12px;font-weight:700;padding:3px 8px;border-radius:6px;margin-top:4px;}
.up{background:#0d2e1a;color:#22c55e;}.down{background:#2e0d0d;color:#ef4444;}.flat{background:#1e2128;color:#888;}
.chart-container{padding:8px 10px 4px;}
canvas{width:100%;height:150px;display:block;border-radius:12px;}
.timeframes{display:flex;justify-content:center;gap:4px;padding:8px 16px 16px;}
.tf{background:none;border:none;color:#444;font-size:12px;font-weight:700;padding:5px 12px;border-radius:8px;cursor:pointer;transition:all .15s;}
.tf.active{background:#1e2128;color:#fff;}
.status{text-align:center;padding:40px 16px;font-size:13px;color:#555;}
.spinner{width:20px;height:20px;border:2px solid #222;border-top-color:#6F5AF6;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 10px;}
@keyframes spin{to{transform:rotate(360deg);}}
</style></head><body>
<div class="widget" id="widget">
  <div id="statusEl" class="status"><div class="spinner"></div>A carregar...</div>
  <div id="assetBlock" style="display:none">
    <div class="asset-info">
      <div class="asset-left">
        <img id="assetLogo" class="asset-logo" src="" alt="" onerror="this.style.display='none';document.getElementById('logoFallback').style.display='flex'"/>
        <div class="asset-logo-fallback" id="logoFallback"></div>
        <div><div class="asset-name" id="assetName"></div><div class="asset-symbol" id="assetSymbol"></div></div>
      </div>
      <div class="asset-right">
        <div class="asset-price" id="assetPrice"></div>
        <div class="asset-change" id="assetChange"></div>
      </div>
    </div>
    <div class="chart-container"><canvas id="chartCanvas"></canvas></div>
    <div class="timeframes">
      <button class="tf active" onclick="setTf(this,'1D')">1D</button>
      <button class="tf" onclick="setTf(this,'1S')">1S</button>
      <button class="tf" onclick="setTf(this,'1M')">1M</button>
      <button class="tf" onclick="setTf(this,'3M')">3M</button>
      <button class="tf" onclick="setTf(this,'1A')">1A</button>
    </div>
  </div>
</div>
<script>
const WIDGET=${JSON.stringify({ type: data.type || 'crypto', symbol: data.symbol || 'BTC', name: data.name || 'Bitcoin' })};
let currentTf='1D',isUp=${isUp};
const CRYPTO_IDS={BTC:'bitcoin',ETH:'ethereum',SOL:'solana',BNB:'binancecoin',XRP:'ripple',ADA:'cardano',DOGE:'dogecoin',AVAX:'avalanche-2',DOT:'polkadot',MATIC:'matic-network',LTC:'litecoin',LINK:'chainlink',UNI:'uniswap',ATOM:'cosmos',TRX:'tron',TON:'the-open-network'};
const TYPE_EMOJIS={crypto:'🪙',stock:'📈',forex:'💱',commodity:'🛢️'};
function formatPrice(p,type){if(type==='forex')return p.toFixed(4);if(p>=1000)return'$'+p.toLocaleString('en-US',{maximumFractionDigits:2});if(p>=1)return'$'+p.toFixed(2);return'$'+p.toFixed(6);}
function drawChart(prices){const canvas=document.getElementById('chartCanvas');const dpr=window.devicePixelRatio||1;const W=canvas.parentElement.offsetWidth-20,H=150;canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const min=Math.min(...prices),max=Math.max(...prices),range=max-min||1;const pad={t:10,b:10,l:4,r:4};const w=W-pad.l-pad.r,h=H-pad.t-pad.b;const pts=prices.map((v,i)=>({x:pad.l+(i/(prices.length-1))*w,y:pad.t+(1-(v-min)/range)*h}));const color=isUp?'#22c55e':'#ef4444';const grad=ctx.createLinearGradient(0,pad.t,0,H-pad.b);grad.addColorStop(0,color+'55');grad.addColorStop(1,color+'00');ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++){const cx=(pts[i-1].x+pts[i].x)/2;ctx.bezierCurveTo(cx,pts[i-1].y,cx,pts[i].y,pts[i].x,pts[i].y);}ctx.lineTo(pts[pts.length-1].x,H-pad.b);ctx.lineTo(pts[0].x,H-pad.b);ctx.closePath();ctx.fillStyle=grad;ctx.fill();ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++){const cx=(pts[i-1].x+pts[i].x)/2;ctx.bezierCurveTo(cx,pts[i-1].y,cx,pts[i].y,pts[i].x,pts[i].y);}ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.stroke();const last=pts[pts.length-1];ctx.beginPath();ctx.arc(last.x,last.y,4.5,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#111318';ctx.lineWidth=2;ctx.stroke();}
function simulate(price,n,vol){const d=[];let p=price*(0.85+Math.random()*.1);for(let i=0;i<n;i++){p+=(Math.random()-.48)*price*vol;p=Math.max(p,price*.5);d.push(p);}d.push(price);return d;}
const TF={  '1D':{days:1,n:96,vol:.003},'1S':{days:7,n:168,vol:.005},'1M':{days:30,n:120,vol:.008},'3M':{days:90,n:90,vol:.010},'1A':{days:365,n:120,vol:.015}};
async function loadCrypto(sym,tf){const id=CRYPTO_IDS[sym.toUpperCase()];if(!id)throw new Error('Cripto não suportada');const pr=await fetch(\`https://api.coinbase.com/v2/prices/\${sym.toUpperCase()}-USD/spot\`);const pd=await pr.json();const price=parseFloat(pd.data.amount);let prices;try{const cfg=TF[tf];const hr=await fetch(\`https://api.coingecko.com/api/v3/coins/\${id}/market_chart?vs_currency=usd&days=\${cfg.days}&precision=2\`);const hd=await hr.json();prices=hd.prices.map(p=>p[1]);if(!prices.length)throw new Error();}catch{prices=simulate(price,TF[tf].n,TF[tf].vol);}const first=prices[0];return{price,change:((price-first)/first)*100,prices,name:WIDGET.name,symbol:sym.toUpperCase(),logoUrl:''};}
async function loadForex(sym,tf){const base=sym.slice(0,3).toUpperCase(),quote=sym.slice(3,6).toUpperCase()||'USD';const res=await fetch(\`https://open.er-api.com/v6/latest/\${base}\`);const data=await res.json();if(!data.rates)throw new Error('Forex não encontrado');const price=data.rates[quote]||data.rates['USD'];const prices=simulate(price,TF[tf].n,.002);return{price,change:((price-prices[0])/prices[0])*100,prices,name:\`\${base}/\${quote}\`,symbol:\`\${base}/\${quote}\`,logoUrl:''};}
async function load(tf){document.getElementById('statusEl').innerHTML='<div class="spinner"></div>A carregar...';document.getElementById('statusEl').style.display='block';document.getElementById('assetBlock').style.display='none';try{let d;if(WIDGET.type==='crypto')d=await loadCrypto(WIDGET.symbol,tf);else if(WIDGET.type==='forex')d=await loadForex(WIDGET.symbol,tf);else{const price=data.price||100;const prices=simulate(price,TF[tf].n,TF[tf].vol);d={price,change:data.change||0,prices,name:WIDGET.name,symbol:WIDGET.symbol,logoUrl:''};}isUp=d.change>=0;const logoEl=document.getElementById('assetLogo'),fallEl=document.getElementById('logoFallback');if(d.logoUrl){logoEl.src=d.logoUrl;logoEl.style.display='block';fallEl.style.display='none';}else{logoEl.style.display='none';fallEl.style.display='flex';fallEl.textContent=TYPE_EMOJIS[WIDGET.type]||'?';}document.getElementById('assetName').textContent=d.name;document.getElementById('assetSymbol').textContent=d.symbol+' · '+WIDGET.type.toUpperCase();document.getElementById('assetPrice').textContent=formatPrice(d.price,WIDGET.type);const chEl=document.getElementById('assetChange');chEl.textContent=(isUp?'▲ +':'▼ ')+Math.abs(d.change).toFixed(2)+'%';chEl.className='asset-change '+(isUp?'up':'down');document.getElementById('statusEl').style.display='none';document.getElementById('assetBlock').style.display='block';setTimeout(()=>drawChart(d.prices),50);}catch(e){document.getElementById('statusEl').innerHTML='<div style="color:#ef4444;font-size:13px">Erro: '+e.message+'</div>';document.getElementById('statusEl').style.display='block';document.getElementById('assetBlock').style.display='none';}}
function setTf(el,tf){document.querySelectorAll('.tf').forEach(t=>t.classList.remove('active'));el.classList.add('active');currentTf=tf;load(tf);}
load(currentTf);
<\/script>
</body></html>`;
}

// ── MAP (fiel ao map.html) ─────────────────────────────────────────────────────
function mapHtml(jsonStr: string): string {
  const data = JSON.parse(jsonStr);
  const lat = data.lat || -8.8368;
  const lng = data.lng || 13.2343;
  const loc = data.location || 'Localização';
  const zoom = data.zoom || 14;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://unpkg.com/maplibre-gl@4.3.2/dist/maplibre-gl.css" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{min-height:100vh;display:grid;place-items:center;background:#f0f2f5;font-family:system-ui,sans-serif;padding:16px;}
.widget-card{position:relative;width:min(90vw,420px);height:min(90vw,340px);background:#fff;border-radius:30px;box-shadow:0 20px 40px rgba(0,0,0,.1);overflow:hidden;}
#map{width:100%;height:100%;background:#c8d6e5;}
.toggle-btn{position:absolute;top:12px;right:12px;width:36px;height:36px;background:rgba(255,255,255,.85);backdrop-filter:blur(10px);border:none;border-radius:14px;display:grid;place-items:center;cursor:pointer;color:#333;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,.1);}
.toggle-btn svg{width:16px;height:16px;stroke:currentColor;stroke-width:2.5;fill:none;}
.maplibregl-ctrl-logo,.maplibregl-ctrl-attrib,.maplibregl-ctrl-group{display:none!important;}
</style></head><body>
<div class="widget-card" id="widgetCard">
  <div id="map"></div>
  <button class="toggle-btn" id="toggleBtn" title="Expandir">
    <svg viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
  </button>
</div>
<script src="https://unpkg.com/maplibre-gl@4.3.2/dist/maplibre-gl.js"><\/script>
<script>
(function(){
const card=document.getElementById('widgetCard'),toggleBtn=document.getElementById('toggleBtn');
let isExpanded=false;
const map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/liberty',center:[${lng},${lat}],zoom:${zoom},pitch:50,bearing:0,maxZoom:20,attributionControl:false,antialias:true});
map.on('style.load',()=>{
  if(!map.getLayer('building-3d')){map.addLayer({id:'building-3d',source:'openmaptiles','source-layer':'building',type:'fill-extrusion',minzoom:14,paint:{'fill-extrusion-color':'#dce3ed','fill-extrusion-height':['interpolate',['linear'],['zoom'],14,['*',['coalesce',['get','render_height'],['get','height'],3],0.8],18,['*',['coalesce',['get','render_height'],['get','height'],3],1.5]],'fill-extrusion-base':0,'fill-extrusion-opacity':0.92,'fill-extrusion-vertical-gradient':true}},'water-name-below');}
  map.setFog({range:[0.8,10],color:'#f5f7fa','high-color':'#b0c4de','space-color':'#d8e1ec','horizon-blend':0.1,'star-intensity':0});
});
map.on('load',()=>{
  new maplibregl.Marker({color:'#FF3B30'}).setLngLat([${lng},${lat}]).addTo(map);
  map.flyTo({center:[${lng},${lat}],zoom:${zoom+.5},pitch:55,speed:.6});
});
function resizeMap(){setTimeout(()=>map.resize(),50);}
toggleBtn.addEventListener('click',()=>{
  isExpanded=!isExpanded;
  if(isExpanded){card.style.cssText='position:fixed;top:0;left:0;width:100vw;height:100vh;border-radius:0;z-index:1000';toggleBtn.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 4h7v7M13 20h7v-7M20 4l-7 7M4 20l7-7"/></svg>';}
  else{card.style.cssText='';toggleBtn.innerHTML='<svg viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';}
  resizeMap();
});
window.addEventListener('resize',resizeMap);
})();
<\/script>
</body></html>`;
}

// ── CALENDAR (fiel ao calendar.html) ──────────────────────────────────────────
function calendarHtml(jsonStr: string, cls: string): string {
  const data = JSON.parse(jsonStr);
  const eventsJson = JSON.stringify(data.events || {});
  const isDark = cls === 'dark';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
:root{--bg:${isDark?'#121212':'#f4f4f4'};--card:${isDark?'#1b1b1b':'#fff'};--border:${isDark?'#333':'#e0e0e0'};--text:${isDark?'#eee':'#222'};--muted:${isDark?'#888':'#999'};--hover:${isDark?'#2a2a3a':'#f0eeff'};--today-bg:${isDark?'#2a2a40':'#ede9ff'};--today:${isDark?'#a78bfa':'#6F5AF6'};--sel:${isDark?'#7c3aed':'#6F5AF6'};--sel-text:#fff;--evt:${isDark?'#252535':'#f7f6ff'};--weekday:${isDark?'#666':'#aaa'};--btn:${isDark?'#2a2a2a':'#f5f5f5'};}
body{min-height:100vh;display:grid;place-items:center;background:var(--bg);font-family:'Segoe UI',Roboto,system-ui,sans-serif;padding:20px;}
.calendar-container{width:min(92vw,420px);background:var(--card);border:1.5px solid var(--border);border-radius:24px;box-shadow:0 8px 24px rgba(0,0,0,${isDark?'.3':'.06'});padding:20px 18px;overflow:hidden;}
.cal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.cal-title{font-size:18px;font-weight:700;color:var(--text);}
.cal-nav{background:var(--btn);border:none;border-radius:12px;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--text);}
.cal-nav:hover{background:${isDark?'#333':'#e8e8ed'};}
.cal-weekdays{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:8px;}
.cal-weekdays span{text-align:center;font-size:11px;font-weight:600;color:var(--weekday);padding:4px 0;}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
.cal-day{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:14px;color:var(--text);cursor:pointer;position:relative;user-select:none;}
.cal-day:hover:not(.other-month){background:var(--hover);}
.cal-day.other-month{color:var(--muted);cursor:default;opacity:.4;}
.cal-day.today{background:var(--today-bg);color:var(--today);font-weight:700;}
.cal-day.selected{background:var(--sel);color:var(--sel-text);font-weight:700;}
.cal-day.has-event::after{content:'';position:absolute;bottom:3px;width:5px;height:5px;border-radius:50%;background:#6F5AF6;}
.cal-day.selected.has-event::after{background:#fff;}
.cal-events{margin-top:16px;border-top:1px solid var(--border);padding-top:14px;}
.cal-events-title{font-size:12px;font-weight:700;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px;}
.cal-event-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:var(--evt);margin-bottom:6px;cursor:default;}
.cal-event-item:hover{transform:translateX(4px);}
.cal-event-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.cal-event-name{font-size:14px;font-weight:600;color:var(--text);}
.cal-event-time{font-size:12px;color:var(--muted);margin-top:2px;}
.cal-no-events{font-size:13px;color:var(--muted);text-align:center;padding:12px 0;opacity:.7;}
</style></head><body class="${cls}">
<div class="calendar-container">
  <div class="cal-header">
    <button class="cal-nav" id="prevBtn">‹</button>
    <div class="cal-title" id="calTitle"></div>
    <button class="cal-nav" id="nextBtn">›</button>
  </div>
  <div class="cal-weekdays"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div>
  <div class="cal-grid" id="calGrid"></div>
  <div class="cal-events">
    <div class="cal-events-title">📌 Eventos do dia</div>
    <div id="calEventsList"></div>
  </div>
</div>
<script>
(function(){
const eventsData=${eventsJson};
const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const today=new Date();today.setHours(0,0,0,0);
let current=new Date(today.getFullYear(),today.getMonth(),1);
let selectedDate=dk(today.getFullYear(),today.getMonth(),today.getDate());
function dk(y,m,d){return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
function render(){
  const y=current.getFullYear(),m=current.getMonth();
  document.getElementById('calTitle').textContent=months[m]+' '+y;
  const fd=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate(),prev=new Date(y,m,0).getDate();
  const grid=document.getElementById('calGrid');grid.innerHTML='';
  for(let i=fd-1;i>=0;i--){const d=document.createElement('div');d.className='cal-day other-month';d.textContent=prev-i;grid.appendChild(d);}
  for(let d=1;d<=dim;d++){
    const key=dk(y,m,d),date=new Date(y,m,d);
    const isToday=date.getTime()===today.getTime(),isSel=key===selectedDate,hasEv=!!(eventsData[key]&&eventsData[key].length);
    const el=document.createElement('div');
    el.className='cal-day'+(isToday?' today':'')+(isSel?' selected':'')+(hasEv?' has-event':'');
    el.textContent=d;el.onclick=()=>{selectedDate=key;render();};grid.appendChild(el);
  }
  const used=fd+dim,rem=used%7===0?0:7-used%7;
  for(let d=1;d<=rem;d++){const el=document.createElement('div');el.className='cal-day other-month';el.textContent=d;grid.appendChild(el);}
  renderEvents();
}
function renderEvents(){
  const el=document.getElementById('calEventsList');el.innerHTML='';
  const dayEv=eventsData[selectedDate];
  if(!dayEv||!dayEv.length){el.innerHTML='<div class="cal-no-events">Nenhum evento neste dia</div>';return;}
  dayEv.forEach(e=>{el.innerHTML+=\`<div class="cal-event-item"><div class="cal-event-dot" style="background:\${e.color||'#6F5AF6'}"></div><div><div class="cal-event-name">\${e.name}</div>\${e.time?'<div class="cal-event-time">'+e.time+'</div>':''}</div></div>\`;});
}
document.getElementById('prevBtn').onclick=()=>{current.setMonth(current.getMonth()-1);render();};
document.getElementById('nextBtn').onclick=()=>{current.setMonth(current.getMonth()+1);render();};
render();
})();
<\/script>
</body></html>`;
}

// ── SHEET (fiel ao sheet.html) ─────────────────────────────────────────────────
function sheetHtml(jsonStr: string, isDark: boolean): string {
  const data = JSON.parse(jsonStr);
  const lines = (data.lines || []) as { text: string; title?: boolean }[];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;width:100%;height:100%;background:${isDark?'#1E1E1E':'#ffffff'};overflow:hidden;font-family:Arial,Helvetica,sans-serif;}
body{display:flex;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;}
.paper{width:min(92vw,640px);height:min(70vh,320px);border:1px solid ${isDark?'#2A2A2A':'#d6d6d6'};background:${isDark?'#1E1E1E':'#fffef8'};box-shadow:0 8px 22px rgba(0,0,0,.10);overflow:hidden;}
svg{display:block;width:100%;height:100%;}
.rule{stroke:${isDark?'rgba(95,145,255,0.08)':'rgba(95,145,255,0.16)'};stroke-width:1;shape-rendering:crispEdges;}
.text-line{fill:${isDark?'#eee':'#222'};font-family:Arial,Helvetica,sans-serif;font-weight:400;dominant-baseline:alphabetic;}
.title-line{fill:${isDark?'#eee':'#222'};font-family:Arial,Helvetica,sans-serif;font-weight:700;dominant-baseline:alphabetic;}
</style></head><body>
<div class="paper"><svg id="sheet" xmlns="http://www.w3.org/2000/svg"></svg></div>
<script>
window.linesData=${JSON.stringify(lines)};
const sheet=document.getElementById('sheet');
const cfg={leftPad:72,rightPad:20,topPad:34,gap:32,textLift:10,minFont:10,maxFont:18,titleMaxFont:20};
const mc=document.createElement('canvas'),ctx=mc.getContext('2d');
function fitFont(text,maxW,minF,maxF,bold){let lo=minF,hi=maxF,best=lo;while(lo<=hi){const mid=Math.floor((lo+hi)/2);ctx.font=(bold?'700 ':'')+mid+'px Arial';if(ctx.measureText(text).width<=maxW){best=mid;lo=mid+1;}else hi=mid-1;}return best;}
function render(){const w=sheet.clientWidth,h=sheet.clientHeight;const maxTW=w-cfg.leftPad-cfg.rightPad;sheet.innerHTML='';const bg=document.createElementNS('http://www.w3.org/2000/svg','rect');bg.setAttribute('width',w);bg.setAttribute('height',h);bg.setAttribute('fill','${isDark?'#1E1E1E':'#fffef8'}');sheet.appendChild(bg);for(let i=0;i<=Math.ceil(h/cfg.gap)+1;i++){const ln=document.createElementNS('http://www.w3.org/2000/svg','line');const y=i*cfg.gap;ln.setAttribute('x1',0);ln.setAttribute('y1',y);ln.setAttribute('x2',w);ln.setAttribute('y2',y);ln.setAttribute('class','rule');sheet.appendChild(ln);}const mg=document.createElementNS('http://www.w3.org/2000/svg','line');mg.setAttribute('x1',56);mg.setAttribute('y1',0);mg.setAttribute('x2',56);mg.setAttribute('y2',h);mg.setAttribute('stroke','${isDark?'rgba(255,90,90,0.12)':'rgba(255,90,90,0.20)'}');mg.setAttribute('stroke-width',1);mg.setAttribute('shape-rendering','crispEdges');sheet.appendChild(mg);window.linesData.forEach((item,i)=>{const y=cfg.topPad+i*cfg.gap-cfg.textLift;const isT=!!item.title;const sz=fitFont(item.text,maxTW,isT?12:cfg.minFont,isT?cfg.titleMaxFont:cfg.maxFont,isT);const t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('x',cfg.leftPad);t.setAttribute('y',y);t.setAttribute('font-size',sz);t.setAttribute('class',isT?'title-line':'text-line');t.textContent=item.text;sheet.appendChild(t);});}
window.addEventListener('load',render);window.addEventListener('resize',render);
<\/script>
</body></html>`;
}

// ─── Widget regex ─────────────────────────────────────────────────────────────
const WIDGET_REGEX = /<(widget_calendar|widget_bar|widget_pie|widget_table|widget_code|widget_timer|widget_map|widget_graph|widget_mindmap|widget_market|widget_sheet)>([\s\S]*?)<\/\1>/gm;

function MessageContent({ content, isDark }: { content: string; isDark: boolean }) {
  const parts: React.ReactNode[] = [];
  let key = 0;
  const text = content.replace(/<think>[\s\S]*?<\/think>/gm, '').trim();
  let last = 0;
  const rx = new RegExp(WIDGET_REGEX.source, 'gm');
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    const before = text.slice(last, m.index).trim();
    if (before) parts.push(<TextBlock key={key++} text={before} isDark={isDark} />);
    parts.push(
      <iframe key={key++} srcDoc={getWidgetHtml(m[1], m[2].trim(), isDark)}
        style={{ width: '100%', height: getWidgetHeight(m[1]), border: 'none', borderRadius: 14, display: 'block', marginTop: 8, marginBottom: 8 }}
        sandbox="allow-scripts" scrolling="no" />
    );
    last = m.index + m[0].length;
  }
  const after = text.slice(last).trim();
  if (after) parts.push(<TextBlock key={key++} text={after} isDark={isDark} />);
  return <>{parts}</>;
}

function getWidgetHeight(type: string): number {
  switch (type) {
    case 'widget_bar': return 340;
    case 'widget_pie': return 360;
    case 'widget_table': return 220;
    case 'widget_code': return 320;
    case 'widget_timer': return 200;
    case 'widget_graph': return 380;
    case 'widget_mindmap': return 440;
    case 'widget_market': return 340;
    case 'widget_map': return 380;
    case 'widget_calendar': return 500;
    case 'widget_sheet': return 320;
    default: return 280;
  }
}

// ─── TextBlock ────────────────────────────────────────────────────────────────
function TextBlock({ text, isDark }: { text: string; isDark: boolean }) {
  const textColor = isDark ? '#eee' : '#1a1a1a';
  const tableHeaderBg = isDark ? '#2C2C2E' : '#ECEAFF';
  const tableBorder = isDark ? '#2A2A2A' : '#DDDDDD';
  const lines = text.split('\n');

  const tableStart = lines.findIndex(l => l.trim().startsWith('|') && l.trim().endsWith('|'));
  if (tableStart !== -1) {
    const tableLines: string[] = [];
    let i = tableStart;
    while (i < lines.length && (lines[i].trim().startsWith('|') || lines[i].trim().match(/^\|[-:| ]+\|$/))) {
      tableLines.push(lines[i]); i++;
    }
    const before = lines.slice(0, tableStart).join('\n').trim();
    const after = lines.slice(i).join('\n').trim();
    const dataLines = tableLines.filter(l => !l.trim().match(/^\|[-:| ]+\|$/));
    const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    return (
      <>
        {before && <TextBlock text={before} isDark={isDark} />}
        <div style={{ overflowX: 'auto', marginTop: 8, marginBottom: 8 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: 'Georgia, serif', fontSize: 14 }}>
            <thead><tr>{cells(dataLines[0]||'').map((h,ci) => <th key={ci} style={{ padding:'8px 12px', background:tableHeaderBg, color:textColor, fontWeight:700, borderBottom:`1px solid ${tableBorder}`, borderRight:`1px solid ${tableBorder}`, whiteSpace:'nowrap' }}>{parseInline(h)}</th>)}</tr></thead>
            <tbody>{dataLines.slice(1).map((row,ri) => <tr key={ri}>{cells(row).map((c,ci) => <td key={ci} style={{ padding:'7px 12px', color:textColor, borderBottom:`1px solid ${tableBorder}`, borderRight:`1px solid ${tableBorder}`, whiteSpace:'nowrap' }}>{parseInline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
        {after && <TextBlock text={after} isDark={isDark} />}
      </>
    );
  }

  const codeStart = lines.findIndex(l => l.trim().startsWith('```'));
  if (codeStart !== -1) {
    const lang = lines[codeStart].trim().slice(3).trim().toUpperCase() || 'CODE';
    let codeEnd = lines.findIndex((l, i) => i > codeStart && l.trim() === '```');
    if (codeEnd === -1) codeEnd = lines.length;
    const codeLines = lines.slice(codeStart + 1, codeEnd);
    const before = lines.slice(0, codeStart).join('\n').trim();
    const after = lines.slice(codeEnd + 1).join('\n').trim();
    const cbBg = isDark ? '#1b1b1b' : '#ffffff';
    const cbBorder = isDark ? '#2f2f2f' : '#d7d7d7';
    const cbHeader = isDark ? '#2a2a2a' : '#f0f0f0';
    const cbText = isDark ? '#e8e8e8' : '#222';
    const cbTitle = isDark ? '#f2f2f2' : '#2a2a2a';
    const lineNumColor = isDark ? '#7d7d7d' : '#8a8a8a';
    return (
      <>
        {before && <TextBlock text={before} isDark={isDark} />}
        <div style={{ borderRadius:14, border:`1.5px solid ${cbBorder}`, overflow:'hidden', marginTop:8, marginBottom:8, background:cbBg }}>
          <div style={{ background:cbHeader, padding:'0 12px', height:38, display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${cbBorder}` }}>
            <span style={{ fontSize:12, fontWeight:700, color:cbTitle, letterSpacing:'.2px' }}>{lang}</span>
            <button onClick={() => navigator.clipboard?.writeText(codeLines.join('\n'))} style={{ background:isDark?'#353535':'#fff', border:`1px solid ${isDark?'#4a4a4a':'#cfcfcf'}`, borderRadius:8, cursor:'pointer', padding:'3px 8px', color:cbTitle, fontSize:11 }}>Copiar</button>
          </div>
          <div style={{ overflowX:'auto', padding:'14px 14px 14px 48px', background:cbBg, position:'relative' }}>
            {codeLines.map((line, li) => (
              <div key={li} style={{ display:'flex', position:'relative', lineHeight:'1.7' }}>
                <span style={{ position:'absolute', left:-36, width:28, textAlign:'right', color:lineNumColor, fontSize:12, fontFamily:'monospace', userSelect:'none' }}>{li+1}</span>
                <span style={{ fontFamily:'Consolas,Monaco,monospace', fontSize:13, color:cbText, whiteSpace:'pre' }}>{line||' '}</span>
              </div>
            ))}
          </div>
        </div>
        {after && <TextBlock text={after} isDark={isDark} />}
      </>
    );
  }

  const rendered = lines.map((line, li) => {
    const t = line.trimStart();
    if (!t) return <div key={li} style={{ height: 8 }} />;
    if (t.startsWith('### ')) return <div key={li} style={{ fontSize:15, fontWeight:700, color:textColor, margin:'8px 0 4px' }}>{parseInline(t.slice(4))}</div>;
    if (t.startsWith('## ') || t.startsWith('# ')) {
      const lvl = t.startsWith('## ') ? 3 : 2;
      return <div key={li} style={{ fontSize:lvl===2?18:16, fontWeight:700, color:textColor, margin:'10px 0 4px' }}>{parseInline(t.replace(/^#+\s/,''))}</div>;
    }
    if (t.startsWith('* ') || t.startsWith('- ') || t.startsWith('• ')) {
      return <div key={li} style={{ display:'flex', gap:8, marginBottom:2 }}><span style={{ color:textColor, flexShrink:0, marginTop:2 }}>•</span><span style={{ fontSize:15, lineHeight:1.6, color:textColor }}>{parseInline(t.slice(2))}</span></div>;
    }
    if (t.match(/^\d+\.\s/)) {
      const num = t.match(/^(\d+)\./)?.[1];
      return <div key={li} style={{ display:'flex', gap:8, marginBottom:2 }}><span style={{ color:textColor, flexShrink:0, minWidth:18 }}>{num}.</span><span style={{ fontSize:15, lineHeight:1.6, color:textColor }}>{parseInline(t.replace(/^\d+\.\s/,''))}</span></div>;
    }
    if (t.startsWith('> ')) return <div key={li} style={{ borderLeft:`3px solid ${isDark?'#555':'#ccc'}`, paddingLeft:12, marginBottom:4, color:isDark?'#aaa':'#666', fontStyle:'italic', fontSize:14 }}>{parseInline(t.slice(2))}</div>;
    if (t.match(/^[-=]{3,}$/)) return <hr key={li} style={{ border:'none', borderTop:`1px solid ${isDark?'#333':'#e0e0e0'}`, margin:'8px 0' }} />;
    return <div key={li} style={{ fontSize:15, lineHeight:1.6, color:textColor, marginBottom:2 }}>{parseInline(t)}</div>;
  });
  return <>{rendered}</>;
}

// ─── Overlay bloqueante (impede interacção com o fundo) ───────────────────────
function BlockingOverlay({ onClick, zIndex = 300 }: { onClick: () => void; zIndex?: number }) {
  // Bloqueia scroll no body enquanto montado
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div
      onClick={onClick}
      onTouchMove={e => e.preventDefault()}
      style={{ position: 'fixed', inset: 0, zIndex, background: 'rgba(0,0,0,0.35)' }}
    />
  );
}

// ─── Settings Dialog Flutuante ────────────────────────────────────────────────
function SettingsDialog({ onClose, isDark, user }: { onClose: () => void; isDark: boolean; user: { name: string; email: string } }) {
  const bg = isDark ? '#1C1C1E' : '#ffffff';
  const textColor = isDark ? '#f0f0f0' : '#1a1a1a';
  const mutedColor = isDark ? '#888' : '#8E8E93';
  const border = isDark ? '#2A2A2C' : '#E5E5EA';
  const rowBg = isDark ? '#2C2C2E' : '#F2F2F7';

  const sections = [
    {
      title: 'Conta',
      items: [
        { icon: '/assets/icons/svg/ai.svg', label: 'Perfil', sub: user.name },
        { icon: '/assets/icons/svg/security.svg', label: 'Segurança', sub: 'Password e 2FA' },
        { icon: '/assets/icons/svg/privacy.svg', label: 'Privacidade', sub: 'Dados e permissões' },
      ],
    },
    {
      title: 'Aplicação',
      items: [
        { icon: '/assets/icons/svg/appearance.svg', label: 'Aparência', sub: 'Tema e cores' },
        { icon: '/assets/icons/svg/language.svg', label: 'Idioma', sub: 'Português' },
        { icon: '/assets/icons/svg/notifications.svg', label: 'Notificações', sub: 'Gerir alertas' },
      ],
    },
    {
      title: 'Suporte',
      items: [
        { icon: '/assets/icons/svg/about.svg', label: 'Sobre a Nexa', sub: 'Versão 1.0.0' },
      ],
    },
  ];

  return (
    <>
      <BlockingOverlay onClick={onClose} zIndex={300} />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        style={{
          position: 'fixed', inset: 20, zIndex: 301,
          background: bg, borderRadius: 24,
          boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.7)' : '0 24px 60px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:`1px solid ${border}` }}>
          <span style={{ fontSize:17, fontWeight:700, color:textColor }}>Definições</span>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', background:rowBg, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <img src="/assets/icons/svg/close.svg" width={14} height={14} alt="" style={{ filter: isDark ? 'invert(1)' : 'none' }} />
          </button>
        </div>

        {/* Avatar + nome */}
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 20px', borderBottom:`1px solid ${border}` }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'#6F5AF6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'#fff', fontWeight:700 }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:textColor }}>{user.name}</div>
            <div style={{ fontSize:13, color:mutedColor }}>{user.email}</div>
          </div>
        </div>

        {/* Secções */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 0' }}>
          {sections.map(section => (
            <div key={section.title} style={{ marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:mutedColor, padding:'6px 20px 4px', textTransform:'uppercase', letterSpacing:'.5px' }}>{section.title}</div>
              <div style={{ margin:'0 12px', background:rowBg, borderRadius:16, overflow:'hidden' }}>
                {section.items.map((item, i) => (
                  <button key={item.label} style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'13px 16px', background:'none', border:'none', cursor:'pointer', borderBottom: i < section.items.length-1 ? `1px solid ${isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'}` : 'none' }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:isDark?'#3A3A3C':'#E5E5EA', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <img src={item.icon} width={18} height={18} alt="" style={{ filter: isDark?'invert(1)':'none' }} />
                    </div>
                    <div style={{ flex:1, textAlign:'left' }}>
                      <div style={{ fontSize:15, fontWeight:500, color:textColor }}>{item.label}</div>
                      <div style={{ fontSize:12, color:mutedColor }}>{item.sub}</div>
                    </div>
                    <img src="/assets/icons/svg/chevron_right.svg" width={14} height={14} alt="" style={{ opacity:.4, filter: isDark?'invert(1)':'none' }} />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Logout */}
          <div style={{ margin:'8px 12px 16px' }}>
            <button style={{ width:'100%', height:50, borderRadius:14, background:'rgba(255,59,48,0.12)', border:'none', cursor:'pointer', color:'#FF3B30', fontSize:15, fontWeight:600 }}>
              Terminar sessão
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Extras Dialog (flash / think / widgets) ──────────────────────────────────
function ExtrasDialog({
  onClose, isDark, onSelect,
  anchorBottom,
}: {
  onClose: () => void;
  isDark: boolean;
  onSelect: (mode: string) => void;
  anchorBottom: number;
}) {
  const bg = isDark ? '#2C2C2E' : '#ffffff';
  const textClr = isDark ? '#f0f0f0' : '#1a1a1a';
  const mutedClr = isDark ? '#888' : '#8E8E93';
  const divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  const opts = [
    { icon: '/assets/icons/svg/flash.svg', label: 'Flash', sub: 'Respostas rápidas', mode: 'flash' },
    { icon: '/assets/icons/svg/brain.svg', label: 'Think', sub: 'Raciocínio profundo', mode: 'think' },
    { icon: '/assets/icons/svg/sheets.svg', label: 'Widgets', sub: 'Gráficos, mapas e mais', mode: 'widgets' },
  ];

  return (
    <>
      <BlockingOverlay onClick={onClose} zIndex={198} />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        style={{
          position: 'fixed', left: 14, bottom: anchorBottom + 8, zIndex: 199,
          background: bg, borderRadius: 16,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.16)',
          overflow: 'hidden', minWidth: 220,
        }}
      >
        <div style={{ padding: '10px 14px 6px', fontSize: 11, fontWeight: 700, color: mutedClr, textTransform: 'uppercase', letterSpacing: '.5px' }}>Modo IA</div>
        {opts.map((opt, i) => (
          <button key={opt.mode} onClick={() => { onSelect(opt.mode); onClose(); }}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'11px 14px', background:'none', border:'none', cursor:'pointer', borderTop: i > 0 ? `1px solid ${divider}` : 'none' }}>
            <div style={{ width:34, height:34, borderRadius:10, background:isDark?'#3A3A3C':'#F2F2F7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <img src={opt.icon} width={18} height={18} alt="" style={{ filter: isDark?'invert(1)':'none' }} />
            </div>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:14, fontWeight:600, color:textClr }}>{opt.label}</div>
              <div style={{ fontSize:11, color:mutedClr }}>{opt.sub}</div>
            </div>
          </button>
        ))}
      </motion.div>
    </>
  );
}

// ─── Popup do botão + (inferior) ──────────────────────────────────────────────
function AddPopupMenu({
  open, onClose, isDark, bottomOffset, inputBarHeight,
  onImagePick, onFilePick,
  onExtras,
}: {
  open: boolean; onClose: () => void; isDark: boolean;
  bottomOffset: number; inputBarHeight: number;
  onImagePick: () => void; onFilePick: () => void;
  onExtras: () => void;
}) {
  const bg = isDark ? '#2C2C2E' : '#ffffff';
  const textClr = isDark ? '#f0f0f0' : '#1a1a1a';
  const divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  const items = [
    { icon: '/assets/icons/svg/image.svg', label: 'Carregar imagem', action: onImagePick },
    { icon: '/assets/icons/svg/extras.svg', label: 'Extras', action: onExtras },
    { icon: '/assets/icons/svg/download.svg', label: 'Carregar ficheiro', action: onFilePick },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <BlockingOverlay onClick={onClose} zIndex={198} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            style={{
              position: 'fixed', left: 14,
              bottom: bottomOffset + inputBarHeight + 8,
              zIndex: 199, background: bg, borderRadius: 14,
              boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.55)' : '0 8px 32px rgba(0,0,0,0.14)',
              overflow: 'hidden', minWidth: 200,
            }}
          >
            {items.map((opt, i) => (
              <button key={opt.label} onClick={() => { opt.action(); onClose(); }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 16px', background:'none', border:'none', cursor:'pointer', borderBottom: i < items.length-1 ? `1px solid ${divider}` : 'none', fontSize:15, color:textClr, textAlign:'left' }}>
                <img src={opt.icon} width={18} height={18} alt="" style={{ filter: isDark?'invert(1)':'none', flexShrink:0 }} />
                <span style={{ fontWeight:500 }}>{opt.label}</span>
              </button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Top Menu ─────────────────────────────────────────────────────────────────
function TopPopupMenu({ open, onClose, isDark, items }: {
  open: boolean; onClose: () => void; isDark: boolean;
  items: { icon: string; label: string; action: () => void }[];
}) {
  const bg = isDark ? '#2C2C2E' : '#ffffff';
  const textClr = isDark ? '#f0f0f0' : '#1a1a1a';
  const divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  return (
    <AnimatePresence>
      {open && (
        <>
          <BlockingOverlay onClick={onClose} zIndex={198} />
          <motion.div
            initial={{ opacity:0, y:8, scale:0.95 }}
            animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:6, scale:0.95 }}
            transition={{ type:'spring', stiffness:420, damping:32 }}
            style={{ position:'fixed', right:14, top:56, zIndex:199, background:bg, borderRadius:14, boxShadow:isDark?'0 8px 32px rgba(0,0,0,0.55)':'0 8px 32px rgba(0,0,0,0.14)', overflow:'hidden', minWidth:190 }}
          >
            {items.map((opt, i) => (
              <button key={opt.label} onClick={() => { opt.action(); onClose(); }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 16px', background:'none', border:'none', cursor:'pointer', borderBottom: i < items.length-1 ? `1px solid ${divider}` : 'none', fontSize:15, color:textClr, textAlign:'left' }}>
                <img src={opt.icon} width={18} height={18} alt="" style={{ filter: isDark?'invert(1)':'none', flexShrink:0 }} />
                <span style={{ fontWeight:500 }}>{opt.label}</span>
              </button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── ChatPage ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const token = getToken()!;
  const user = getStoredUser()!;
  const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [bottomOffset, setBottomOffset] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [optionsConv, setOptionsConv] = useState<Conversation | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [inputBarHeight, setInputBarHeight] = useState(90);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard offset
  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      setBottomOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    };
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => { window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update); };
  }, []);

  // Textarea auto-height
  useEffect(() => {
    const ta = textareaRef.current; if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [inputValue]);

  // Medir altura da inputBar
  useEffect(() => {
    const bar = inputBarRef.current;
    if (!bar) return;
    const ro = new ResizeObserver(() => setInputBarHeight(bar.offsetHeight));
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadConversations = useCallback(async () => {
    try { const res = await apiListConversations(token); setConversations(res.conversations); } catch { /* silent */ }
  }, [token]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const selectConversation = (conv: Conversation) => { setActiveConv(conv); setMessages(conv.messages); };
  const newChat = () => { setActiveConv(null); setMessages([]); setInputValue(''); };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || streaming) return;
    setInputValue('');
    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreaming(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    let fullReply = '';
    await apiChatStream(token, newMessages,
      (chunk) => { fullReply += chunk; setMessages(prev => { const u = [...prev]; u[u.length-1] = { role:'assistant', content: fullReply }; return u; }); },
      async () => {
        setStreaming(false);
        const final: Message[] = [...newMessages, { role:'assistant', content: fullReply }];
        try {
          if (!activeConv) {
            const t = await apiGenerateTitle(token, text);
            const c = await apiCreateConversation(token, t.title, final);
            setActiveConv(c); loadConversations();
          } else {
            const u = await apiUpdateConversation(token, activeConv.id, { messages: final });
            setActiveConv(u); loadConversations();
          }
        } catch { /* silent */ }
      },
      (e) => { console.error(e); setStreaming(false); },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const hasText = inputValue.trim().length > 0;
  const hasChat = messages.length > 0;

  const bg        = isDark ? '#111111' : '#ffffff';
  const inputBg   = isDark ? '#1C1C1E' : '#ffffff';
  const textColor = isDark ? '#eee' : '#1a1a1a';

  const handlePin     = async (conv: Conversation) => { await apiPinConversation(token, conv.id, !conv.pinned); setOptionsConv(null); loadConversations(); };
  const handleArchive = async (conv: Conversation) => { await apiArchiveConversation(token, conv.id, true); setOptionsConv(null); if (activeConv?.id === conv.id) newChat(); loadConversations(); };
  const handleDelete  = async (conv: Conversation) => { await apiDeleteConversation(token, conv.id); setOptionsConv(null); if (activeConv?.id === conv.id) newChat(); loadConversations(); };

  const topMenuItems = [
    { icon: '/assets/icons/svg/new_chat.svg',  label: 'Novo chat',   action: () => newChat() },
    { icon: '/assets/icons/svg/history.svg',   label: 'Conversas',   action: () => setDrawerOpen(true) },
    { icon: '/assets/icons/svg/settings.svg',  label: 'Definições',  action: () => setSettingsOpen(true) },
    { icon: '/assets/icons/svg/appearance.svg',label: 'Tema',        action: () => {} },
  ];

  return (
    <>
      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => { /* handle image */ }} />
      <input ref={fileInputRef} type="file" accept="*/*" style={{ display:'none' }} onChange={e => { /* handle file */ }} />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} conversations={conversations} activeId={activeConv?.id||''} userName={user.name} onSelect={selectConversation} onNewChat={newChat} onLongPress={c => setOptionsConv(c)} />

      {/* Settings Dialog */}
      <AnimatePresence>
        {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} isDark={isDark} user={{ name: user.name, email: user.email }} />}
      </AnimatePresence>

      {/* Conversation options sheet */}
      <AnimatePresence>
        {optionsConv && (
          <>
            <BlockingOverlay onClick={() => setOptionsConv(null)} zIndex={200} />
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', stiffness:340, damping:34 }}
              style={{ position:'fixed', left:0, right:0, bottom:0, zIndex:201, background:isDark?'#1C1C1E':'#fff', borderRadius:'14px 14px 0 0', padding:'8px 0 32px' }}>
              <div style={{ width:36, height:4, borderRadius:2, background:isDark?'#3A3A3C':'#E0E0E0', margin:'8px auto 12px' }} />
              <p style={{ fontSize:15, fontWeight:700, color:textColor, padding:'0 20px 12px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{optionsConv.title}</p>
              {[
                { label: optionsConv.pinned ? 'Desafixar' : 'Fixar conversa', action: () => handlePin(optionsConv), color: textColor },
                { label: 'Arquivar conversa', action: () => handleArchive(optionsConv), color: textColor },
                { label: 'Eliminar conversa', action: () => handleDelete(optionsConv), color: '#FF3B30' },
              ].map(opt => (
                <button key={opt.label} onClick={opt.action} style={{ width:'100%', display:'flex', alignItems:'center', padding:'0 20px', height:52, background:'none', border:'none', cursor:'pointer', fontSize:15, color:opt.color }}>{opt.label}</button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Extras dialog (flash/think/widgets) */}
      <AnimatePresence>
        {extrasOpen && (
          <ExtrasDialog
            onClose={() => setExtrasOpen(false)}
            isDark={isDark}
            onSelect={(mode) => console.log('Modo seleccionado:', mode)}
            anchorBottom={bottomOffset + inputBarHeight}
          />
        )}
      </AnimatePresence>

      {/* Add menu (imagem / extras / ficheiro) */}
      <AddPopupMenu
        open={addMenuOpen}
        onClose={() => setAddMenuOpen(false)}
        isDark={isDark}
        bottomOffset={bottomOffset}
        inputBarHeight={inputBarHeight}
        onImagePick={() => imageInputRef.current?.click()}
        onFilePick={() => fileInputRef.current?.click()}
        onExtras={() => { setAddMenuOpen(false); setExtrasOpen(true); }}
      />

      {/* Top menu */}
      <TopPopupMenu open={topMenuOpen} onClose={() => setTopMenuOpen(false)} isDark={isDark} items={topMenuItems} />

      <main style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:bg }}>
        {/* AppBar blur */}
        <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:40, height:80, pointerEvents:'none' }}>
          <div style={{ position:'absolute', inset:0, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', maskImage:'linear-gradient(to bottom, black 50%, transparent 100%)', WebkitMaskImage:'linear-gradient(to bottom, black 50%, transparent 100%)', background:`linear-gradient(to bottom, ${bg}F5 0%, ${bg}B0 70%, transparent 100%)` }} />
        </div>
        <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:40, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px 8px' }}>
          <button onClick={() => setDrawerOpen(true)} style={appBtn(isDark)}>
            <img src="/assets/icons/svg/menu.svg" width={16} height={16} alt="" />
          </button>
          <button onClick={() => setTopMenuOpen(v => !v)} style={appBtn(isDark)}>
            <img src="/assets/icons/svg/new_chat.svg" width={16} height={16} alt="" />
          </button>
        </div>

        {/* Content */}
        {!hasChat ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingTop:80, paddingBottom:160 }}>
            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:.5 }} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
              <motion.img src="/assets/icons/png/logo.png" width={72} height={72} style={{ borderRadius:18 }} initial={{ opacity:0, scale:.85 }} animate={{ opacity:1, scale:1 }} transition={{ duration:.5, ease:[0.34,1.56,0.64,1] }} alt="Nexa" />
              <h1 style={{ fontSize:'2.4rem', fontWeight:700, fontFamily:'Georgia, serif', color:textColor, margin:0 }}>{getGreeting()}</h1>
              <p style={{ color:isDark?'#888':'#8E8E93', fontSize:15, margin:0 }}>Em que estás a pensar?</p>
            </motion.div>
          </div>
        ) : (
          <div style={{ flex:1, overflowY:'auto', padding:'88px 16px 150px', display:'flex', flexDirection:'column', gap:4 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display:'flex', justifyContent:msg.role==='user'?'flex-end':'flex-start', marginBottom:8 }}>
                {msg.role === 'user' ? (
                  <div style={{ maxWidth:'78%', padding:'10px 14px', borderRadius:'18px 18px 4px 18px', background:'#3B82F6', color:'#fff', fontSize:15, lineHeight:1.5, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{msg.content}</div>
                ) : (
                  <div style={{ width:'100%', paddingRight:16 }}>
                    {streaming && i === messages.length-1 && !msg.content ? (
                      <div style={{ display:'flex', gap:4, alignItems:'center', padding:'8px 0' }}>
                        {[0,1,2].map(j => <motion.div key={j} style={{ width:6, height:6, borderRadius:'50%', background:'#3B82F6' }} animate={{ y:[0,-5,0] }} transition={{ duration:.8, repeat:Infinity, delay:j*.15 }} />)}
                      </div>
                    ) : (
                      <MessageContent content={msg.content} isDark={isDark} />
                    )}
                    {!streaming && msg.content && i === messages.length-1 && (
                      <div style={{ display:'flex', gap:4, marginTop:6 }}>
                        {[
                          { icon:'/assets/icons/svg/copy.svg', action:() => navigator.clipboard?.writeText(msg.content) },
                          { icon:'/assets/icons/svg/thumbs_up.svg', action:() => {} },
                          { icon:'/assets/icons/svg/thumbs_down.svg', action:() => {} },
                          { icon:'/assets/icons/svg/share.svg', action:() => {} },
                        ].map((btn, bi) => (
                          <button key={bi} onClick={btn.action} style={{ width:32, height:32, borderRadius:'50%', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity:.5 }}>
                            <img src={btn.icon} width={15} height={15} alt="" style={{ filter:isDark?'invert(1)':'none' }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input bar */}
        <div ref={inputBarRef} style={{ position:'fixed', left:0, right:0, bottom:bottomOffset, padding:'8px 12px 24px', transition:'bottom .2s ease' }}>
          <div style={{ background:inputBg, borderRadius:24, boxShadow:'0 2px 16px rgba(0,0,0,0.12)', padding:'12px 16px', display:'flex', flexDirection:'column', gap:10, border:isDark?'1px solid #2A2A2C':'none' }}>
            <textarea ref={textareaRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder="Pergunta algo..." rows={1}
              style={{ width:'100%', resize:'none', background:'transparent', border:'none', outline:'none', fontSize:15, color:textColor, lineHeight:1.5, maxHeight:140, fontFamily:'inherit', boxSizing:'border-box' }} />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <button onClick={() => setAddMenuOpen(v => !v)} style={iconBtn(isDark)}>
                <img src="/assets/icons/svg/add.svg" width={16} height={16} alt="+" style={{ filter:isDark?'invert(1)':'none' }} />
              </button>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <motion.button animate={{ opacity:hasText?.3:1, scale:hasText?.92:1 }} transition={{ duration:.12 }}
                  style={{ display:'flex', alignItems:'center', gap:6, background:isDark?'#2A2A2C':'#F3F3F3', border:'none', cursor:'pointer', borderRadius:20, padding:'6px 12px', pointerEvents:hasText?'none':'auto' }}>
                  <img src="/assets/icons/svg/preview.svg" width={16} height={16} alt="Preview" style={{ filter:isDark?'invert(1)':'none' }} />
                  <span style={{ fontSize:14, fontWeight:500, color:isDark?'#eee':'#333' }}>Preview</span>
                </motion.button>
                <div style={{ position:'relative', width:36, height:36 }}>
                  <AnimatePresence mode="wait">
                    {!hasText ? (
                      <motion.button key="record" initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0, opacity:0 }} transition={{ duration:.12 }} style={sendBtnStyle}>
                        <img src="/assets/icons/svg/record.svg" width={16} height={16} alt="Gravar" style={{ filter:'brightness(0) invert(1)' }} />
                      </motion.button>
                    ) : (
                      <motion.button key="send" initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0, opacity:0 }} transition={{ duration:.12 }} onClick={handleSend} style={{ ...sendBtnStyle, opacity:streaming?.6:1 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
        <InstallPrompt />
      </main>
    </>
  );
}

const appBtn = (isDark: boolean): React.CSSProperties => ({
  width:32, height:32, borderRadius:'50%',
  background:isDark?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.8)',
  border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
  boxShadow:'0 1px 4px rgba(0,0,0,0.08)',
});
const iconBtn = (isDark: boolean): React.CSSProperties => ({
  width:32, height:32, borderRadius:'50%',
  background:isDark?'#2A2A2C':'#F3F3F3',
  border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
});
const sendBtnStyle: React.CSSProperties = {
  position:'absolute', inset:0, borderRadius:'50%',
  background:'#3B82F6', border:'none', cursor:'pointer',
  display:'flex', alignItems:'center', justifyContent:'center',
  boxShadow:'0 2px 10px rgba(59,130,246,0.35)',
};