// widgets.js — versão corrigida com ícone de copiar reduzido

/* ==========================================================================
   Helpers
   ========================================================================== */

function _isDark() {
    return typeof isDarkMode !== 'undefined' ? !!isDarkMode : false;
}

function _ensureStyle(id, cssText) {
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = cssText;
    document.head.appendChild(s);
}

function _escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function _copyText(text) {
    return navigator.clipboard?.writeText?.(text)
        .then(() => true)
        .catch(async () => {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                ta.style.top = '0';
                document.body.appendChild(ta);
                ta.select();
                ta.setSelectionRange(0, ta.value.length);
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                return ok;
            } catch {
                return false;
            }
        });
}

function _showToast(el, text) {
    el.textContent = text;
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    el.style.pointerEvents = 'none';
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-4px)';
    }, 1000);
}

/* ==========================================================================
   TABLE
   ========================================================================== */

function renderNativeTable(container, json) {
    const dark = _isDark();
    const borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)';
    const bgColor = dark ? '#1b1b1b' : '#ffffff';
    const headerBg = dark ? '#232323' : '#f4f4f4';
    const textColor = dark ? '#f4f4f4' : '#222';
    const shadowColor = dark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.08)';

    const wrap = document.createElement('div');
    wrap.style.cssText = `width:min(100%,560px);border-radius:6px;background:${bgColor};overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;margin:6px auto;box-shadow:0 0 0 1px ${borderColor},0 6px 16px ${shadowColor};`;

    const table = document.createElement('table');
    table.style.cssText = `width:100%;min-width:520px;border-collapse:separate;border-spacing:0;table-layout:auto;background:${bgColor};`;

    const headers = json.headers || [];
    if (headers.length) {
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        headers.forEach((h, i) => {
            const th = document.createElement('th');
            let style = `border-bottom:1px solid ${dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.16)'};border-right:1px solid ${borderColor};padding:10px 12px;text-align:left;font-size:16px;line-height:1.2;color:${textColor};background:${headerBg};font-weight:700;font-family:Georgia,"Times New Roman",serif;white-space:nowrap;`;
            if (i === headers.length - 1) style += 'border-right:none;';
            th.style.cssText = style;
            th.textContent = h;
            tr.appendChild(th);
        });
        thead.appendChild(tr);
        table.appendChild(thead);
    }

    const tbody = document.createElement('tbody');
    (json.rows || []).forEach((row, ri) => {
        const tr = document.createElement('tr');
        row.forEach((cell, i) => {
            const td = document.createElement('td');
            let style = `border-bottom:1px solid ${borderColor};border-right:1px solid ${borderColor};padding:10px 12px;text-align:${i > 0 ? 'center' : 'left'};font-size:16px;line-height:1.2;color:${textColor};background:${bgColor};font-family:Georgia,"Times New Roman",serif;white-space:nowrap;`;
            if (i === row.length - 1) style += 'border-right:none;';
            if (ri === (json.rows || []).length - 1) style += 'border-bottom:none;';
            td.style.cssText = style;
            td.textContent = cell;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);
}

/* ==========================================================================
   BAR CHART
   ========================================================================== */

function renderNativeBarChart(container, json) {
    const dark = _isDark();
    const defaultColors = ['#6F5AF6','#e74c3c','#27ae60','#f39c12','#3b82f6','#10b981','#ec4899','#8b5cf6','#f59e0b','#2f80ed'];
    const data = (json.data || json.bars || []).map((d, i) => ({
        label: d.label || '?',
        value: typeof d.value === 'number' ? d.value : parseFloat(d.value) || 0,
        color: d.color || defaultColors[i % defaultColors.length],
        unit: d.unit || ''
    }));

    const valueColor = dark ? '#eee' : '#333';
    const labelColor = dark ? '#aaa' : '#666';
    const legendColor = dark ? '#ccc' : '#444';

    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:min(100%,500px);display:flex;flex-direction:column;align-items:center;gap:14px;margin:6px auto;';

    const chartEl = document.createElement('div');
    chartEl.style.cssText = 'width:100%;display:flex;align-items:flex-end;gap:10px;height:220px;padding:20px 14px;border-radius:14px;background:transparent;';

    const max = data.length ? Math.max(...data.map(d => d.value)) : 1;
    data.forEach((item, i) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0;
        const itemEl = document.createElement('div');
        itemEl.style.cssText = 'flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;';
        itemEl.innerHTML = `
            <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:${valueColor};">${item.value}${item.unit}</div>
            <div style="width:100%;height:150px;display:flex;align-items:flex-end;justify-content:center;">
                <div style="width:100%;max-width:48px;height:${pct}%;background:${item.color};border-radius:8px 8px 0 0;transform-origin:bottom;animation:barGrow 700ms ease-out ${i * 70}ms both;box-shadow:0 4px 14px rgba(111,90,246,0.25);"></div>
            </div>
            <div style="margin-top:10px;font-size:11px;font-weight:500;color:${labelColor};text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${item.label}</div>
        `;
        chartEl.appendChild(itemEl);
    });

    const legendEl = document.createElement('div');
    legendEl.style.cssText = `display:flex;flex-wrap:wrap;gap:12px;justify-content:center;font-size:13px;font-weight:500;color:${legendColor};`;
    data.forEach(item => {
        const legItem = document.createElement('span');
        legItem.style.cssText = 'display:flex;align-items:center;gap:6px;';
        legItem.innerHTML = `<span style="width:12px;height:12px;border-radius:4px;background:${item.color};display:inline-block;"></span>${item.label} (${item.value})`;
        legendEl.appendChild(legItem);
    });

    _ensureStyle('barGrowStyle', '@keyframes barGrow { from { transform:scaleY(0); } to { transform:scaleY(1); } }');

    wrap.appendChild(chartEl);
    wrap.appendChild(legendEl);
    container.appendChild(wrap);
}

/* ==========================================================================
   PIE CHART
   ========================================================================== */

function renderNativePieChart(container, json) {
    const defaultColors = ['#2f80ed','#e74c3c','#27ae60','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e','#c0392b','#2980b9'];
    const dark = _isDark();
    const legendColor = dark ? '#eee' : '#333';

    const rawData = json.data || json.slices || [];
    const data = rawData.map((d, i) => ({
        label: d.label || '?',
        value: typeof d.value === 'number' ? d.value : parseFloat(d.value) || 0,
        color: d.color || defaultColors[i % defaultColors.length]
    }));

    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:min(100%,480px);display:flex;flex-direction:column;align-items:center;gap:16px;margin:6px auto;';

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 400 400');
    svg.style.cssText = 'width:100%;height:auto;background:transparent;';
    svg.setAttribute('aria-label', 'Gráfico de pizza');

    const g = document.createElementNS(ns, 'g');
    g.setAttribute('transform', 'translate(200,200)');
    svg.appendChild(g);

    const total = data.reduce((s, d) => s + d.value, 0) || 1;

    function describeArc(r, startAngle, endAngle) {
        const x1 = r * Math.cos(startAngle), y1 = r * Math.sin(startAngle);
        const x2 = r * Math.cos(endAngle), y2 = r * Math.sin(endAngle);
        const large = endAngle - startAngle > Math.PI ? 1 : 0;
        return `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    }

    function animateSlice(path, startAngle, endAngle, duration) {
        const t0 = performance.now();
        function frame(now) {
            const p = Math.min((now - t0) / duration, 1);
            const e = 1 - Math.pow(1 - p, 3);
            const cur = startAngle + (endAngle - startAngle) * e;
            path.setAttribute('d', describeArc(140, startAngle, Math.max(startAngle + 0.01, cur)));
            if (p < 1) requestAnimationFrame(frame);
            else path.setAttribute('d', describeArc(140, startAngle, endAngle));
        }
        requestAnimationFrame(frame);
    }

    let startAngle = -Math.PI / 2;
    const legendEl = document.createElement('div');
    legendEl.style.cssText = `display:flex;flex-wrap:wrap;gap:12px;justify-content:center;font-size:14px;font-weight:500;color:${legendColor};`;

    data.forEach(item => {
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('fill', item.color);
        path.setAttribute('stroke', 'transparent');
        path.style.cssText = 'transition:transform 0.3s ease,opacity 0.3s ease;cursor:pointer;transform-origin:50% 50%;';
        path.onmouseenter = () => { path.style.opacity = '0.85'; path.style.transform = 'scale(1.04)'; };
        path.onmouseleave = () => { path.style.opacity = '1'; path.style.transform = 'scale(1)'; };
        g.appendChild(path);
        animateSlice(path, startAngle, endAngle, 600 + Math.random() * 400);

        const mid = (startAngle + endAngle) / 2;
        const tr = 85;
        const text = document.createElementNS(ns, 'text');
        text.setAttribute('x', tr * Math.cos(mid));
        text.setAttribute('y', tr * Math.sin(mid));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.style.cssText = 'font-size:12px;font-weight:bold;fill:#fff;pointer-events:none;';
        text.textContent = ((item.value / total) * 100).toFixed(1) + '%';
        g.appendChild(text);

        const legItem = document.createElement('span');
        legItem.style.cssText = 'display:flex;align-items:center;gap:6px;';
        legItem.innerHTML = `<span style="width:12px;height:12px;border-radius:4px;background:${item.color};display:inline-block;"></span>${item.label} (${item.value})`;
        legendEl.appendChild(legItem);

        startAngle = endAngle;
    });

    wrap.appendChild(svg);
    wrap.appendChild(legendEl);
    container.appendChild(wrap);
}

/* ==========================================================================
   SHEET
   ========================================================================== */

function renderNativeSheet(container, json) {
    const dark = _isDark();
    const surface = dark ? '#1a1a1a' : '#fffef8';
    const border = dark ? '#333' : '#d6d6d6';
    const textClr = dark ? '#e8e8e8' : '#222';
    const lines = json.lines || [];

    const wrap = document.createElement('div');
    wrap.style.cssText = `position:relative;width:min(92vw,640px);height:min(70vh,320px);border:1px solid ${border};background:${surface};box-shadow:0 8px 22px rgba(0,0,0,0.10);overflow:hidden;margin:6px auto;cursor:pointer;transition:width 0.4s cubic-bezier(0.2,0.9,0.3,1),height 0.4s cubic-bezier(0.2,0.9,0.3,1),border-radius 0.4s ease,box-shadow 0.4s ease;`;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';

    const backBtn = document.createElement('button');
    backBtn.style.cssText = `position:absolute;top:14px;right:14px;width:38px;height:38px;border-radius:50%;border:none;background:rgba(0,0,0,0.45);color:#fff;font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;opacity:0;pointer-events:none;transition:opacity 0.25s ease;`;
    backBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    wrap.appendChild(svg);
    wrap.appendChild(backBtn);
    container.appendChild(wrap);

    const cfg = { leftPad:72, rightPad:20, topPad:34, gap:32, textLift:10, minFont:10, maxFont:18, titleMaxFont:20 };
    const mc = document.createElement('canvas');
    const ctx = mc.getContext('2d');
    let isExpanded = false;
    let scrollY = 0;
    let maxScroll = 0;
    let contentGroup = null;

    function fitFont(text, maxW, minF, maxF, bold) {
        let lo = minF, hi = maxF, best = lo;
        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            ctx.font = (bold ? '700 ' : '') + mid + 'px Arial';
            if (ctx.measureText(text).width <= maxW) { best = mid; lo = mid + 1; } else hi = mid - 1;
        }
        return best;
    }

    function clampScroll() {
        if (scrollY < 0) scrollY = 0;
        if (scrollY > maxScroll) scrollY = maxScroll;
    }

    function applyScrollTransform() {
        if (contentGroup) contentGroup.setAttribute('transform', `translate(0,${-scrollY})`);
    }

    function render() {
        const w = wrap.clientWidth || 640;
        const h = wrap.clientHeight || 320;
        const maxTW = w - cfg.leftPad - cfg.rightPad;
        svg.innerHTML = '';

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('width', w); bg.setAttribute('height', h); bg.setAttribute('fill', surface);
        svg.appendChild(bg);

        const n = lines.length;
        const contentHeight = Math.max(h, cfg.topPad + n * cfg.gap + cfg.gap);
        maxScroll = Math.max(0, contentHeight - h);
        clampScroll();

        contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        svg.appendChild(contentGroup);

        for (let i = 0; i <= Math.ceil(contentHeight / cfg.gap) + 1; i++) {
            const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            const y  = i * cfg.gap;
            ln.setAttribute('x1', 0); ln.setAttribute('y1', y); ln.setAttribute('x2', w); ln.setAttribute('y2', y);
            ln.setAttribute('stroke', 'rgba(95,145,255,0.16)'); ln.setAttribute('stroke-width', '1');
            ln.setAttribute('shape-rendering', 'crispEdges');
            contentGroup.appendChild(ln);
        }

        const marginX = cfg.leftPad - 16;
        const mg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        mg.setAttribute('x1', marginX); mg.setAttribute('y1', 0); mg.setAttribute('x2', marginX); mg.setAttribute('y2', contentHeight);
        mg.setAttribute('stroke', 'rgba(255,90,90,0.20)'); mg.setAttribute('stroke-width', '1');
        mg.setAttribute('shape-rendering', 'crispEdges');
        contentGroup.appendChild(mg);

        lines.forEach((item, i) => {
            const y   = cfg.topPad + i * cfg.gap - cfg.textLift;
            const isT = !!item.title;
            const sz  = fitFont(item.text, maxTW, isT ? 12 : cfg.minFont, isT ? cfg.titleMaxFont : cfg.maxFont, isT);
            const t   = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', cfg.leftPad); t.setAttribute('y', y);
            t.setAttribute('font-size', sz);
            t.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
            t.setAttribute('font-weight', isT ? '700' : '400');
            t.setAttribute('fill', textClr);
            t.setAttribute('dominant-baseline', 'alphabetic');
            t.textContent = item.text;
            contentGroup.appendChild(t);
        });

        applyScrollTransform();
    }

    function setExpanded(value) {
        isExpanded = value;
        if (isExpanded) {
            wrap.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;border:none;box-shadow:none;z-index:1000;background:${surface};overflow:hidden;cursor:default;`;
            backBtn.style.opacity = '1';
            backBtn.style.pointerEvents = 'auto';
        } else {
            wrap.style.cssText = `position:relative;width:min(92vw,640px);height:min(70vh,320px);border:1px solid ${border};background:${surface};box-shadow:0 8px 22px rgba(0,0,0,0.10);overflow:hidden;margin:6px auto;cursor:pointer;transition:width 0.4s cubic-bezier(0.2,0.9,0.3,1),height 0.4s cubic-bezier(0.2,0.9,0.3,1),border-radius 0.4s ease,box-shadow 0.4s ease;`;
            backBtn.style.opacity = '0';
            backBtn.style.pointerEvents = 'none';
        }
        setTimeout(render, 50);
    }

    const dragState = { active: false, pointerId: null, startY: 0, lastY: 0, moved: false, justDragged: false };

    svg.addEventListener('pointerdown', e => {
        dragState.active = true;
        dragState.pointerId = e.pointerId;
        dragState.startY = e.clientY;
        dragState.lastY = e.clientY;
        dragState.moved = false;
        try { svg.setPointerCapture(e.pointerId); } catch {}
    });

    svg.addEventListener('pointermove', e => {
        if (!dragState.active || e.pointerId !== dragState.pointerId) return;
        const dy = e.clientY - dragState.lastY;
        dragState.lastY = e.clientY;
        if (maxScroll > 0) {
            e.preventDefault();
            scrollY -= dy;
            clampScroll();
            applyScrollTransform();
        }
        if (!dragState.moved && Math.abs(e.clientY - dragState.startY) > 6) dragState.moved = true;
    });

    svg.addEventListener('pointerup', e => {
        if (!dragState.active || e.pointerId !== dragState.pointerId) return;
        dragState.active = false;
        if (dragState.moved) dragState.justDragged = true;
    });

    svg.addEventListener('pointercancel', () => {
        dragState.active = false;
    });

    svg.addEventListener('wheel', e => {
        if (maxScroll <= 0) return;
        e.preventDefault();
        scrollY += e.deltaY;
        clampScroll();
        applyScrollTransform();
    }, { passive: false });

    wrap.addEventListener('click', () => {
        if (dragState.justDragged) {
            dragState.justDragged = false;
            return;
        }
        if (!isExpanded) setExpanded(true);
    });

    backBtn.addEventListener('click', e => {
        e.stopPropagation();
        setExpanded(false);
    });

    window.addEventListener('resize', render);
    requestAnimationFrame(render);
}

/* ==========================================================================
   CODE BLOCK
   ========================================================================== */

function renderNativeCodeBlock(container, json) {
    const dark = _isDark();
    const widgetBg = dark ? '#1b1b1b' : '#ffffff';
    const border = dark ? '#2f2f2f' : '#d7d7d7';
    const textColor = dark ? '#e8e8e8' : '#222222';
    const lineNumClr = dark ? '#7d7d7d' : '#8a8a8a';
    const headerText = dark ? '#f2f2f2' : '#2a2a2a';
    const copyColor = dark ? '#b0b0b0' : '#5a5a5a';
    const copyHover = dark ? '#f2f2f2' : '#2a2a2a';
    const feedbackBg = dark ? 'rgba(245,245,245,0.92)' : 'rgba(20,20,20,0.92)';
    const feedbackTxt = dark ? '#1b1b1b' : '#fff';
    const shadow = dark ? '0 8px 24px rgba(0,0,0,0.18)' : '0 8px 24px rgba(0,0,0,0.05)';

    const lang = (json.language || json.lang || 'code').toLowerCase();
    const rawCode = String(json.code || json.content || json.text || '');
    const codeLines = rawCode.replace(/\r\n/g, '\n').split('\n');

    const langIconMap = {
        html: { color: 'E34F26', name: 'html5' },
        css: { color: '1572B6', name: 'css3' },
        js: { color: 'F7DF1E', name: 'javascript' },
        javascript: { color: 'F7DF1E', name: 'javascript' },
        ts: { color: '3178C6', name: 'typescript' },
        typescript: { color: '3178C6', name: 'typescript' },
        py: { color: '3776AB', name: 'python' },
        python: { color: '3776AB', name: 'python' },
        rb: { color: 'CC342D', name: 'ruby' },
        ruby: { color: 'CC342D', name: 'ruby' },
        go: { color: '00ADD8', name: 'go' },
        rs: { color: 'DEA584', name: 'rust' },
        rust: { color: 'DEA584', name: 'rust' },
        java: { color: '007396', name: 'openjdk' },
        swift: { color: 'F05138', name: 'swift' },
        php: { color: '777BB4', name: 'php' },
        c: { color: 'A8B9CC', name: 'c' },
        cpp: { color: '00599C', name: 'cplusplus' },
        cplusplus: { color: '00599C', name: 'cplusplus' },
        json: { color: '000000', name: 'json' },
        xml: { color: '005FAD', name: 'xml' },
        sql: { color: '4169E1', name: 'sqlite' },
    };

    const langInfo = langIconMap[lang] || null;
    const langLabel = (json.label || lang || 'code').toString().toUpperCase();
    const iconUrl = langInfo ? `https://cdn.simpleicons.org/${langInfo.name}/${langInfo.color}` : '';

    function wrap(cls, value) { return `<span class="${cls}">${value}</span>`; }

    function highlightHtml(line) {
        let html = _escapeHtml(line);

        html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, (_, m) => wrap('comment', m));
        html = html.replace(/(&lt;!DOCTYPE[\s\S]*?&gt;)/gi, (_, m) => wrap('keyword', m));

        html = html.replace(/(&lt;\/?)([A-Za-z][\w:-]*)([\s\S]*?)(\/?&gt;)/g, (_, open, tag, attrs, close) => {
            let out = wrap('punct', open) + wrap('tag', tag);
            if (attrs && attrs.trim()) {
                let rest = attrs;
                rest = rest.replace(/([A-Za-z_:][\w:.-]*)(\s*=)/g, (_, name, eq) => wrap('attr', name) + wrap('operator', eq));
                rest = rest.replace(/(&quot;.*?&quot;)/g, (_, s) => wrap('string', s));
                rest = rest.replace(/(&#39;.*?&#39;)/g, (_, s) => wrap('string', s));
                out += rest;
            }
            out += wrap('punct', close);
            return out;
        });

        return html;
    }

    function highlightGeneric(line) {
        let html = _escapeHtml(line);
        const stash = [];
        const hold = token => {
            const key = `\u0000${stash.length}\u0000`;
            stash.push(token);
            return key;
        };

        html = html.replace(/("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`)/g, m => hold(wrap('string', m)));

        const commentRules = [];
        if (lang === 'sql') {
            commentRules.push(/--.*/g);
        } else if (['py', 'python', 'rb', 'ruby'].includes(lang)) {
            commentRules.push(/#.*/g);
        } else if (['js', 'javascript', 'ts', 'typescript', 'java', 'c', 'cpp', 'cplusplus', 'go', 'rs', 'rust', 'swift', 'php'].includes(lang)) {
            commentRules.push(/\/\/.*/g);
            commentRules.push(/\/\*[\s\S]*?\*\//g);
        } else {
            commentRules.push(/\/\/.*/g);
            commentRules.push(/#.*/g);
            commentRules.push(/--.*/g);
            commentRules.push(/\/\*[\s\S]*?\*\//g);
        }

        for (const re of commentRules) {
            html = html.replace(re, m => hold(wrap('comment', m)));
        }

        const keywords = [
            'function','const','let','var','return','if','else','for','while','do','switch','case',
            'break','continue','class','extends','implements','import','export','from','async','await',
            'new','this','try','catch','throw','finally','true','false','null','undefined','def','lambda',
            'yield','raise','in','is','and','or','not','public','private','protected','static','final',
            'void','int','float','double','string','bool','char','interface','package',
            'select','insert','update','delete','create','table','values','into','where','join','left',
            'right','inner','outer','group','order','by','limit','offset'
        ];

        const kwPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
        html = html.replace(kwPattern, m => wrap('keyword', m));
        html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, m => wrap('number', m));

        for (let i = 0; i < stash.length; i++) {
            html = html.replace(new RegExp(`\\u0000${i}\\u0000`, 'g'), stash[i]);
        }
        return html;
    }

    function highlightLine(line) {
        if (lang === 'html' || lang === 'xml') return highlightHtml(line);
        return highlightGeneric(line);
    }

    _ensureStyle('nativeCodeBlockStylesV3', `
        .native-code-widget .code-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}
        .native-code-widget pre{margin:0;width:max-content;min-width:100%;}
        .native-code-widget code{display:block;font-family:Consolas,Monaco,"Courier New",monospace;font-size:14px;line-height:1.7;}
        .native-code-widget .code-line{display:grid;grid-template-columns:52px minmax(0,1fr);align-items:start;white-space:pre;}
        .native-code-widget .line-number{position:sticky;left:0;z-index:1;text-align:right;padding:0 12px 0 16px;user-select:none;font-variant-numeric:tabular-nums;}
        .native-code-widget .line-content{padding-right:16px;white-space:pre;overflow-wrap:normal;word-break:normal;}
        .native-code-widget .punct{color:inherit;}
        .native-code-widget.theme-dark .keyword{color:#ff7b72;font-weight:500;}
        .native-code-widget.theme-dark .string{color:#a5d6ff;}
        .native-code-widget.theme-dark .comment{color:#8b949e;font-style:italic;}
        .native-code-widget.theme-dark .number{color:#79c0ff;}
        .native-code-widget.theme-dark .tag{color:#7ee787;}
        .native-code-widget.theme-dark .attr{color:#d2a8ff;}
        .native-code-widget.theme-dark .operator{color:#c9d1d9;}
        .native-code-widget.theme-light .keyword{color:#b00020;font-weight:600;}
        .native-code-widget.theme-light .string{color:#005cc5;}
        .native-code-widget.theme-light .comment{color:#6a737d;font-style:italic;}
        .native-code-widget.theme-light .number{color:#0969da;}
        .native-code-widget.theme-light .tag{color:#0a7a2f;}
        .native-code-widget.theme-light .attr{color:#6f42c1;}
        .native-code-widget.theme-light .operator{color:#555;}
    `);

    const widgetEl = document.createElement('div');
    widgetEl.className = `native-code-widget ${dark ? 'theme-dark' : 'theme-light'}`;
    widgetEl.style.cssText = `width:min(100%,760px);background:${widgetBg};border:1.5px solid ${border};border-radius:16px;overflow:hidden;box-shadow:${shadow};margin:6px auto;position:relative;`;

    const header = document.createElement('div');
    header.style.cssText = `height:42px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 12px 0 14px;background:${widgetBg};position:relative;z-index:2;`;

    const titleWrap = document.createElement('div');
    titleWrap.style.cssText = `display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:${headerText};letter-spacing:0.2px;text-transform:uppercase;`;

    if (iconUrl) {
        const img = document.createElement('img');
        img.src = iconUrl;
        img.alt = '';
        img.style.cssText = 'width:16px;height:16px;display:block;';
        titleWrap.appendChild(img);
    }

    const titleSpan = document.createElement('span');
    titleSpan.textContent = langLabel;
    titleWrap.appendChild(titleSpan);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.setAttribute('aria-label', 'Copiar código');
    copyBtn.title = 'Copiar código';
    copyBtn.style.cssText = `width:26px;height:26px;border:none;background:transparent;display:grid;place-items:center;cursor:pointer;padding:0;color:${copyColor};flex:0 0 auto;transition:color 0.2s ease, transform 0.2s ease;`;
    copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px;display:block;"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    copyBtn.onmouseenter = () => { copyBtn.style.color = copyHover; };
    copyBtn.onmouseleave = () => { copyBtn.style.color = copyColor; };
    copyBtn.onmousedown = () => { copyBtn.style.transform = 'scale(0.94)'; };
    copyBtn.onmouseup = () => { copyBtn.style.transform = 'scale(1)'; };

    const feedback = document.createElement('div');
    feedback.style.cssText = `position:absolute;top:48px;right:14px;background:${feedbackBg};color:${feedbackTxt};font-size:12px;padding:6px 10px;border-radius:999px;opacity:0;transform:translateY(-4px);transition:0.2s ease;pointer-events:none;z-index:5;`;
    feedback.textContent = 'Copiado';

    copyBtn.addEventListener('click', async () => {
        await _copyText(rawCode);
        _showToast(feedback, 'Copiado');
    });

    header.appendChild(titleWrap);
    header.appendChild(copyBtn);

    const scrollDiv = document.createElement('div');
    scrollDiv.className = 'code-scroll';
    scrollDiv.style.cssText = `background:${widgetBg};`;

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.style.cssText = `display:block;background:${widgetBg};color:${textColor};`;

    codeLines.forEach((line, index) => {
        const row = document.createElement('div');
        row.className = 'code-line';

        const number = document.createElement('div');
        number.className = 'line-number';
        number.style.cssText = `color:${lineNumClr};background:${widgetBg};`;
        number.textContent = String(index + 1);

        const content = document.createElement('div');
        content.className = 'line-content';
        content.style.color = textColor;
        content.innerHTML = highlightLine(line);

        row.appendChild(number);
        row.appendChild(content);
        code.appendChild(row);
    });

    pre.appendChild(code);
    scrollDiv.appendChild(pre);
    widgetEl.appendChild(header);
    widgetEl.appendChild(feedback);
    widgetEl.appendChild(scrollDiv);
    container.appendChild(widgetEl);
}

/* ==========================================================================
   MARKET
   ========================================================================== */

function renderNativeMarket(container, json) {
    const type = json.type || 'forex';
    const symbol = json.symbol || 'USDEUR';
    const name = json.name || symbol;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:min(92vw,420px);background:#111318;border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.22);margin:6px auto;';

    wrap.innerHTML = `
      <div id="mktStatus_${symbol}" style="text-align:center;padding:40px 16px;font-size:13px;color:#555;font-family:Arial,sans-serif;">
        <div style="width:20px;height:20px;border:2px solid #222;border-top-color:#6F5AF6;border-radius:50%;animation:mktSpin 0.7s linear infinite;margin:0 auto 10px;"></div>
        A carregar...
      </div>
      <div id="mktBlock_${symbol}" style="display:none;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 16px 8px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img id="mktLogo_${symbol}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;background:#1e2128;" src="" alt="" onerror="this.style.display='none';document.getElementById('mktFallback_${symbol}').style.display='flex';" />
            <div id="mktFallback_${symbol}" style="width:44px;height:44px;border-radius:50%;background:#1e2128;display:none;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#fff;"></div>
            <div>
              <div id="mktName_${symbol}" style="font-size:15px;font-weight:700;color:#fff;font-family:Arial,sans-serif;"></div>
              <div id="mktSym_${symbol}" style="font-size:12px;color:#555;margin-top:2px;font-family:Arial,sans-serif;"></div>
            </div>
          </div>
          <div style="text-align:right;">
            <div id="mktPrice_${symbol}" style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;font-family:Arial,sans-serif;"></div>
            <div id="mktChange_${symbol}" style="display:inline-flex;align-items:center;font-size:12px;font-weight:700;padding:3px 8px;border-radius:6px;margin-top:4px;font-family:Arial,sans-serif;"></div>
          </div>
        </div>
        <div style="padding:8px 10px 4px;"><canvas id="mktCanvas_${symbol}" style="width:100%;height:150px;display:block;border-radius:12px;"></canvas></div>
        <div style="display:flex;justify-content:center;gap:4px;padding:8px 16px 16px;">
          ${['1D','1S','1M','3M','1A'].map((tf,i) => `<button onclick="mktSetTf_${symbol}(this,'${tf}')" style="background:${i===0?'#1e2128':'none'};border:none;color:${i===0?'#fff':'#444'};font-size:12px;font-weight:700;padding:5px 12px;border-radius:8px;cursor:pointer;font-family:Arial,sans-serif;">${tf}</button>`).join('')}
        </div>
      </div>`;

    _ensureStyle('mktSpinStyle', '@keyframes mktSpin { to { transform:rotate(360deg); } }');

    container.appendChild(wrap);

    const TF_CONFIG = {
        '1D': { days: 1, points: 96, vol: 0.003 },
        '1S': { days: 7, points: 168, vol: 0.005 },
        '1M': { days: 30, points: 120, vol: 0.008 },
        '3M': { days: 90, points: 90, vol: 0.010 },
        '1A': { days: 365, points: 120, vol: 0.015 }
    };

    function simulateHistory(price, points, vol) {
        const d = [];
        let p = price * (0.85 + Math.random() * 0.1);
        for (let i = 0; i < points; i++) {
            p += (Math.random() - 0.48) * price * vol;
            p = Math.max(p, price * 0.5);
            d.push(p);
        }
        d.push(price);
        return d;
    }

    function drawChart(prices, isUp) {
        const canvas = document.getElementById(`mktCanvas_${symbol}`);
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const W = canvas.parentElement.offsetWidth - 20;
        const H = 150;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = max - min || 1;
        const pad = { t: 10, b: 10, l: 4, r: 4 };
        const w = W - pad.l - pad.r;
        const h = H - pad.t - pad.b;
        const pts = prices.map((v, i) => ({
            x: pad.l + (i / (prices.length - 1)) * w,
            y: pad.t + (1 - (v - min) / range) * h
        }));

        const color = isUp ? '#22c55e' : '#ef4444';
        const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
        grad.addColorStop(0, color + '55');
        grad.addColorStop(1, color + '00');

        ctx.clearRect(0, 0, W, H);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            const cx = (pts[i - 1].x + pts[i].x) / 2;
            ctx.bezierCurveTo(cx, pts[i - 1].y, cx, pts[i].y, pts[i].x, pts[i].y);
        }
        ctx.lineTo(pts[pts.length - 1].x, H - pad.b);
        ctx.lineTo(pts[0].x, H - pad.b);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            const cx = (pts[i - 1].x + pts[i].x) / 2;
            ctx.bezierCurveTo(cx, pts[i - 1].y, cx, pts[i].y, pts[i].x, pts[i].y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.stroke();

        const last = pts[pts.length - 1];
        ctx.beginPath();
        ctx.arc(last.x, last.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#111318';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function formatPrice(p) {
        if (type === 'forex') return p.toFixed(4);
        if (p >= 1000) return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 2 });
        if (p >= 1) return '$' + p.toFixed(2);
        return '$' + p.toFixed(6);
    }

    function showAsset(data) {
        const isUp = data.change >= 0;
        const logoEl = document.getElementById(`mktLogo_${symbol}`);
        const fallbackEl = document.getElementById(`mktFallback_${symbol}`);
        if (data.logoUrl) {
            logoEl.src = data.logoUrl;
            logoEl.style.display = 'block';
            fallbackEl.style.display = 'none';
        } else {
            logoEl.style.display = 'none';
            fallbackEl.style.display = 'flex';
            fallbackEl.textContent = (data.symbol || symbol).slice(0, 2).toUpperCase();
        }
        document.getElementById(`mktName_${symbol}`).textContent = data.name;
        document.getElementById(`mktSym_${symbol}`).textContent = data.symbol + ' · ' + type.toUpperCase();
        document.getElementById(`mktPrice_${symbol}`).textContent = formatPrice(data.price);
        const chEl = document.getElementById(`mktChange_${symbol}`);
        chEl.textContent = (isUp ? '▲ +' : '▼ ') + Math.abs(data.change).toFixed(2) + '%';
        chEl.style.cssText = `display:inline-flex;align-items:center;font-size:12px;font-weight:700;padding:3px 8px;border-radius:6px;margin-top:4px;background:${isUp ? '#0d2e1a' : '#2e0d0d'};color:${isUp ? '#22c55e' : '#ef4444'};`;
        document.getElementById(`mktStatus_${symbol}`).style.display = 'none';
        document.getElementById(`mktBlock_${symbol}`).style.display = 'block';
        setTimeout(() => drawChart(data.prices, isUp), 50);
    }

    function showError(msg) {
        const el = document.getElementById(`mktStatus_${symbol}`);
        el.innerHTML = `<div style="color:#ef4444;font-size:13px;font-family:Arial,sans-serif;">${msg}</div>`;
    }

    async function load(tf) {
        document.getElementById(`mktStatus_${symbol}`).innerHTML = '<div style="width:20px;height:20px;border:2px solid #222;border-top-color:#6F5AF6;border-radius:50%;animation:mktSpin 0.7s linear infinite;margin:0 auto 10px;"></div>A carregar...';
        document.getElementById(`mktStatus_${symbol}`).style.display = 'block';
        document.getElementById(`mktBlock_${symbol}`).style.display = 'none';

        try {
            let data;

            if (type === 'forex') {
                const base = symbol.slice(0, 3).toUpperCase();
                const quote = (symbol.slice(3, 6).toUpperCase() || 'USD');
                const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
                const d = await res.json();
                const price = d.rates?.[quote] || d.rates?.USD;
                const prices = simulateHistory(price, TF_CONFIG[tf].points, 0.002);
                data = { price, change: ((price - prices[0]) / prices[0]) * 100, prices, name: `${base}/${quote}`, symbol: `${base}/${quote}`, logoUrl: '' };
            } else if (type === 'crypto') {
                const CRYPTO_IDS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', AVAX: 'avalanche-2' };
                const id = CRYPTO_IDS[symbol.toUpperCase()];
                const priceRes = await fetch(`https://api.coinbase.com/v2/prices/${symbol.toUpperCase()}-USD/spot`);
                const priceData = await priceRes.json();
                const price = parseFloat(priceData.data.amount);
                let prices;
                try {
                    const hRes = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${TF_CONFIG[tf].days}&precision=2`);
                    const hData = await hRes.json();
                    prices = (hData.prices || []).map(p => p[1]);
                    if (!prices.length) throw new Error('No history');
                } catch {
                    prices = simulateHistory(price, TF_CONFIG[tf].points, TF_CONFIG[tf].vol);
                }
                data = { price, change: ((price - prices[0]) / prices[0]) * 100, prices, name, symbol: symbol.toUpperCase(), logoUrl: '' };
            } else {
                const price = 100 + Math.random() * 50;
                const prices = simulateHistory(price, TF_CONFIG[tf].points, TF_CONFIG[tf].vol);
                data = { price, change: ((price - prices[0]) / prices[0]) * 100, prices, name, symbol, logoUrl: '' };
            }

            showAsset(data);
        } catch (e) {
            showError('Erro: ' + e.message);
        }
    }

    window[`mktSetTf_${symbol}`] = (el, tf) => {
        el.closest('div').querySelectorAll('button').forEach(b => {
            b.style.background = 'none';
            b.style.color = '#444';
        });
        el.style.background = '#1e2128';
        el.style.color = '#fff';
        load(tf);
    };

    load('1D');
}

/* ==========================================================================
   CALENDAR
   ========================================================================== */

function renderNativeCalendar(container, json) {
    const dark = _isDark();
    const eventsData = {};

    (json.events || []).forEach(ev => {
        if (!eventsData[ev.date]) eventsData[ev.date] = [];
        eventsData[ev.date].push({
            name: ev.name || ev.title || '',
            time: ev.time || '',
            color: ev.color || '#6F5AF6'
        });
    });

    const wrap = document.createElement('div');
    wrap.style.cssText = `width:min(92vw,420px);background:${dark ? '#1b1b1b' : '#ffffff'};border:1.5px solid ${dark ? '#333' : '#e0e0e0'};border-radius:24px;box-shadow:${dark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0,0,0,0.06)'};padding:20px 18px;margin:6px auto;overflow:hidden;font-family:'Segoe UI',Roboto,system-ui,sans-serif;`;

    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const today = new Date(); today.setHours(0,0,0,0);
    let current = new Date(today.getFullYear(), today.getMonth(), 1);
    const pad2 = n => String(n).padStart(2,'0');
    const dateKey = (y,m,d) => `${y}-${pad2(m+1)}-${pad2(d)}`;
    let selectedDate = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

    const todayBg = dark?'#2a2a40':'#ede9ff';
    const todayTx = dark?'#a78bfa':'#6F5AF6';
    const selBg = dark?'#7c3aed':'#6F5AF6';
    const selTx = '#fff';
    const hoverBg = dark?'#2a2a3a':'#f0eeff';
    const textClr = dark?'#eee':'#222';
    const mutedClr = dark?'#888':'#999';
    const evBg = dark?'#252535':'#f7f6ff';
    const dotColor = dark?'#a78bfa':'#6F5AF6';
    const navBg = dark?'#2a2a2a':'#f5f5f5';
    const bdrClr = dark?'#333':'#e0e0e0';

    wrap.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
        <button id="calPrev" style="background:${navBg};border:none;border-radius:12px;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;color:${textClr};">‹</button>
        <div id="calTitle" style="font-size:18px;font-weight:700;color:${textClr};text-transform:capitalize;"></div>
        <button id="calNext" style="background:${navBg};border:none;border-radius:12px;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;color:${textClr};">›</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:8px;">
        ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=>`<span style="text-align:center;font-size:11px;font-weight:600;color:${mutedClr};padding:4px 0;">${d}</span>`).join('')}
      </div>
      <div id="calGrid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;"></div>
      <div style="margin-top:16px;border-top:1px solid ${bdrClr};padding-top:14px;">
        <div style="font-size:12px;font-weight:700;color:${mutedClr};margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">Eventos do dia</div>
        <div id="calEvents"></div>
      </div>`;

    container.appendChild(wrap);

    function renderGrid() {
        const y = current.getFullYear(), m = current.getMonth();
        wrap.querySelector('#calTitle').textContent = `${months[m]} ${y}`;
        const grid = wrap.querySelector('#calGrid');
        grid.innerHTML = '';
        const firstDay = new Date(y,m,1).getDay(), daysInMonth = new Date(y,m+1,0).getDate(), daysInPrev = new Date(y,m,0).getDate();
        for (let i = firstDay-1; i >= 0; i--) addDay(grid, daysInPrev-i, true, false, false, null);
        for (let d = 1; d <= daysInMonth; d++) {
            const key = dateKey(y,m,d);
            const date = new Date(y,m,d);
            addDay(grid, d, false, date.getTime()===today.getTime(), key===selectedDate, key);
        }
        const total = firstDay + daysInMonth, rem = total%7===0?0:7-total%7;
        for (let d = 1; d <= rem; d++) addDay(grid, d, true, false, false, null);
        renderEvents();
    }

    function addDay(grid, num, otherMonth, isToday, isSelected, key) {
        const el = document.createElement('div');
        el.style.cssText = `aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:14px;cursor:${otherMonth?'default':'pointer'};position:relative;transition:background 0.2s,color 0.2s,transform 0.2s;user-select:none;`;
        el.textContent = num;
        const hasEvent = key && eventsData[key]?.length > 0;
        if (otherMonth) { el.style.color = mutedClr; el.style.opacity = '0.4'; }
        else if (isSelected) { el.style.background = selBg; el.style.color = selTx; el.style.fontWeight = '700'; el.style.transform = 'scale(1.08)'; }
        else if (isToday) { el.style.background = todayBg; el.style.color = todayTx; el.style.fontWeight = '700'; }
        else { el.style.color = textClr; }
        if (hasEvent) {
            const dot = document.createElement('span');
            dot.style.cssText = `position:absolute;bottom:3px;width:5px;height:5px;border-radius:50%;background:${isSelected?'#fff':dotColor};`;
            el.appendChild(dot);
        }
        if (!otherMonth && key) {
            el.onmouseenter = () => { if (key!==selectedDate) el.style.background = hoverBg; };
            el.onmouseleave = () => { if (key!==selectedDate) el.style.background = isToday?todayBg:''; };
            el.onclick = () => { selectedDate = key; renderGrid(); };
        }
        grid.appendChild(el);
    }

    function renderEvents() {
        const evEl = wrap.querySelector('#calEvents');
        const dayEvs = eventsData[selectedDate];
        if (!dayEvs || !dayEvs.length) { evEl.innerHTML = `<div style="font-size:13px;color:${mutedClr};text-align:center;padding:12px 0;opacity:0.7;">Nenhum evento neste dia</div>`; return; }
        evEl.innerHTML = dayEvs.map(e => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:${evBg};margin-bottom:6px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${e.color};flex-shrink:0;"></div>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:600;color:${textClr};">${e.name}</div>
              <div style="font-size:12px;color:${mutedClr};margin-top:2px;">${e.time}</div>
            </div>
          </div>`).join('');
    }

    wrap.querySelector('#calPrev').onclick = () => { current.setMonth(current.getMonth()-1); renderGrid(); };
    wrap.querySelector('#calNext').onclick = () => { current.setMonth(current.getMonth()+1); renderGrid(); };
    renderGrid();
}

/* ==========================================================================
   TIMER
   ========================================================================== */

function renderNativeTimer(container, json) {
    const dark = _isDark();
    const bg = dark ? '#1b1b1b' : '#ffffff';
    const bdr = dark ? '#2a2a2a' : '#e5e5ea';
    const textClr = dark ? '#f2f2f2' : '#000';
    const mutedClr = dark ? '#939393' : '#888';
    const primary = '#2F7BF6';

    let total = json.seconds || json.duration || 60;
    let remaining = total;
    let running = false;
    let interval = null;

    const wrap = document.createElement('div');
    wrap.style.cssText = `width:min(92vw,320px);background:${bg};border:1.5px solid ${bdr};border-radius:24px;padding:28px 20px;text-align:center;margin:6px auto;font-family:'Segoe UI',system-ui,sans-serif;`;

    const label = document.createElement('div');
    label.style.cssText = `font-size:13px;font-weight:600;color:${mutedClr};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;`;
    label.textContent = json.label || json.title || 'Temporizador';

    const display = document.createElement('div');
    display.style.cssText = `font-size:48px;font-weight:700;color:${textClr};letter-spacing:-1px;margin-bottom:20px;font-variant-numeric:tabular-nums;`;

    const progressWrap = document.createElement('div');
    progressWrap.style.cssText = `height:4px;background:${bdr};border-radius:2px;margin-bottom:24px;overflow:hidden;`;
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `height:100%;background:${primary};border-radius:2px;transition:width 0.5s linear;width:100%;`;
    progressWrap.appendChild(progressBar);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;';

    const startBtn = document.createElement('button');
    startBtn.style.cssText = `padding:10px 28px;background:${primary};color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;`;
    startBtn.textContent = 'Iniciar';

    const resetBtn = document.createElement('button');
    resetBtn.style.cssText = `padding:10px 20px;background:${bdr};color:${textClr};border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;`;
    resetBtn.textContent = 'Reiniciar';

    function format(s) {
        const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
        if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
        return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    }

    function update() {
        display.textContent = format(remaining);
        progressBar.style.width = ((remaining / total) * 100) + '%';
        progressBar.style.background = remaining <= 10 ? '#ef4444' : primary;
    }

    startBtn.onclick = () => {
        if (running) {
            clearInterval(interval); running = false; startBtn.textContent = 'Continuar';
        } else {
            if (remaining <= 0) return;
            running = true; startBtn.textContent = 'Pausar';
            interval = setInterval(() => {
                remaining--;
                update();
                if (remaining <= 0) { clearInterval(interval); running = false; startBtn.textContent = 'Iniciar'; }
            }, 1000);
        }
    };

    resetBtn.onclick = () => {
        clearInterval(interval); running = false; remaining = total;
        startBtn.textContent = 'Iniciar'; update();
    };

    btnRow.appendChild(startBtn);
    btnRow.appendChild(resetBtn);
    wrap.appendChild(label);
    wrap.appendChild(display);
    wrap.appendChild(progressWrap);
    wrap.appendChild(btnRow);
    container.appendChild(wrap);
    update();
}

/* ==========================================================================
   MIND MAP
   ========================================================================== */

function renderNativeMindMap(container, json) {
    const dark = _isDark();
    const cardBg = dark ? '#1b1b1b' : '#ffffff';
    const linkClr = dark ? '#666' : '#bbb';

    const wrap = document.createElement('div');
    wrap.style.cssText = `position:relative;width:min(90vw,520px);height:min(85vh,520px);background:${cardBg};border-radius:24px;box-shadow:${dark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 10px 30px rgba(0,0,0,0.08)'};overflow:hidden;margin:6px auto;cursor:pointer;transition:all 0.5s cubic-bezier(0.2,0.9,0.3,1);`;

    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.style.cssText = 'width:100%;height:100%;display:block;';
    const mainG = document.createElementNS(svgNs, 'g');
    svg.appendChild(mainG);
    wrap.appendChild(svg);

    const backBtn = document.createElement('button');
    backBtn.style.cssText = `position:absolute;top:14px;right:14px;width:38px;height:38px;background:rgba(0,0,0,0.45);color:#fff;border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;opacity:0;pointer-events:none;transition:opacity 0.25s ease;`;
    backBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    wrap.appendChild(backBtn);

    container.appendChild(wrap);

    const treeData = json.tree || json.data || { id: 'root', label: json.title || 'Root', color: '#2F7BF6', children: [] };
    let collapsedNodes = {};
    let panX = 0, panY = 0, scale = 1, nodePositions = {};
    const levelWidth = 170, nodeH = 40, vSpacing = nodeH + 28;
    let isExpanded = false;
    let touchMoved = false;

    function getSubH(node) {
        if (collapsedNodes[node.id] || !node.children?.length) return vSpacing;
        return node.children.reduce((s, c) => s + getSubH(c), 0);
    }

    function layout(node, x, yStart) {
        const pos = {};
        const h = getSubH(node);
        const yCenter = yStart + h / 2;
        pos[node.id] = { x, y: yCenter };
        if (!collapsedNodes[node.id] && node.children?.length) {
            let curY = yStart;
            for (const c of node.children) {
                Object.assign(pos, layout(c, x + levelWidth, curY));
                curY += getSubH(c);
            }
        }
        return pos;
    }

    function applyTransform() {
        mainG.setAttribute('transform', `translate(${panX},${panY}) scale(${scale})`);
    }

    function fit() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const id in nodePositions) {
            const { x, y } = nodePositions[id];
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
        const pad = 150;
        const tw = maxX - minX + pad * 2;
        const th = maxY - minY + pad * 2;
        svg.setAttribute('viewBox', `${minX - pad} ${minY - pad} ${tw} ${th}`);
        panX = 0; panY = 0; scale = 1;
    }

    function render() {
        nodePositions = layout(treeData, 0, 0);
        mainG.innerHTML = '';

        function drawLinks(node) {
            if (!collapsedNodes[node.id] && node.children) {
                node.children.forEach(child => {
                    const fr = nodePositions[node.id], to = nodePositions[child.id];
                    if (fr && to) {
                        const path = document.createElementNS(svgNs, 'path');
                        const dx = to.x - fr.x;
                        path.setAttribute('d', `M${fr.x},${fr.y} C${fr.x + dx * 0.5},${fr.y} ${to.x - dx * 0.5},${to.y} ${to.x},${to.y}`);
                        path.setAttribute('fill', 'none');
                        path.setAttribute('stroke', linkClr);
                        path.setAttribute('stroke-width', '1.8');
                        path.setAttribute('stroke-linecap', 'round');
                        mainG.appendChild(path);
                    }
                    drawLinks(child);
                });
            }
        }

        function drawNodes(node) {
            if (!nodePositions[node.id]) return;
            const { x, y } = nodePositions[node.id];
            const g = document.createElementNS(svgNs, 'g');
            g.setAttribute('transform', `translate(${x},${y})`);
            const textLen = (node.label || '').length * 7 + 24;
            const rW = Math.max(70, textLen);

            const rect = document.createElementNS(svgNs, 'rect');
            rect.setAttribute('x', -rW / 2);
            rect.setAttribute('y', -nodeH / 2);
            rect.setAttribute('width', rW);
            rect.setAttribute('height', nodeH);
            rect.setAttribute('fill', node.color || '#2F7BF6');
            rect.setAttribute('rx', '8');

            const text = document.createElementNS(svgNs, 'text');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'central');
            text.style.cssText = 'fill:#fff;font-size:12px;font-weight:600;pointer-events:none;';
            text.textContent = node.label;

            g.appendChild(rect);
            g.appendChild(text);
            g.style.cursor = 'pointer';
            g.onclick = (e) => {
                e.stopPropagation();
                if (node.children?.length) {
                    collapsedNodes[node.id] = !collapsedNodes[node.id];
                    render();
                    fit();
                }
            };

            mainG.appendChild(g);
            if (!collapsedNodes[node.id] && node.children) node.children.forEach(drawNodes);
        }

        drawLinks(treeData);
        drawNodes(treeData);
        applyTransform();
    }

    function setExpanded(value) {
        isExpanded = value;
        if (isExpanded) {
            wrap.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;background:${cardBg};border-radius:0;z-index:1000;overflow:hidden;cursor:default;`;
            backBtn.style.opacity = '1';
            backBtn.style.pointerEvents = 'auto';
            svg.style.touchAction = 'none';
        } else {
            wrap.style.cssText = `position:relative;width:min(90vw,520px);height:min(85vh,520px);background:${cardBg};border-radius:24px;box-shadow:${dark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 10px 30px rgba(0,0,0,0.08)'};overflow:hidden;margin:6px auto;cursor:pointer;transition:all 0.5s cubic-bezier(0.2,0.9,0.3,1);`;
            backBtn.style.opacity = '0';
            backBtn.style.pointerEvents = 'none';
            svg.style.touchAction = 'auto';
        }
        setTimeout(() => { render(); fit(); }, 50);
    }

    let isPan = false, panStart = { x: 0, y: 0 }, initPan = { x: 0, y: 0 }, initPinch = 0, initScale = 1;

    svg.addEventListener('touchstart', e => {
        if (!isExpanded) return;
        if (e.touches.length === 1) {
            isPan = true;
            touchMoved = false;
            panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            initPan = { x: panX, y: panY };
        } else if (e.touches.length === 2) {
            isPan = false;
            initPinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            initScale = scale;
        }
        e.preventDefault();
    }, { passive: false });

    svg.addEventListener('touchmove', e => {
        if (!isExpanded) return;
        if (e.touches.length === 1 && isPan) {
            const dx = e.touches[0].clientX - panStart.x;
            const dy = e.touches[0].clientY - panStart.y;
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) touchMoved = true;
            panX = initPan.x + dx;
            panY = initPan.y + dy;
            applyTransform();
        } else if (e.touches.length === 2 && initPinch > 0) {
            const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            scale = Math.max(0.15, Math.min(3, initScale * (d / initPinch)));
            applyTransform();
        }
        e.preventDefault();
    }, { passive: false });

    svg.addEventListener('touchend', e => {
        if (e.touches.length < 2) initPinch = 0;
        if (e.touches.length === 0) isPan = false;
    });

    svg.addEventListener('wheel', e => {
        if (!isExpanded) return;
        e.preventDefault();
        const f = e.deltaY < 0 ? 1.1 : 0.9;
        scale = Math.max(0.15, Math.min(3, scale * f));
        applyTransform();
    }, { passive: false });

    let isMPan = false, mouseMoved = false;
    svg.addEventListener('mousedown', e => {
        if (!isExpanded) return;
        if (e.target.closest('g')) return;
        isMPan = true;
        mouseMoved = false;
        panStart = { x: e.clientX, y: e.clientY };
        initPan = { x: panX, y: panY };
        e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
        if (!isExpanded || !isMPan) return;
        if (Math.abs(e.clientX - panStart.x) > 4 || Math.abs(e.clientY - panStart.y) > 4) mouseMoved = true;
        panX = initPan.x + e.clientX - panStart.x;
        panY = initPan.y + e.clientY - panStart.y;
        applyTransform();
    });

    window.addEventListener('mouseup', () => { isMPan = false; });

    backBtn.addEventListener('click', e => {
        e.stopPropagation();
        setExpanded(false);
    });

    wrap.addEventListener('click', e => {
        if (isExpanded) return;
        if (e.target.closest('g')) return;
        if (touchMoved || mouseMoved) return;
        setExpanded(true);
    });

    render();
    fit();
}

/* ==========================================================================
   MATH GRAPH
   ========================================================================== */

function renderNativeMathGraph(container, json) {
    const dark = _isDark();
    const gridClr = dark ? '#2a2a2a' : '#e0e0e0';
    const axisClr = dark ? '#ccc' : '#555';

    const wrap = document.createElement('div');
    wrap.style.cssText = `width:min(100%,960px);margin:6px auto;display:flex;flex-direction:column;align-items:center;position:relative;`;

    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('viewBox', '0 0 960 540');
    svg.style.cssText = `display:block;width:100%;height:auto;background:transparent;cursor:grab;`;

    const defs = document.createElementNS(svgNs, 'defs');
    const clip = document.createElementNS(svgNs, 'clipPath');
    clip.setAttribute('id', 'graphClip_' + Date.now());
    const clipRect = document.createElementNS(svgNs, 'rect');
    clipRect.setAttribute('x', '60');
    clipRect.setAttribute('y', '40');
    clipRect.setAttribute('width', '840');
    clipRect.setAttribute('height', '440');
    clip.appendChild(clipRect);
    defs.appendChild(clip);
    svg.appendChild(defs);

    const gridG = document.createElementNS(svgNs, 'g');
    const axisG = document.createElementNS(svgNs, 'g');
    const tickG = document.createElementNS(svgNs, 'g');
    const labelG = document.createElementNS(svgNs, 'g');
    const dataG = document.createElementNS(svgNs, 'g');
    dataG.setAttribute('clip-path', `url(#${clip.getAttribute('id')})`);

    [gridG, axisG, tickG, labelG, dataG].forEach(g => svg.appendChild(g));
    wrap.appendChild(svg);
    container.appendChild(wrap);

    const plot = { x: 60, y: 40, w: 840, h: 440 };
    let xMin = json.xMin ?? -10;
    let xMax = json.xMax ?? 10;
    let yMin = json.yMin ?? -5;
    let yMax = json.yMax ?? 5;
    const expr = json.expression || json.expr || 'sin(x)';
    let compiledFn = null;

    function mapX(x) { return plot.x + ((x - xMin) / (xMax - xMin)) * plot.w; }
    function mapY(y) { return plot.y + plot.h - ((y - yMin) / (yMax - yMin)) * plot.h; }
    function svgEl(n, a = {}) { const e = document.createElementNS(svgNs, n); for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); return e; }
    function addText(g, x, y, text, cls, anchor = 'middle') {
        const t = svgEl('text', { x, y, class: cls, 'text-anchor': anchor, 'dominant-baseline': 'middle' });
        t.textContent = text;
        t.style.cssText = `font-size:${cls === 'axis-label' ? '12px' : '10px'};fill:${dark ? '#999' : '#888'};user-select:none;font-family:Arial,sans-serif;`;
        g.appendChild(t);
    }

    function autoY() {
        if (!compiledFn) return;
        let min = Infinity, max = -Infinity;
        for (let i = 0; i <= 400; i++) {
            const x = xMin + (i / 400) * (xMax - xMin);
            try {
                const y = compiledFn.evaluate({ x });
                if (isFinite(y)) {
                    min = Math.min(min, y);
                    max = Math.max(max, y);
                }
            } catch {}
        }
        if (min !== Infinity && max !== -Infinity) {
            const pad = Math.max(1, (max - min) * 0.15);
            yMin = min - pad;
            yMax = max + pad;
            if (Math.abs(yMax - yMin) < 1e-6) {
                yMin -= 1;
                yMax += 1;
            }
        }
    }

    function draw() {
        [gridG, axisG, tickG, labelG, dataG].forEach(g => g.innerHTML = '');

        const xZero = mapX(0);
        const yZero = mapY(0);
        const xRange = xMax - xMin || 1;
        const yRange = yMax - yMin || 1;

        let xStep = Math.pow(10, Math.floor(Math.log10(Math.abs(xRange / 6) || 1)));
        if (xRange / xStep > 12) xStep *= 2;
        if (xRange / xStep < 4) xStep /= 2;

        let yStep = Math.pow(10, Math.floor(Math.log10(Math.abs(yRange / 6) || 1)));
        if (yRange / yStep > 12) yStep *= 2;
        if (yRange / yStep < 4) yStep /= 2;

        for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
            const px = mapX(x);
            if (px < plot.x || px > plot.x + plot.w) continue;
            gridG.appendChild(svgEl('line', {
                x1: px, y1: plot.y, x2: px, y2: plot.y + plot.h,
                stroke: gridClr, 'stroke-width': '0.8', 'shape-rendering': 'crispEdges'
            }));
            tickG.appendChild(svgEl('line', {
                x1: px, y1: yZero - 3, x2: px, y2: yZero + 3,
                stroke: axisClr, 'stroke-width': '1', 'shape-rendering': 'crispEdges'
            }));
            if (Math.abs(x) > xStep / 100) addText(labelG, px, yZero + 14, parseFloat(x.toFixed(8)), 'tick-label');
        }

        for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
            const py = mapY(y);
            if (py < plot.y || py > plot.y + plot.h) continue;
            gridG.appendChild(svgEl('line', {
                x1: plot.x, y1: py, x2: plot.x + plot.w, y2: py,
                stroke: gridClr, 'stroke-width': '0.8', 'shape-rendering': 'crispEdges'
            }));
            tickG.appendChild(svgEl('line', {
                x1: xZero - 3, y1: py, x2: xZero + 3, y2: py,
                stroke: axisClr, 'stroke-width': '1', 'shape-rendering': 'crispEdges'
            }));
            if (Math.abs(y) > yStep / 100) addText(labelG, xZero - 14, py, parseFloat(y.toFixed(8)), 'tick-label', 'end');
        }

        if (0 >= xMin && 0 <= xMax) {
            axisG.appendChild(svgEl('line', {
                x1: plot.x, y1: yZero, x2: plot.x + plot.w, y2: yZero,
                stroke: axisClr, 'stroke-width': '2', 'shape-rendering': 'crispEdges'
            }));
        }

        if (0 >= yMin && 0 <= yMax) {
            axisG.appendChild(svgEl('line', {
                x1: xZero, y1: plot.y, x2: xZero, y2: plot.y + plot.h,
                stroke: axisClr, 'stroke-width': '2', 'shape-rendering': 'crispEdges'
            }));
            axisG.appendChild(svgEl('circle', { cx: xZero, cy: yZero, r: 3.5, fill: axisClr }));
        }

        addText(labelG, plot.x + plot.w - 10, yZero - 14, 'X', 'axis-label', 'end');
        addText(labelG, xZero + 14, plot.y + 12, 'Y', 'axis-label', 'start');

        if (compiledFn) {
            const pts = [];
            const dx = (xMax - xMin) / 500;
            for (let i = 0; i <= 500; i++) {
                const x = xMin + i * dx;
                try {
                    const y = compiledFn.evaluate({ x });
                    if (isFinite(y) && !isNaN(y)) pts.push([mapX(x), mapY(y)]);
                } catch {}
            }
            if (pts.length > 1) {
                let d = `M ${pts[0][0]} ${pts[0][1]}`;
                for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
                const path = svgEl('path', { d, fill: 'none', stroke: '#6cb6ff', 'stroke-width': '2.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
                dataG.appendChild(path);
                const stepIdx = Math.max(1, Math.floor(pts.length / 8));
                for (let i = 0; i < pts.length; i += stepIdx) {
                    dataG.appendChild(svgEl('circle', {
                        cx: pts[i][0],
                        cy: pts[i][1],
                        r: 3.5,
                        fill: '#e74c3c',
                        stroke: dark ? '#121212' : '#f4f4f4',
                        'stroke-width': '1.5'
                    }));
                }
            }
        }
    }

    if (window.math) {
        try { compiledFn = math.compile(expr); autoY(); } catch {}
        draw();
    } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.8.0/math.min.js';
        script.onload = () => { try { compiledFn = math.compile(expr); autoY(); } catch {} draw(); };
        document.head.appendChild(script);
    }

    let isPan = false, panSt = { x: 0, y: 0 }, panSave = {};
    svg.addEventListener('mousedown', e => {
        isPan = true;
        panSt = { x: e.clientX, y: e.clientY };
        panSave = { xMin, xMax, yMin, yMax };
        svg.style.cursor = 'grabbing';
        e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
        if (!isPan) return;
        const rect = svg.getBoundingClientRect();
        const sx = (panSave.xMax - panSave.xMin) / plot.w * (svg.viewBox.baseVal.width / rect.width);
        const sy = (panSave.yMax - panSave.yMin) / plot.h * (svg.viewBox.baseVal.height / rect.height);
        xMin = panSave.xMin - (e.clientX - panSt.x) * sx;
        xMax = panSave.xMax - (e.clientX - panSt.x) * sx;
        yMin = panSave.yMin + (e.clientY - panSt.y) * sy;
        yMax = panSave.yMax + (e.clientY - panSt.y) * sy;
        draw();
    });

    window.addEventListener('mouseup', () => {
        isPan = false;
        svg.style.cursor = 'grab';
    });

    svg.addEventListener('wheel', e => {
        e.preventDefault();
        const f = e.deltaY < 0 ? 0.9 : 1.1;
        const cx = (xMin + xMax) / 2;
        const cy = (yMin + yMax) / 2;
        const nXR = (xMax - xMin) * f;
        const nYR = (yMax - yMin) * f;
        xMin = cx - nXR / 2;
        xMax = cx + nXR / 2;
        yMin = cy - nYR / 2;
        yMax = cy + nYR / 2;
        draw();
    }, { passive: false });
}

/* ==========================================================================
   MAP
   ========================================================================== */

function renderNativeMapPlaceholder(container, json) {
    const dark = _isDark();
    const cardBg = dark ? '#1b1b1b' : '#ffffff';
    const uid = 'map_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    const wrap = document.createElement('div');
    wrap.style.cssText = `position:relative;width:min(90vw,420px);height:min(90vw,420px);background:${cardBg};border-radius:30px;box-shadow:0 20px 40px rgba(0,0,0,0.1);overflow:hidden;margin:6px auto;cursor:pointer;transition:all 0.4s cubic-bezier(0.2,0.9,0.4,1);`;

    const mapDiv = document.createElement('div');
    mapDiv.id = uid;
    mapDiv.style.cssText = 'width:100%;height:100%;background:#c8d6e5;';

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:5;';

    const backBtn = document.createElement('button');
    backBtn.style.cssText = `position:absolute;top:14px;right:14px;width:38px;height:38px;border-radius:50%;border:none;background:rgba(255,255,255,0.85);backdrop-filter:blur(10px);color:#333;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;opacity:0;pointer-events:none;transition:opacity 0.25s ease;box-shadow:0 2px 8px rgba(0,0,0,0.1);`;
    backBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    wrap.appendChild(mapDiv);
    wrap.appendChild(overlay);
    wrap.appendChild(backBtn);
    container.appendChild(wrap);

    let isExpanded = false;
    let mapInstance = null;
    const lng = json.lng ?? json.longitude ?? json.lon ?? 0;
    const lat = json.lat ?? json.latitude ?? 0;
    const zoom = json.zoom ?? 12;

    function initMap() {
        if (mapInstance) return;
        if (!window.maplibregl) return;

        mapInstance = new maplibregl.Map({
            container: uid,
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: [lng, lat],
            zoom,
            pitch: 50,
            bearing: 0,
            attributionControl: false,
            antialias: true
        });

        mapInstance.on('load', () => {
            mapInstance.flyTo({ center: [lng, lat], zoom: zoom + 0.5, pitch: 55, speed: 0.6 });
            if (json.marker !== false) {
                new maplibregl.Marker({ color: '#2F7BF6' }).setLngLat([lng, lat]).addTo(mapInstance);
            }
        });

        if (!window._mapInstances) window._mapInstances = {};
        window._mapInstances[uid] = mapInstance;

        _ensureStyle('mapLibreHideAttrib', '.maplibregl-ctrl-logo,.maplibregl-ctrl-attrib,.maplibregl-ctrl-group{display:none!important;}');
    }

    function setExpanded(value) {
        isExpanded = value;
        if (isExpanded) {
            wrap.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;background:${cardBg};border-radius:0;z-index:1000;overflow:hidden;cursor:default;`;
            backBtn.style.opacity = '1';
            backBtn.style.pointerEvents = 'auto';
            overlay.style.display = 'none';
            if (mapInstance) mapInstance.resize();
        } else {
            wrap.style.cssText = `position:relative;width:min(90vw,420px);height:min(90vw,420px);background:${cardBg};border-radius:30px;box-shadow:0 20px 40px rgba(0,0,0,0.1);overflow:hidden;margin:6px auto;cursor:pointer;transition:all 0.4s cubic-bezier(0.2,0.9,0.4,1);`;
            backBtn.style.opacity = '0';
            backBtn.style.pointerEvents = 'none';
            overlay.style.display = 'block';
            if (mapInstance) mapInstance.resize();
        }
        setTimeout(() => {
            if (mapInstance) mapInstance.resize();
        }, 50);
    }

    wrap.addEventListener('click', () => {
        if (!isExpanded) setExpanded(true);
    });

    backBtn.addEventListener('click', e => {
        e.stopPropagation();
        setExpanded(false);
    });

    if (window.maplibregl) {
        initMap();
    } else {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@4.3.2/dist/maplibre-gl.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/maplibre-gl@4.3.2/dist/maplibre-gl.js';
        script.onload = () => {
            initMap();
        };
        document.head.appendChild(script);
    }
}

/* ==========================================================================
   DISPATCHER
   ========================================================================== */

function buildNativeWidget(widgetType, jsonData, container) {
    try {
        const json = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

        switch (widgetType) {
            case 'widget_table':    renderNativeTable(container, json); break;
            case 'widget_bar':      renderNativeBarChart(container, json); break;
            case 'widget_pie':      renderNativePieChart(container, json); break;
            case 'widget_sheet':    renderNativeSheet(container, json); break;
            case 'widget_code':     renderNativeCodeBlock(container, json); break;
            case 'widget_market':   renderNativeMarket(container, json); break;
            case 'widget_calendar': renderNativeCalendar(container, json); break;
            case 'widget_timer':    renderNativeTimer(container, json); break;
            case 'widget_mindmap':  renderNativeMindMap(container, json); break;
            case 'widget_graph':    renderNativeMathGraph(container, json); break;
            case 'widget_map':      renderNativeMapPlaceholder(container, json); break;
            default:
                container.textContent = 'Widget desconhecido';
        }
    } catch (e) {
        container.textContent = 'Erro ao carregar widget';
        console.error('Widget error:', e);
    }
}
