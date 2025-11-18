// main.js — Fixed full version (drop-in replacement)

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// UI elements
const algoSelect = document.getElementById("algo");
const playBtn = document.getElementById("play");
const pauseBtn = document.getElementById("pause");
const nextBtn = document.getElementById("next");
const resetBtn = document.getElementById("reset");
const downloadBtn = document.getElementById("download");
const speedInput = document.getElementById("speed");
const zoomInput = document.getElementById("zoom");
const snapCheckbox = document.getElementById("snap");
const arrowsCheckbox = document.getElementById("showArrows");
const originToggle = document.getElementById("originToggle");

const infoBox = document.getElementById("infoBox");
const theadRow = document.getElementById("theadRow");
const tbodyRows = document.getElementById("tbodyRows");
const mouseCoords = document.getElementById("mouseCoords");
const slopeBox = document.getElementById("slopeBox");

const paramsDDA = document.getElementById("params-dda");
const paramsCircle = document.getElementById("params-circle");
const x1i = document.getElementById("x1"), y1i = document.getElementById("y1"),
      x2i = document.getElementById("x2"), y2i = document.getElementById("y2");
const xci = document.getElementById("xc"), yci = document.getElementById("yc"), ri = document.getElementById("r");

let generator = null;
let playing = false;
let stepDelay = parseInt(speedInput.value || 120);
let scale = parseInt(zoomInput.value || 20); // pixels per grid unit
let originModeTopLeft = originToggle.checked; // if true: top-left origin; else center
let origin = { x: 0, y: 0 }; // canvas pixel coordinates of grid origin
let pan = { x: 0, y: 0 }; // pan offset applied to origin (in pixels)
let dragging = false;
let lastDrag = { x: 0, y: 0 };
let lastPlotted = null; // for arrow drawing

// Responsive canvas
function resizeCanvas() {
  const wrap = canvas.parentElement;
  canvas.width = Math.min(1200, Math.max(600, wrap ? wrap.clientWidth - 20 : 800));
  canvas.height = 560;
  resetOrigin();
  drawGrid();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Origin helpers
function resetOrigin() {
  if (originModeTopLeft) {
    origin.x = 0 + pan.x;
    origin.y = 0 + pan.y;
  } else {
    origin.x = canvas.width / 2 + pan.x;
    origin.y = canvas.height / 2 + pan.y;
  }
}
resetOrigin();

function canvasToGrid(px, py) {
  const gx = (px - origin.x) / scale;
  const gy = (origin.y - py) / scale;
  return { x: gx, y: gy };
}
function gridToCanvas(gx, gy) {
  const px = origin.x + gx * scale;
  const py = origin.y - gy * scale;
  return { x: px, y: py };
}

// UI inputs listeners
speedInput.addEventListener('input', ()=> stepDelay = parseInt(speedInput.value));
zoomInput.addEventListener('input', ()=>{ scale = parseInt(zoomInput.value); drawGrid(); });
originToggle.addEventListener('change', ()=>{ originModeTopLeft = originToggle.checked; pan = {x:0,y:0}; resetOrigin(); drawGrid(); });

// Pan with mouse drag
canvas.addEventListener('mousedown', (e)=>{ if (e.button !== 0) return; dragging = true; lastDrag = { x: e.clientX, y: e.clientY }; });
window.addEventListener('mouseup', ()=> dragging = false);
window.addEventListener('mousemove', (e)=>{
  // if dragging for pan
  if (dragging) {
    const dx = e.clientX - lastDrag.x;
    const dy = e.clientY - lastDrag.y;
    pan.x += dx; pan.y += dy;
    lastDrag = { x: e.clientX, y: e.clientY };
    resetOrigin();
    drawGrid();
  }
});

// Zoom centered at mouse
canvas.addEventListener('wheel', (e)=>{
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const before = canvasToGrid(mx,my);
  if (e.deltaY < 0) scale = Math.min(120, scale + 2);
  else scale = Math.max(6, scale - 2);
  zoomInput.value = scale;
  const after = canvasToGrid(mx,my);
  const ddx = (after.x - before.x) * scale;
  const ddy = (before.y - after.y) * scale;
  pan.x += ddx; pan.y += ddy;
  resetOrigin();
  drawGrid();
});

// Mouse coords display (and ghost pixel handled below)
canvas.addEventListener('mousemove', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  const g = canvasToGrid(px, py);
  mouseCoords.textContent = `(${g.x.toFixed(2)}, ${g.y.toFixed(2)})`;
});

// ------- INPUT PANEL SWITCHING (FIX) -------
function updateParamPanels() {
  const val = algoSelect.value;
  const isLine = (val === 'dda' || val === 'bresenham');
  const isCircle = (val === 'circle' || val === 'bresenham_circle');
  paramsDDA.style.display = isLine ? 'block' : 'none';
  paramsCircle.style.display = isCircle ? 'block' : 'none';
  // update slope / UI immediately
  drawInputs();
}
algoSelect.addEventListener('change', ()=>{ updateParamPanels(); reset(); });
updateParamPanels(); // initial setup

// Click to set endpoints / circle center+radius via two clicks
let clickCount = 0;
canvas.addEventListener('click', (e)=>{
  const rect = canvas.getBoundingClientRect();
  let px = e.clientX - rect.left, py = e.clientY - rect.top;
  let g = canvasToGrid(px, py);

  if (snapCheckbox.checked) { g.x = Math.round(g.x); g.y = Math.round(g.y); }

  if (algoSelect.value === 'circle' || algoSelect.value === 'bresenham_circle') {
    // center then radius point
    if (clickCount === 0) {
      xci.value = g.x; yci.value = g.y; clickCount = 1;
    } else {
      const dx = g.x - parseFloat(xci.value);
      const dy = g.y - parseFloat(yci.value);
      ri.value = Math.sqrt(dx*dx + dy*dy);
      clickCount = 0;
    }
  } else {
    // line endpoints
    if (clickCount === 0) {
      x1i.value = g.x; y1i.value = g.y; clickCount = 1;
    } else {
      x2i.value = g.x; y2i.value = g.y; clickCount = 0;
    }
  }
  reset();
  drawGrid();
  drawInputs();
});

// table helpers
function setupTable(headers){ theadRow.innerHTML=''; headers.forEach(h=>{const th=document.createElement('th'); th.textContent=h; theadRow.appendChild(th)}); tbodyRows.innerHTML=''; }
function addTableRow(vals){ const tr=document.createElement('tr'); vals.forEach(v=>{const td=document.createElement('td'); td.textContent=v; tr.appendChild(td)}); tbodyRows.appendChild(tr) }

// drawGrid
function drawGrid() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  resetOrigin();

  // light grid
  ctx.save();
  ctx.strokeStyle = "#eef3ff";
  ctx.lineWidth = 1;
  const stepPx = scale;
  for (let x = origin.x % stepPx; x <= canvas.width; x += stepPx) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
  for (let y = origin.y % stepPx; y <= canvas.height; y += stepPx) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
  ctx.restore();

  // axes
  ctx.save(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, origin.y); ctx.lineTo(canvas.width, origin.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(origin.x, 0); ctx.lineTo(origin.x, canvas.height); ctx.stroke();
  ctx.restore();

  // ticks & labels
  ctx.save(); ctx.fillStyle = '#111'; ctx.font = `${Math.max(10, Math.min(14, scale/1.8))}px Arial`;
  const stepUnits = chooseTickStep(scale);
  const startGX = Math.floor((0 - origin.x)/scale);
  const endGX = Math.ceil((canvas.width - origin.x)/scale);
  for (let gx = startGX; gx <= endGX; gx += stepUnits) {
    const px = origin.x + gx * scale;
    ctx.beginPath(); ctx.moveTo(px, origin.y - 6); ctx.lineTo(px, origin.y + 6); ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillText(gx.toString(), px - 8, origin.y + 16);
  }
  const startGY = Math.floor((origin.y - canvas.height)/scale);
  const endGY = Math.ceil((origin.y - 0)/scale);
  for (let gy = startGY; gy <= endGY; gy += stepUnits) {
    const py = origin.y - gy * scale;
    ctx.beginPath(); ctx.moveTo(origin.x - 6, py); ctx.lineTo(origin.x + 6, py); ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
    if (Math.abs(gy) > 0 || originModeTopLeft) ctx.fillText(gy.toString(), origin.x + 8, py + 4);
  }
  ctx.restore();
}

// helper chooseTickStep
function chooseTickStep(pxPerUnit){
  if (pxPerUnit < 12) return 5;
  if (pxPerUnit < 18) return 4;
  if (pxPerUnit < 30) return 2;
  return 1;
}

// drawing helpers
function drawPixelGrid(gx, gy, color='black'){
  const p = gridToCanvas(gx, gy);
  ctx.fillStyle = color;
  const w = Math.max(2, Math.min(6, scale/4));
  ctx.fillRect(Math.round(p.x)-Math.floor(w/2), Math.round(p.y)-Math.floor(w/2), w, w);
}
function drawEndpointGrid(gx, gy){
  const p = gridToCanvas(gx, gy);
  ctx.fillStyle = '#0b66ff';
  ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(3, Math.min(6, scale/4)), 0, Math.PI*2); ctx.fill();
}
function drawArrowBetween(prevG, curG){
  if(!prevG) return;
  const p1 = gridToCanvas(prevG.x, prevG.y);
  const p2 = gridToCanvas(curG.x, curG.y);
  ctx.save();
  ctx.strokeStyle = 'rgba(200,20,20,0.9)'; ctx.fillStyle = 'rgba(200,20,20,0.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const ah = 8;
  ctx.beginPath();
  ctx.moveTo(p2.x, p2.y);
  ctx.lineTo(p2.x - ah*Math.cos(ang - Math.PI/6), p2.y - ah*Math.sin(ang - Math.PI/6));
  ctx.lineTo(p2.x - ah*Math.cos(ang + Math.PI/6), p2.y - ah*Math.sin(ang + Math.PI/6));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ---------- Algorithm wiring ----------

// Try multiple possible global generator names and return the first existing one
function lookupGeneratorFactory(nameCandidates) {
  for (const name of nameCandidates) {
    const fn = window[name];
    if (typeof fn === 'function') return fn;
  }
  return null;
}

// Create a no-op generator (finished) to avoid runtime errors if algo missing
function emptyGenerator() { return (function*(){ return; })(); }

function createGeneratorFromUI(){
  const algo = algoSelect.value;
  if (algo === 'dda') {
    const fn = lookupGeneratorFactory(['DDA_generator','DDA','dda_generator','dda']);
    if (!fn) { infoBox.textContent = 'DDA not loaded'; return emptyGenerator(); }
    return fn(+x1i.value, +y1i.value, +x2i.value, +y2i.value);
  }
  if (algo === 'bresenham') {
    const fn = lookupGeneratorFactory(['Bresenham_generator','Bresenham','bresenham_generator','bresenham']);
    if (!fn) { infoBox.textContent = 'Bresenham line not loaded'; return emptyGenerator(); }
    return fn(+x1i.value, +y1i.value, +x2i.value, +y2i.value);
  }
  if (algo === 'circle' || algo === 'bresenham_circle') {
    // support multiple circle generator global names
    const fn = lookupGeneratorFactory(['Circle_generator','Circle','circle_generator','circle','bresenham_circle','BresenhamCircle','BresenhamCircle_generator','window.bresenham_circle']);
    if (!fn) { infoBox.textContent = 'Circle algorithm not loaded'; return emptyGenerator(); }
    return fn(+xci.value, +yci.value, +ri.value);
  }
  infoBox.textContent = 'Unknown algorithm';
  return emptyGenerator();
}

// Step logic
function step(){
  if(!generator){
    generator = createGeneratorFromUI();
    drawGrid();
    drawInputs();
    lastPlotted = null;
  }
  const res = generator.next();
  if(res.done){ infoBox.textContent = 'Finished'; playing = false; generator = null; return; }
  const val = res.value || {};

  // draw plotted points
  if(val.plot){
    val.plot.forEach(pt=>{
      if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') drawPixelGrid(pt.x, pt.y, pt.c || 'black');
    });

    if(arrowsCheckbox.checked && val.plot.length>0){
      const cur = val.plot[val.plot.length-1];
      if(lastPlotted) drawArrowBetween(lastPlotted, cur);
      lastPlotted = cur;
    } else if(val.plot && val.plot.length>0){
      lastPlotted = val.plot[val.plot.length-1];
    }
  }

  if(val.meta){ setupTable(val.meta.headers || []); addTableRow(val.meta.row || []); }
  if(val.info){ infoBox.innerHTML = Object.entries(val.info).map(([k,v])=>`<b>${k}:</b> ${v}`).join('<br>'); }

  if(val.info && ('slope' in val.info)) slopeBox.textContent = val.info.slope;
}

function runLoop(){
  if(!playing) return;
  step();
  setTimeout(runLoop, stepDelay);
}

playBtn.onclick = ()=>{ if(!generator) generator = createGeneratorFromUI(); playing = true; runLoop(); };
pauseBtn.onclick = ()=> playing = false;
nextBtn.onclick = ()=> { playing = false; step(); };
resetBtn.onclick = reset;

function reset(){
  playing = false; generator = null; lastPlotted = null;
  drawGrid(); setupTable(['Step Data']); infoBox.textContent = 'No algorithm running'; slopeBox.textContent = '—';
  drawInputs();
}

// draw inputs (endpoints/centers)
function drawInputs(){
  if(algoSelect.value === 'circle' || algoSelect.value === 'bresenham_circle'){
    drawEndpointGrid(+xci.value, +yci.value);
    const r = +ri.value;
    if(!isNaN(r)){
      const c = gridToCanvas(+xci.value, +yci.value);
      ctx.save(); ctx.strokeStyle='rgba(10,120,10,0.7)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(2, r*scale), 0, Math.PI*2); ctx.stroke(); ctx.restore();
      const pr = gridToCanvas(+xci.value + r, +yci.value);
      ctx.save(); ctx.strokeStyle='#0b66ff'; ctx.setLineDash([6,4]); ctx.beginPath(); ctx.moveTo(c.x,c.y); ctx.lineTo(pr.x,pr.y); ctx.stroke(); ctx.restore();
    }
  } else {
    drawEndpointGrid(+x1i.value, +y1i.value);
    drawEndpointGrid(+x2i.value, +y2i.value);
    const dx = +x2i.value - +x1i.value, dy = +y2i.value - +y1i.value;
    if(dx !== 0) slopeBox.textContent = (dy/dx).toFixed(3); else slopeBox.textContent = (dy===0? '0' : 'Infinity');
  }
}

// preview ghost pixel on mouse move (separate from coords)
canvas.addEventListener('mousemove', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  const g = canvasToGrid(px, py);
  drawGrid(); drawInputs();
  if(snapCheckbox.checked){
    const sx = Math.round(g.x), sy = Math.round(g.y);
    const p = gridToCanvas(sx, sy);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(Math.round(p.x)-2, Math.round(p.y)-2, 4, 4);
  } else {
    const p = gridToCanvas(g.x, g.y);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(Math.round(p.x)-2, Math.round(p.y)-2, 4, 4);
  }
});

// download PNG
downloadBtn.addEventListener('click', ()=>{ const link = document.createElement('a'); link.download = 'cg_visualizer.png'; link.href = canvas.toDataURL(); link.click(); });

// initial setup
setupTable(['Step Data']);
reset();
