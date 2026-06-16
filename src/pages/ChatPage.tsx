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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

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

function parseInline(text: string): React.ReactNode[] {
  const cleaned = cleanLatex(text);
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|`(.+?)`|<sup>(.+?)<\/sup>)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
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

// ─── Widget HTML templates ────────────────────────────────────────────────────
function getWidgetHtml(type: string, jsonStr: string, isDark: boolean): string {
  const themeClass = isDark ? 'dark' : '';
  try { JSON.parse(jsonStr); } catch { jsonStr = '{}'; }
  switch (type) {
    case 'widget_bar':     return barChartHtml(jsonStr, themeClass);
    case 'widget_pie':     return pieChartHtml(jsonStr, themeClass);
    case 'widget_table':   return tableHtml(jsonStr, isDark);
    case 'widget_code':    return codeHtml(jsonStr, isDark);
    case 'widget_timer':   return timerHtml(jsonStr, themeClass);
    case 'widget_graph':   return mathGraphHtml(jsonStr, themeClass);
    case 'widget_mindmap': return mindmapHtml(jsonStr, themeClass);
    case 'widget_market':  return marketHtml(jsonStr);
    case 'widget_map':     return mapHtml(jsonStr);
    case 'widget_calendar':return calendarHtml(jsonStr, themeClass);
    case 'widget_sheet':   return sheetHtml(jsonStr, isDark);
    default: return `<body>${jsonStr}</body>`;
  }
}

function barChartHtml(jsonStr: string, cls: string): string {
  const data = JSON.parse(jsonStr);
  const items = (data.items || []) as { label: string; value: number; color?: string }[];
  const max = Math.max(...items.map((i) => i.value), 1);
  const COLORS = ['#6F5AF6','#e74c3c','#27ae60','#f39c12','#3b82f6','#10b981','#ec4899','#8b5cf6'];
  const barsHtml = items.map((item, i) => {
    const pct = (item.value / max) * 100;
    const color = item.color || COLORS[i % COLORS.length];
    return `<div class="item"><div class="value">${item.value}</div><div class="bar-wrap"><div class="bar" style="--h:${pct}%;background:${color};animation-delay:${i * 70}ms"></div></div><div class="label">${item.label}</div></div>`;
  }).join('');
  const legendHtml = items.map((item, i) => {
    const color = item.color || COLORS[i % COLORS.length];
    return `<span class="legend-item"><span class="color-dot" style="background:${color}"></span>${item.label} (${item.value})</span>`;
  }).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:${cls==='dark'?'#121212':'#f4f4f4'};font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;padding:20px;min-height:100vh;}.title{font-size:14px;font-weight:700;color:${cls==='dark'?'#eee':'#222'};margin-bottom:4px;}.chart{width:100%;max-width:480px;display:flex;align-items:flex-end;gap:10px;height:220px;padding:20px 14px;}.item{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;}.value{font-size:12px;font-weight:700;margin-bottom:8px;color:${cls==='dark'?'#eee':'#333'};}.bar-wrap{width:100%;height:150px;display:flex;align-items:flex-end;justify-content:center;}.bar{width:100%;max-width:48px;height:var(--h);border-radius:8px 8px 0 0;transform-origin:bottom;animation:grow 700ms ease-out forwards;transform:scaleY(0);}.label{margin-top:10px;font-size:11px;font-weight:500;color:${cls==='dark'?'#aaa':'#666'};text-align:center;}@keyframes grow{to{transform:scaleY(1);}}.legend{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;font-size:13px;color:${cls==='dark'?'#ccc':'#444'};}.legend-item{display:flex;align-items:center;gap:6px;}.color-dot{width:12px;height:12px;border-radius:4px;display:inline-block;}</style></head><body>
${data.title ? `<div class="title">${data.title}</div>` : ''}<div class="chart">${barsHtml}</div><div class="legend">${legendHtml}</div></body></html>`;
}

function pieChartHtml(jsonStr: string, cls: string): string {
  const data = JSON.parse(jsonStr);
  const slices = (data.slices || []) as { label: string; value: number; color?: string }[];
  const COLORS = ['#2f80ed','#e74c3c','#27ae60','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e'];
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let startAngle = -Math.PI / 2;
  const paths = slices.map((s, i) => {
    const color = s.color || COLORS[i % COLORS.length];
    const sweep = (s.value / total) * 2 * Math.PI;
    const end = startAngle + sweep;
    const x1 = 200 + 140 * Math.cos(startAngle), y1 = 200 + 140 * Math.sin(startAngle);
    const x2 = 200 + 140 * Math.cos(end), y2 = 200 + 140 * Math.sin(end);
    const large = sweep > Math.PI ? 1 : 0;
    const mid = startAngle + sweep / 2;
    const tx = 200 + 90 * Math.cos(mid), ty = 200 + 90 * Math.sin(mid);
    const pct = Math.round(s.value / total * 100);
    const path = `<path d="M200,200 L${x1},${y1} A140,140 0 ${large},1 ${x2},${y2} Z" fill="${color}" stroke="transparent" class="slice"/>${pct >= 5 ? `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="12" font-weight="700">${pct}%</text>` : ''}`;
    startAngle = end;
    return path;
  }).join('');
  const legendHtml = slices.map((s, i) => {
    const color = s.color || COLORS[i % COLORS.length];
    const pct = Math.round(s.value / total * 100);
    return `<span class="legend-item"><span class="dot" style="background:${color}"></span>${s.label} (${pct}%)</span>`;
  }).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:${cls==='dark'?'#121212':'#f4f4f4'};font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:20px;min-height:100vh;}.title{font-size:14px;font-weight:700;color:${cls==='dark'?'#eee':'#333'};}svg{width:min(90vw,300px);height:auto;}.slice{transition:opacity .2s;cursor:pointer;}.slice:hover{opacity:.85;}.legend{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;font-size:13px;color:${cls==='dark'?'#eee':'#333'};}.legend-item{display:flex;align-items:center;gap:5px;}.dot{width:10px;height:10px;border-radius:50%;display:inline-block;}</style></head><body>
${data.title ? `<div class="title">${data.title}</div>` : ''}<svg viewBox="0 0 400 400">${paths}</svg><div class="legend">${legendHtml}</div></body></html>`;
}

function tableHtml(jsonStr: string, isDark: boolean): string {
  const data = JSON.parse(jsonStr);
  const headers = (data.headers || []) as string[];
  const rows = (data.rows || []) as string[][];
  const aligns = (data.align || []) as string[];
  const bodybg   = isDark ? '#121212' : '#f3f3f3';
  const wrapBg   = isDark ? '#1b1b1b' : '#ffffff';
  const headerBg = isDark ? '#252525' : '#f2f2f2';
  const border   = isDark ? '#4a4a4a' : '#bdbdbd';
  const text     = isDark ? '#f4f4f4' : '#222222';
  const headersHtml = headers.map((h, i) => `<th style="text-align:${aligns[i]||'left'}">${h}</th>`).join('');
  const rowsHtml = rows.map(row => `<tr>${row.map((c, i) => `<td style="text-align:${aligns[i]||'left'}">${c}</td>`).join('')}</tr>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>*{box-sizing:border-box;}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:${bodybg};padding:16px;font-family:Georgia,"Times New Roman",serif;color:${text};}.wrap{width:min(100%,560px);border:1.2px solid ${border};background:${wrapBg};overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;}table{width:100%;min-width:300px;border-collapse:collapse;table-layout:auto;background:${wrapBg};}th,td{border:1.2px solid ${border};padding:10px 12px;text-align:left;font-size:16px;line-height:1.2;color:${text};background:${wrapBg};white-space:nowrap;}th{background:${headerBg};font-weight:700;}</style></head><body>
<div class="wrap"><table>${headers.length?`<thead><tr>${headersHtml}</tr></thead>`:''}<tbody>${rowsHtml}</tbody></table></div></body></html>`;
}

function codeHtml(jsonStr: string, isDark: boolean): string {
  const data = JSON.parse(jsonStr);
  const lang = (data.language || 'CODE').toUpperCase();
  const code = (data.code || '') as string;
  const bg = isDark ? '#1b1b1b' : '#ffffff';
  const headerBg = isDark ? '#2a2a2a' : '#f0f0f0';
  const border = isDark ? '#2f2f2f' : '#d7d7d7';
  const text = isDark ? '#e8e8e8' : '#222222';
  const lineNum = isDark ? '#7d7d7d' : '#8a8a8a';
  const titleColor = isDark ? '#f2f2f2' : '#2a2a2a';
  const lines = code.split('\n');
  const linesHtml = lines.map((line, idx) => {
    const safe = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<span class="line" data-n="${idx+1}">${safe}</span>`;
  }).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>*{box-sizing:border-box;}body{margin:0;background:${isDark?'#121212':'#f3f3f3'};display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px;font-family:Arial,sans-serif;}.widget{width:min(100%,760px);background:${bg};border:1.5px solid ${border};border-radius:16px;overflow:hidden;}.hdr{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 12px 0 14px;background:${headerBg};border-bottom:1px solid ${border};}.lang{font-size:13px;font-weight:700;color:${titleColor};letter-spacing:.2px;text-transform:uppercase;}.copy{width:30px;height:30px;border:1px solid ${isDark?'#4a4a4a':'#cfcfcf'};background:${isDark?'#353535':'#fff'};border-radius:10px;cursor:pointer;display:grid;place-items:center;color:${titleColor};}.body{background:${bg};overflow-x:auto;}pre{margin:0;padding:16px 16px 16px 52px;color:${text};font-size:14px;line-height:1.7;white-space:pre;font-family:Consolas,Monaco,monospace;counter-reset:line;}.line{display:block;position:relative;padding-left:8px;}.line::before{counter-increment:line;content:counter(line);position:absolute;left:-38px;width:28px;text-align:right;color:${lineNum};user-select:none;}</style></head><body>
<div class="widget"><div class="hdr"><div class="lang">${lang}</div><button class="copy" onclick="navigator.clipboard.writeText(document.getElementById('code').innerText)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div><div class="body"><pre><code id="code">${linesHtml}</code></pre></div></div></body></html>`;
}

function timerHtml(jsonStr: string, cls: string): string {
  const data = JSON.parse(jsonStr);
  const ms = data.milliseconds || 0;
  const countdown = !!data.countdown;
  const label = data.label || '';
  const bg = cls === 'dark' ? '#121212' : '#f4f4f4';
  const cardBg = cls === 'dark' ? '#1b1b1b' : '#fff';
  const textColor = cls === 'dark' ? '#eee' : '#222';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:${bg};display:grid;place-items:center;min-height:100vh;font-family:'SF Mono','Fira Code',Consolas,monospace;padding:20px;}.card{background:${cardBg};border-radius:24px;box-shadow:0 12px 30px rgba(0,0,0,0.15);padding:24px 32px;display:flex;flex-direction:column;align-items:center;gap:16px;}.label{font-size:13px;color:${cls==='dark'?'#888':'#666'};}.display{font-size:clamp(2rem,7vw,3rem);font-weight:800;color:${textColor};letter-spacing:2px;}.btns{display:flex;gap:10px;}.btn{width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;background:#3B82F6;color:#fff;font-size:18px;}</style></head><body>
<div class="card">${label?`<div class="label">${label}</div>`:''}<div class="display" id="d">00:00:00:00</div><div class="btns"><button class="btn" onclick="toggle()">▶</button><button class="btn" onclick="reset()">↺</button></div></div>
<script>let startMs=${countdown&&ms>0?ms:0};let elapsed=${countdown&&ms>0?ms:0};let startTime=0,running=false,raf=null,isCountdown=${countdown&&ms>0};function fmt(ms){const cs=Math.floor(ms/10)%100,s=Math.floor(ms/1000)%60,m=Math.floor(ms/60000)%60,h=Math.floor(ms/3600000);return[h,m,s,cs].map(x=>String(x).padStart(2,'0')).join(':');}function tick(){const now=performance.now();if(isCountdown){elapsed=Math.max(0,startMs-(now-startTime));if(elapsed===0){running=false;}}else{elapsed=startMs+(now-startTime);}document.getElementById('d').textContent=fmt(elapsed);if(running)raf=requestAnimationFrame(tick);}function toggle(){if(running){running=false;cancelAnimationFrame(raf);startMs=elapsed;}else{running=true;startTime=performance.now();tick();}}function reset(){running=false;cancelAnimationFrame(raf);elapsed=${countdown&&ms>0?ms:0};startMs=elapsed;document.getElementById('d').textContent=fmt(elapsed);}${data.autoStart!==false?'toggle();':''}<\/script></body></html>`;
}

function mathGraphHtml(jsonStr: string, cls: string): string {
  const data = JSON.parse(jsonStr);
  const expr = data.expression || 'sin(x)';
  const xMin = data.xMin ?? -10;
  const xMax = data.xMax ?? 10;
  const title = data.title || '';
  const bg = cls === 'dark' ? '#121212' : '#f4f4f4';
  const gridColor = cls === 'dark' ? '#2a2a2a' : '#e0e0e0';
  const axisColor = cls === 'dark' ? '#ccc' : '#555';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.8.0/math.min.js"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:${bg};display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px;flex-direction:column;gap:8px;font-family:Arial,sans-serif;}.title{font-size:14px;font-weight:700;color:${cls==='dark'?'#eee':'#222'};}canvas{background:transparent;display:block;}</style></head><body>
${title?`<div class="title">${title}</div>`:''}<canvas id="c" width="480" height="280"></canvas>
<script>const c=document.getElementById('c');const ctx=c.getContext('2d');const xMin=${xMin},xMax=${xMax};const pad={t:30,b:30,l:40,r:20};const pw=c.width-pad.l-pad.r,ph=c.height-pad.t-pad.b;const f=math.compile(${JSON.stringify(expr)});const pts=[];for(let i=0;i<=400;i++){const x=xMin+(xMax-xMin)*i/400;try{const y=f.evaluate({x});if(isFinite(y))pts.push([x,y]);}catch(e){}}if(!pts.length){ctx.fillStyle='#888';ctx.fillText('Sem dados',20,20);}else{const yMin=Math.min(...pts.map(p=>p[1])),yMax=Math.max(...pts.map(p=>p[1]));const yr=(yMax-yMin)||1,xr=xMax-xMin;const mx=x=>pad.l+(x-xMin)/xr*pw;const my=y=>pad.t+ph-(y-yMin)/yr*ph;ctx.strokeStyle='${gridColor}';ctx.lineWidth=1;for(let i=0;i<=4;i++){ctx.beginPath();ctx.moveTo(pad.l,pad.t+ph*i/4);ctx.lineTo(pad.l+pw,pad.t+ph*i/4);ctx.stroke();ctx.beginPath();ctx.moveTo(pad.l+pw*i/4,pad.t);ctx.lineTo(pad.l+pw*i/4,pad.t+ph);ctx.stroke();}ctx.strokeStyle='${axisColor}';ctx.lineWidth=1.5;if(yMin<=0&&yMax>=0){ctx.beginPath();ctx.moveTo(pad.l,my(0));ctx.lineTo(pad.l+pw,my(0));ctx.stroke();}if(xMin<=0&&xMax>=0){ctx.beginPath();ctx.moveTo(mx(0),pad.t);ctx.lineTo(mx(0),pad.t+ph);ctx.stroke();}ctx.fillStyle='${cls==='dark'?'#888':'#999'}';ctx.font='10px Arial';ctx.textAlign='center';ctx.fillText(${JSON.stringify(expr)},pad.l+pw/2,pad.t-8);ctx.strokeStyle='#6cb6ff';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.beginPath();pts.forEach(([x,y],i)=>i===0?ctx.moveTo(mx(x),my(y)):ctx.lineTo(mx(x),my(y)));ctx.stroke();}<\/script></body></html>`;
}

function mindmapHtml(jsonStr: string, cls: string): string {
  const bg = cls === 'dark' ? '#1b1b1b' : '#fff';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:${cls==='dark'?'#121212':'#f4f4f4'};min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;padding:16px;}.card{width:min(90vw,500px);height:380px;background:${bg};border-radius:20px;overflow:hidden;position:relative;}svg{width:100%;height:100%;}.node rect{stroke-width:1.8;rx:8;}.node text{fill:#fff;font-size:12px;font-weight:600;text-anchor:middle;dominant-baseline:central;pointer-events:none;}.link{stroke:${cls==='dark'?'#666':'#bbb'};stroke-width:1.8;fill:none;stroke-linecap:round;}</style></head><body>
<div class="card"><svg id="svg"><g id="g"></g></svg></div>
<script>const data=${jsonStr};const svg=document.getElementById('svg');const g=document.getElementById('g');const LW=160,NH=36,NP=24,VS=NH+NP;function gh(n,col){if(col[n.id]||!n.children||!n.children.length)return VS;return n.children.reduce((s,c)=>s+gh(c,col),0);}function layout(n,x,y,col){const pos={};const h=gh(n,col);pos[n.id]={x,y:y+h/2};if(!col[n.id]&&n.children){let cy=y;n.children.forEach(c=>{const ch=gh(c,col);Object.assign(pos,layout(c,x+LW,cy,col));cy+=ch;});}return pos;}function render(){g.innerHTML='';const pos=layout(data,40,20,{});function drawLinks(n){if(!n.children)return;n.children.forEach(c=>{const f=pos[n.id],t=pos[c.id];if(f&&t){const p=document.createElementNS('http://www.w3.org/2000/svg','path');const dx=t.x-f.x;p.setAttribute('d',\`M\${f.x},\${f.y} C\${f.x+dx*.5},\${f.y} \${t.x-dx*.5},\${t.y} \${t.x},\${t.y}\`);p.setAttribute('class','link');g.appendChild(p);}drawLinks(c);});}function drawNodes(n){const{x,y}=pos[n.id]||{x:0,y:0};const ng=document.createElementNS('http://www.w3.org/2000/svg','g');ng.setAttribute('class','node');const tw=Math.max(70,n.label.length*7+24),th=NH;const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('x',-tw/2);rect.setAttribute('y',-th/2);rect.setAttribute('width',tw);rect.setAttribute('height',th);rect.setAttribute('fill',n.color||'#6F5AF6');rect.setAttribute('rx',8);ng.appendChild(rect);const txt=document.createElementNS('http://www.w3.org/2000/svg','text');txt.textContent=n.label;ng.appendChild(txt);ng.setAttribute('transform',\`translate(\${x},\${y})\`);g.appendChild(ng);if(n.children)n.children.forEach(drawNodes);}drawLinks(data);drawNodes(data);const all=Object.values(pos);const xs=all.map(p=>p.x),ys=all.map(p=>p.y);const vx=Math.min(...xs)-80,vy=Math.min(...ys)-30,vw=Math.max(...xs)-vx+120,vh=Math.max(...ys)-vy+60;svg.setAttribute('viewBox',\`\${vx} \${vy} \${vw} \${vh}\`);}render();<\/script></body></html>`;
}

function marketHtml(jsonStr: string): string {
  const data = JSON.parse(jsonStr);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#f2f2f2;display:grid;place-items:center;min-height:100vh;padding:16px;font-family:Arial,sans-serif;}.widget{width:min(92vw,420px);background:#111318;border-radius:24px;overflow:hidden;}.info{display:flex;align-items:center;justify-content:space-between;padding:20px 16px 8px;}.left{display:flex;align-items:center;gap:12px;}.logo{width:44px;height:44px;border-radius:50%;background:#1e2128;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;}.name{font-size:15px;font-weight:700;color:#fff;}.sym{font-size:12px;color:#555;margin-top:2px;}.price{font-size:22px;font-weight:800;color:#fff;text-align:right;}.chg{display:inline-block;font-size:12px;font-weight:700;padding:3px 8px;border-radius:6px;margin-top:4px;}.up{background:#0d2e1a;color:#22c55e;}.down{background:#2e0d0d;color:#ef4444;}canvas{display:block;width:calc(100% - 20px);margin:0 10px;height:130px;}.tfs{display:flex;justify-content:center;gap:4px;padding:8px 16px 16px;}.tf{background:none;border:none;color:#444;font-size:12px;font-weight:700;padding:5px 12px;border-radius:8px;cursor:pointer;}.tf.a{background:#1e2128;color:#fff;}</style></head><body>
<div class="widget"><div class="info"><div class="left"><div class="logo">${(data.symbol||data.name||'?').slice(0,3)}</div><div><div class="name">${data.name||'Ativo'}</div><div class="sym">${data.symbol||''} · ${(data.type||'').toUpperCase()}</div></div></div><div><div class="price">${data.price_str||(data.price?'$'+Number(data.price).toFixed(2):'—')}</div>${data.change!=null?`<div class="chg ${data.change>=0?'up':'down'}">${data.change>=0?'▲ +':'▼ '}${Math.abs(data.change).toFixed(2)}%</div>`:''}</div></div><canvas id="c"></canvas><div class="tfs"><button class="tf a">1D</button><button class="tf">1S</button><button class="tf">1M</button><button class="tf">3M</button><button class="tf">1A</button></div></div>
<script>const c=document.getElementById('c');const ctx=c.getContext('2d');const isUp=${(data.change||0)>=0};const color=isUp?'#22c55e':'#ef4444';let prices=${JSON.stringify(data.history||[])};if(!prices.length){const base=${data.price||100};let p=base*0.9;for(let i=0;i<42;i++){p+=(Math.random()-(isUp?.46:.54))*p*.02;prices.push(Math.max(p,.01));}prices.push(base);}function draw(){const W=c.offsetWidth||400,H=130;c.width=W*devicePixelRatio;c.height=H*devicePixelRatio;c.style.height=H+'px';ctx.scale(devicePixelRatio,devicePixelRatio);const min=Math.min(...prices),max=Math.max(...prices),range=max-min||1;const pad=10;const pw=W-pad*2,ph=H-pad*2;const pts=prices.map((v,i)=>({x:pad+i/(prices.length-1)*pw,y:pad+ph-(v-min)/range*ph}));const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,color+'55');grad.addColorStop(1,color+'00');ctx.beginPath();ctx.moveTo(pts[0].x,H);pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(pts.at(-1).x,H);ctx.closePath();ctx.fillStyle=grad;ctx.fill();ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.stroke();const last=pts.at(-1);ctx.beginPath();ctx.arc(last.x,last.y,4,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}window.addEventListener('resize',draw);draw();<\/script></body></html>`;
}

function mapHtml(jsonStr: string): string {
  const data = JSON.parse(jsonStr);
  const lat = data.lat || 0, lng = data.lng || 0, loc = data.location || 'Localização', zoom = data.zoom || 14;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://unpkg.com/maplibre-gl@4.3.2/dist/maplibre-gl.css" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#f0f2f5;display:grid;place-items:center;min-height:100vh;font-family:system-ui,sans-serif;padding:16px;}.card{width:min(90vw,400px);height:340px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.1);}#map{width:100%;height:280px;}.footer{padding:10px 14px;display:flex;align-items:center;gap:8px;}.pin{color:#FF3B30;font-size:18px;}.name{font-size:14px;font-weight:600;color:#222;}.maplibregl-ctrl-logo,.maplibregl-ctrl-attrib,.maplibregl-ctrl-group{display:none!important;}</style></head><body>
<div class="card"><div id="map"></div><div class="footer"><span class="pin">📍</span><span class="name">${loc}</span></div></div>
<script src="https://unpkg.com/maplibre-gl@4.3.2/dist/maplibre-gl.js"><\/script>
<script>const map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/liberty',center:[${lng},${lat}],zoom:${zoom},attributionControl:false});map.on('load',()=>new maplibregl.Marker({color:'#FF3B30'}).setLngLat([${lng},${lat}]).addTo(map));<\/script></body></html>`;
}

function calendarHtml(jsonStr: string, cls: string): string {
  const data = JSON.parse(jsonStr);
  const eventsJson = JSON.stringify(data.events || {});
  const isDark = cls === 'dark';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>*{box-sizing:border-box;margin:0;padding:0;}:root{--bg:${isDark?'#121212':'#f4f4f4'};--card:${isDark?'#1b1b1b':'#fff'};--border:${isDark?'#333':'#e0e0e0'};--text:${isDark?'#eee':'#222'};--muted:${isDark?'#888':'#999'};--sel:${isDark?'#7c3aed':'#6F5AF6'};--today:${isDark?'#2a2a40':'#ede9ff'};}body{background:var(--bg);display:grid;place-items:center;min-height:100vh;padding:16px;font-family:system-ui,sans-serif;}.cal{width:min(92vw,380px);background:var(--card);border:1.5px solid var(--border);border-radius:20px;padding:16px;}.hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}.title{font-size:16px;font-weight:700;color:var(--text);}.nav{background:${isDark?'#2a2a2a':'#f5f5f5'};border:none;border-radius:10px;width:32px;height:32px;cursor:pointer;color:var(--text);font-size:18px;display:grid;place-items:center;}.wdays{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:6px;}.wdays span{text-align:center;font-size:11px;font-weight:600;color:var(--muted);padding:3px 0;}.grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}.day{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:13px;color:var(--text);cursor:pointer;position:relative;}.day.other{opacity:.3;cursor:default;}.day.today{background:var(--today);color:${isDark?'#a78bfa':'#6F5AF6'};font-weight:700;}.day.sel{background:var(--sel);color:#fff;font-weight:700;}.day.has::after{content:'';position:absolute;bottom:2px;width:4px;height:4px;border-radius:50%;background:var(--sel);}.day.sel.has::after{background:#fff;}.evts{margin-top:12px;border-top:1px solid var(--border);padding-top:10px;}.elbl{font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px;text-transform:uppercase;}.eitem{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:${isDark?'#252535':'#f7f6ff'};margin-bottom:5px;}.edot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}.ename{font-size:13px;font-weight:600;color:var(--text);}.etime{font-size:11px;color:var(--muted);}.none{font-size:13px;color:var(--muted);text-align:center;padding:8px;}</style></head><body>
<div class="cal"><div class="hdr"><button class="nav" id="pv">‹</button><div class="title" id="ttl"></div><button class="nav" id="nx">›</button></div><div class="wdays"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div><div class="grid" id="gr"></div><div class="evts"><div class="elbl">Eventos do dia</div><div id="el"></div></div></div>
<script>const ev=${eventsJson};const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];const td=new Date();td.setHours(0,0,0,0);let cur=new Date(td.getFullYear(),td.getMonth(),1);let sel=dk(td.getFullYear(),td.getMonth(),td.getDate());function dk(y,m,d){return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');}function render(){const y=cur.getFullYear(),m=cur.getMonth();document.getElementById('ttl').textContent=months[m]+' '+y;const fd=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate(),prev=new Date(y,m,0).getDate();const gr=document.getElementById('gr');gr.innerHTML='';for(let i=fd-1;i>=0;i--){const d=document.createElement('div');d.className='day other';d.textContent=prev-i;gr.appendChild(d);}for(let d=1;d<=dim;d++){const key=dk(y,m,d),date=new Date(y,m,d);const isToday=date.getTime()===td.getTime(),isSel=key===sel,hasEv=!!(ev[key]&&ev[key].length);const el=document.createElement('div');el.className='day'+(isToday?' today':'')+(isSel?' sel':'')+(hasEv?' has':'');el.textContent=d;el.onclick=()=>{sel=key;render();};gr.appendChild(el);}const used=fd+dim,rem=used%7===0?0:7-used%7;for(let d=1;d<=rem;d++){const el=document.createElement('div');el.className='day other';el.textContent=d;gr.appendChild(el);}renderEvents();}function renderEvents(){const el=document.getElementById('el');el.innerHTML='';const dayEv=ev[sel];if(!dayEv||!dayEv.length){el.innerHTML='<div class="none">Nenhum evento</div>';return;}dayEv.forEach(e=>{el.innerHTML+=\`<div class="eitem"><div class="edot" style="background:\${e.color||'#6F5AF6'}"></div><div><div class="ename">\${e.name}</div>\${e.time?'<div class="etime">'+e.time+'</div>':''}</div></div>\`;});}document.getElementById('pv').onclick=()=>{cur.setMonth(cur.getMonth()-1);render();};document.getElementById('nx').onclick=()=>{cur.setMonth(cur.getMonth()+1);render();};render();<\/script></body></html>`;
}

function sheetHtml(jsonStr: string, isDark: boolean): string {
  const data = JSON.parse(jsonStr);
  const lines = (data.lines || []) as { text: string; title?: boolean }[];
  const bg = isDark ? '#1E1E1E' : '#fffef8';
  const border = isDark ? '#2A2A2A' : '#d6d6d6';
  const text = isDark ? '#eee' : '#222';
  const ruleColor = isDark ? 'rgba(95,145,255,0.08)' : 'rgba(95,145,255,0.16)';
  const marginColor = isDark ? 'rgba(255,90,90,0.12)' : 'rgba(255,90,90,0.20)';
  const linesHtml = lines.map((l, i) =>
    `<text x="72" y="${34 + (i + 1) * 32 - 10}" font-size="${l.title ? '16' : '14'}" font-weight="${l.title ? '700' : '400'}" fill="${text}" font-family="Arial,sans-serif">${l.text}</text>`
  ).join('');
  const totalH = 34 + lines.length * 32 + 16;
  const rulesHtml = Array.from({ length: Math.ceil(totalH / 32) + 1 }, (_, i) =>
    `<line x1="0" y1="${i * 32}" x2="2000" y2="${i * 32}" stroke="${ruleColor}" stroke-width="1"/>`
  ).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:${isDark?'#121212':'#f3f3f3'};display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px;font-family:Arial,sans-serif;}.paper{width:min(92vw,620px);border:1px solid ${border};background:${bg};overflow:hidden;}</style></head><body>
<div class="paper"><svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${totalH}" viewBox="0 0 620 ${totalH}">${rulesHtml}<line x1="56" y1="0" x2="56" y2="${totalH}" stroke="${marginColor}" stroke-width="1"/>${linesHtml}</svg></div></body></html>`;
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
    const widgetType = m[1];
    const jsonStr = m[2].trim();
    const html = getWidgetHtml(widgetType, jsonStr, isDark);
    const height = getWidgetHeight(widgetType);
    parts.push(
      <iframe key={key++} srcDoc={html} style={{ width: '100%', height, border: 'none', borderRadius: 14, display: 'block', marginTop: 8, marginBottom: 8 }} sandbox="allow-scripts" scrolling="no" />
    );
    last = m.index + m[0].length;
  }
  const after = text.slice(last).trim();
  if (after) parts.push(<TextBlock key={key++} text={after} isDark={isDark} />);
  return <>{parts}</>;
}

function getWidgetHeight(type: string): number {
  switch (type) {
    case 'widget_bar': return 320;
    case 'widget_pie': return 340;
    case 'widget_table': return 200;
    case 'widget_code': return 300;
    case 'widget_timer': return 200;
    case 'widget_graph': return 340;
    case 'widget_mindmap': return 420;
    case 'widget_market': return 320;
    case 'widget_map': return 380;
    case 'widget_calendar': return 480;
    case 'widget_sheet': return 300;
    default: return 280;
  }
}

function TextBlock({ text, isDark }: { text: string; isDark: boolean }) {
  const textColor = isDark ? '#eee' : '#1a1a1a';
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
    const wrapBg   = isDark ? '#1b1b1b' : '#ffffff';
    const headerBg = isDark ? '#252525' : '#f2f2f2';
    const border   = isDark ? '#4a4a4a' : '#bdbdbd';
    const cellText = isDark ? '#f4f4f4' : '#222222';
    return (
      <>
        {before && <TextBlock text={before} isDark={isDark} />}
        <div style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', marginTop: 8, marginBottom: 8, border: `1.2px solid ${border}`, background: wrapBg }}>
          <table style={{ width: '100%', minWidth: 300, borderCollapse: 'collapse', tableLayout: 'auto', background: wrapBg, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 16 }}>
            <thead>
              <tr>{cells(dataLines[0] || '').map((h, ci) => (
                <th key={ci} style={{ border: `1.2px solid ${border}`, padding: '10px 12px', background: headerBg, color: cellText, fontWeight: 700, textAlign: 'left', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{parseInline(h)}</th>
              ))}</tr>
            </thead>
            <tbody>
              {dataLines.slice(1).map((row, ri) => (
                <tr key={ri}>{cells(row).map((c, ci) => (
                  <td key={ci} style={{ border: `1.2px solid ${border}`, padding: '10px 12px', color: cellText, background: wrapBg, textAlign: 'left', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{parseInline(c)}</td>
                ))}</tr>
              ))}
            </tbody>
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
        <div style={{ borderRadius: 14, border: `1.5px solid ${cbBorder}`, overflow: 'hidden', marginTop: 8, marginBottom: 8, background: cbBg }}>
          <div style={{ background: cbHeader, padding: '0 12px', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${cbBorder}` }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: cbTitle, letterSpacing: '.2px' }}>{lang}</span>
            <button onClick={() => navigator.clipboard?.writeText(codeLines.join('\n'))} style={{ background: isDark ? '#353535' : '#fff', border: `1px solid ${isDark ? '#4a4a4a' : '#cfcfcf'}`, borderRadius: 8, cursor: 'pointer', padding: '3px 8px', color: cbTitle, fontSize: 11 }}>Copiar</button>
          </div>
          <div style={{ overflowX: 'auto', padding: '14px 14px 14px 48px', background: cbBg, position: 'relative' }}>
            {codeLines.map((line, li) => (
              <div key={li} style={{ display: 'flex', position: 'relative', lineHeight: '1.7' }}>
                <span style={{ position: 'absolute', left: -36, width: 28, textAlign: 'right', color: lineNumColor, fontSize: 12, fontFamily: 'monospace', userSelect: 'none' }}>{li + 1}</span>
                <span style={{ fontFamily: 'Consolas,Monaco,monospace', fontSize: 13, color: cbText, whiteSpace: 'pre' }}>{line || ' '}</span>
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
    if (t.startsWith('### ')) return <div key={li} style={{ fontSize: 15, fontWeight: 700, color: textColor, margin: '8px 0 4px' }}>{parseInline(t.slice(4))}</div>;
    if (t.startsWith('## ') || t.startsWith('# ')) {
      const lvl = t.startsWith('## ') ? 3 : 2;
      return <div key={li} style={{ fontSize: lvl === 2 ? 18 : 16, fontWeight: 700, color: textColor, margin: '10px 0 4px' }}>{parseInline(t.replace(/^#+\s/, ''))}</div>;
    }
    if (t.startsWith('* ') || t.startsWith('- ') || t.startsWith('• ')) {
      return (
        <div key={li} style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
          <span style={{ color: textColor, flexShrink: 0, marginTop: 2 }}>•</span>
          <span style={{ fontSize: 15, lineHeight: 1.6, color: textColor }}>{parseInline(t.slice(2))}</span>
        </div>
      );
    }
    if (t.match(/^\d+\.\s/)) {
      const num = t.match(/^(\d+)\./)?.[1];
      return (
        <div key={li} style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
          <span style={{ color: textColor, flexShrink: 0, minWidth: 18 }}>{num}.</span>
          <span style={{ fontSize: 15, lineHeight: 1.6, color: textColor }}>{parseInline(t.replace(/^\d+\.\s/, ''))}</span>
        </div>
      );
    }
    if (t.startsWith('> ')) {
      return <div key={li} style={{ borderLeft: `3px solid ${isDark ? '#555' : '#ccc'}`, paddingLeft: 12, marginBottom: 4, color: isDark ? '#aaa' : '#666', fontStyle: 'italic', fontSize: 14 }}>{parseInline(t.slice(2))}</div>;
    }
    if (t.match(/^[-=]{3,}$/)) return <hr key={li} style={{ border: 'none', borderTop: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, margin: '8px 0' }} />;
    return <div key={li} style={{ fontSize: 15, lineHeight: 1.6, color: textColor, marginBottom: 2 }}>{parseInline(t)}</div>;
  });

  return <>{rendered}</>;
}

// ─── Add Options Sheet ────────────────────────────────────────────────────────
function AddOptionsSheet({ open, onClose, isDark }: { open: boolean; onClose: () => void; isDark: boolean }) {
  const sheetBg = isDark ? '#1C1C1E' : '#fff';
  const textColor = isDark ? '#eee' : '#1a1a1a';
  const iconBg = isDark ? '#2A2A2C' : '#F3F3F3';

  const options = [
    { icon: '/assets/icons/svg/camera.svg',   label: 'Câmara',       action: () => {} },
    { icon: '/assets/icons/svg/download.svg', label: 'Ficheiro',     action: () => {} },
    { icon: '/assets/icons/svg/find.svg',     label: 'Pesquisar',    action: () => {} },
    { icon: '/assets/icons/svg/flash.svg',    label: 'Ferramentas',  action: () => {} },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="add-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.25)' }}
          />
          <motion.div
            key="add-sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201,
              background: sheetBg,
              borderRadius: '20px 20px 0 0',
              padding: '12px 0 40px',
            }}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: isDark ? '#3A3A3C' : '#E0E0E0', margin: '0 auto 20px' }} />

            <p style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#888' : '#8E8E93', textAlign: 'center', marginBottom: 20, letterSpacing: 0.3 }}>
              ADICIONAR
            </p>

            {/* Grid de opções */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '0 20px' }}>
              {options.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => { opt.action(); onClose(); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px',
                  }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={opt.icon} width={22} height={22} alt={opt.label} style={{ filter: isDark ? 'invert(1)' : 'none' }} />
                  </div>
                  <span style={{ fontSize: 12, color: textColor, fontWeight: 500 }}>{opt.label}</span>
                </button>
              ))}
            </div>
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
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const ta = textareaRef.current; if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [inputValue]);

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
      (chunk) => { fullReply += chunk; setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: fullReply }; return u; }); },
      async () => {
        setStreaming(false);
        const final: Message[] = [...newMessages, { role: 'assistant', content: fullReply }];
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

  // Claro: topo branco puro, base com toque primário muito subtil
  const bgTop    = isDark ? '#111111' : '#ffffff';
  const bgBottom = isDark ? '#111111' : '#F0EEFF';
  const pageBg   = isDark
    ? '#111111'
    : `linear-gradient(to bottom, ${bgTop} 0%, ${bgTop} 60%, ${bgBottom} 100%)`;

  const inputBg  = isDark ? '#1C1C1E' : '#fff';
  const textColor = isDark ? '#eee' : '#1a1a1a';

  const handlePin     = async (conv: Conversation) => { await apiPinConversation(token, conv.id, !conv.pinned); setOptionsConv(null); loadConversations(); };
  const handleArchive = async (conv: Conversation) => { await apiArchiveConversation(token, conv.id, true); setOptionsConv(null); if (activeConv?.id === conv.id) newChat(); loadConversations(); };
  const handleDelete  = async (conv: Conversation) => { await apiDeleteConversation(token, conv.id); setOptionsConv(null); if (activeConv?.id === conv.id) newChat(); loadConversations(); };

  return (
    <>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} conversations={conversations} activeId={activeConv?.id || ''} userName={user.name} onSelect={selectConversation} onNewChat={newChat} onLongPress={c => setOptionsConv(c)} />

      {/* Conversation options sheet */}
      <AnimatePresence>
        {optionsConv && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOptionsConv(null)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.3)' }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201, background: isDark ? '#1C1C1E' : '#fff', borderRadius: '14px 14px 0 0', padding: '8px 0 32px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: isDark ? '#3A3A3C' : '#E0E0E0', margin: '8px auto 12px' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: textColor, padding: '0 20px 12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{optionsConv.title}</p>
              {[
                { label: optionsConv.pinned ? 'Desafixar' : 'Fixar conversa', action: () => handlePin(optionsConv), color: textColor },
                { label: 'Arquivar conversa', action: () => handleArchive(optionsConv), color: textColor },
                { label: 'Eliminar conversa', action: () => handleDelete(optionsConv), color: '#FF3B30' },
              ].map(opt => (
                <button key={opt.label} onClick={opt.action} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '0 20px', height: 52, background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: opt.color }}>
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add options sheet */}
      <AddOptionsSheet open={addSheetOpen} onClose={() => setAddSheetOpen(false)} isDark={isDark} />

      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: pageBg }}>
        {/* AppBar blur */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, height: 80, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', inset: 0,
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
            background: isDark
              ? 'linear-gradient(to bottom, #111111F5 0%, #111111B0 70%, transparent 100%)'
              : 'linear-gradient(to bottom, #ffffffF5 0%, #ffffffB0 70%, transparent 100%)',
          }} />
        </div>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
          <button onClick={() => setDrawerOpen(true)} style={appBtn(isDark)}><img src="/assets/icons/svg/menu.svg" width={16} height={16} alt="" /></button>
          <button onClick={newChat} style={appBtn(isDark)}><img src="/assets/icons/svg/new_chat.svg" width={16} height={16} alt="" /></button>
        </div>

        {/* Content */}
        {!hasChat ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 160 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <motion.img src="/assets/icons/png/logo.png" width={72} height={72} style={{ borderRadius: 18 }} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }} alt="Nexa" />
              <h1 style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'Georgia, serif', color: textColor, margin: 0 }}>{getGreeting()}</h1>
              <p style={{ color: isDark ? '#888' : '#8E8E93', fontSize: 15, margin: 0 }}>Em que estás a pensar?</p>
            </motion.div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '88px 16px 150px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                {msg.role === 'user' ? (
                  <div style={{ maxWidth: '78%', padding: '10px 14px', borderRadius: '18px 18px 4px 18px', background: '#3B82F6', color: '#fff', fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.content}
                  </div>
                ) : (
                  <div style={{ width: '100%', paddingRight: 16 }}>
                    {streaming && i === messages.length - 1 && !msg.content ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '8px 0' }}>
                        {[0, 1, 2].map(j => (
                          <motion.div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6' }}
                            animate={{ y: [0, -5, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: j * 0.15 }} />
                        ))}
                      </div>
                    ) : (
                      <MessageContent content={msg.content} isDark={isDark} />
                    )}
                    {!streaming && msg.content && i === messages.length - 1 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        {[
                          { icon: '/assets/icons/svg/copy.svg', action: () => navigator.clipboard?.writeText(msg.content) },
                          { icon: '/assets/icons/svg/thumbs_up.svg', action: () => {} },
                          { icon: '/assets/icons/svg/thumbs_down.svg', action: () => {} },
                          { icon: '/assets/icons/svg/share.svg', action: () => {} },
                        ].map((btn, bi) => (
                          <button key={bi} onClick={btn.action} style={{ width: 32, height: 32, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                            <img src={btn.icon} width={15} height={15} alt="" style={{ filter: isDark ? 'invert(1)' : 'none' }} />
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

        {/* Input — rocho apenas em baixo */}
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: bottomOffset, padding: '0 12px 24px', transition: 'bottom 0.2s ease' }}>
          <div style={{
            background: inputBg,
            borderRadius: '16px 16px 24px 24px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
            padding: '12px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
            border: isDark ? '1px solid #2A2A2C' : 'none',
          }}>
            <textarea ref={textareaRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder="Pergunta algo..." rows={1}
              style={{ width: '100%', resize: 'none', background: 'transparent', border: 'none', outline: 'none', fontSize: 15, color: textColor, lineHeight: 1.5, maxHeight: 140, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Botão + abre o AddSheet */}
              <button onClick={() => setAddSheetOpen(true)} style={iconBtn(isDark)}>
                <img src="/assets/icons/svg/add.svg" width={16} height={16} alt="+" style={{ filter: isDark ? 'invert(1)' : 'none' }} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <motion.button animate={{ opacity: hasText ? 0.3 : 1, scale: hasText ? 0.92 : 1 }} transition={{ duration: 0.12 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: isDark ? '#2A2A2C' : '#F3F3F3', border: 'none', cursor: 'pointer', borderRadius: 20, padding: '6px 12px', pointerEvents: hasText ? 'none' : 'auto' }}>
                  <img src="/assets/icons/svg/preview.svg" width={16} height={16} alt="Preview" style={{ filter: isDark ? 'invert(1)' : 'none' }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: isDark ? '#eee' : '#333' }}>Preview</span>
                </motion.button>
                <div style={{ position: 'relative', width: 36, height: 36 }}>
                  <AnimatePresence mode="wait">
                    {!hasText ? (
                      <motion.button key="record" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.12 }} style={sendBtnStyle}>
                        <img src="/assets/icons/svg/record.svg" width={16} height={16} alt="Gravar" style={{ filter: 'brightness(0) invert(1)' }} />
                      </motion.button>
                    ) : (
                      <motion.button key="send" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.12 }} onClick={handleSend} style={{ ...sendBtnStyle, opacity: streaming ? 0.6 : 1 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
  width: 32, height: 32, borderRadius: '50%',
  background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
});

const iconBtn = (isDark: boolean): React.CSSProperties => ({
  width: 32, height: 32, borderRadius: '50%',
  background: isDark ? '#2A2A2C' : '#F3F3F3',
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
});

const sendBtnStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, borderRadius: '50%',
  background: '#3B82F6', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 2px 10px rgba(59,130,246,0.35)',
};