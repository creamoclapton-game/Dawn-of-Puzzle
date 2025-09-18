
(() => {
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const TARGET_ASPECT = W / H;

  const ui = {
    tier: document.getElementById('tier'),
    pieceCount: document.getElementById('pieceCount'),
    theme: document.getElementById('theme'),
    mode: document.getElementById('mode'),
    newGame: document.getElementById('newGameBtn'),
    shuffle: document.getElementById('shuffleBtn'),
    peek: document.getElementById('peekBtn'),
    file: document.getElementById('imageInput'),
    aiBtn: document.getElementById('aiSuggestBtn'),
    aiList: document.getElementById('aiPromptList'),
    useDemo: document.getElementById('useDemoBtn'),
    submitScore: document.getElementById('submitScoreBtn'),
    time: document.getElementById('time'),
    placed: document.getElementById('placed'),
    total: document.getElementById('totalPieces'),
    best: document.getElementById('best'),
    scoresList: document.getElementById('scoresList'),
    cloudScores: document.getElementById('cloudScores'),
    cloudStatus: document.getElementById('cloudStatus'),
    peekOverlay: document.getElementById('peekOverlay'),
    peekImage: document.getElementById('peekImage')
  };

  function clampTierPieces() {
    const t = ui.tier.value;
    let min=10, max=50;
    if(t==='intermediate'){ min=50; max=300; }
    if(t==='hard'){ min=300; max=1000; }
    let v = Number(ui.pieceCount.value||0);
    if(v < min) v = min;
    if(v > max) v = max;
    ui.pieceCount.min = String(min);
    ui.pieceCount.max = String(max);
    ui.pieceCount.value = String(v);
    updateBestDisplay();
  }
  ui.tier.addEventListener('change', clampTierPieces);
  ui.pieceCount.addEventListener('change', clampTierPieces);

  function applyTheme(val) {
    document.body.classList.remove('theme-halloween','theme-thanksgiving','theme-christmas','theme-fourth','theme-paperback');
    switch(val){
      case 'halloween': document.body.classList.add('theme-halloween'); break;
      case 'thanksgiving': document.body.classList.add('theme-thanksgiving'); break;
      case 'christmas': document.body.classList.add('theme-christmas'); break;
      case 'fourth': document.body.classList.add('theme-fourth'); break;
      case 'paperback': document.body.classList.add('theme-paperback'); break;
      default: ;
    }
  }
  ui.theme.addEventListener('change', () => applyTheme(ui.theme.value));
  applyTheme(ui.theme.value);

  const prompts = [
    "a dreamy field of wildflowers at dawn, soft pastels, gentle sunlight, kid-friendly vibe",
    "cozy autumn leaves and pumpkins, friendly ghosts, smiling moon (Halloween)",
    "harvest table with warm pies, golden leaves, and playful turkeys (Thanksgiving)",
    "snowy village with twinkling lights, candy canes, and cheerful snowpeople (Christmas)",
    "festive fireworks and bunting, sunny picnic blanket with stars and stripes (Fourth of July)",
    "spooky paperback vibe: misty coastal town at night, lighthouse beam, subtle vintage texture (avoid specific living-artist styles)"
  ];
  function populatePrompts() {
    ui.aiList.innerHTML = "";
    prompts.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = p; opt.textContent = (i+1) + ". " + p;
      ui.aiList.appendChild(opt);
    });
  }
  populatePrompts();
  ui.aiBtn.addEventListener('click', () => {
    const sel = ui.aiList.value || prompts[0];
    navigator.clipboard?.writeText(sel);
    alert("Copied a prompt to clipboard. Generate with your preferred service, then upload.");
  });

  // Demo image
  const demoCanvas = document.createElement('canvas');
  demoCanvas.width = 960; demoCanvas.height = 600;
  const dctx = demoCanvas.getContext('2d');
  function drawDemo() {
    const sky = dctx.createLinearGradient(0,0,0,600);
    sky.addColorStop(0, "#fef6d2"); sky.addColorStop(1, "#cfeef7");
    dctx.fillStyle = sky; dctx.fillRect(0,0,960,600);
    dctx.beginPath(); dctx.arc(150,120,60,0,Math.PI*2);
    dctx.fillStyle = "rgba(255,210,90,.9)"; dctx.fill();
    dctx.fillStyle = "#b9e4a5";
    dctx.beginPath(); dctx.moveTo(0,380);
    for(let x=0;x<=960;x+=40){ dctx.lineTo(x, 380 + Math.sin(x/90)*20 + 30); }
    dctx.lineTo(960,600); dctx.lineTo(0,600); dctx.fill();
    dctx.fillStyle = "#a2d68f";
    dctx.beginPath(); dctx.moveTo(0,430);
    for(let x=0;x<=960;x+=40){ dctx.lineTo(x, 430 + Math.cos(x/100)*25 + 40); }
    dctx.lineTo(960,600); dctx.lineTo(0,600); dctx.fill();
    for(let i=0;i<180;i++){
      const x = Math.random()*960;
      const y = 380 + Math.random()*200;
      dctx.strokeStyle = "#4e8c55"; dctx.lineWidth = 2;
      dctx.beginPath(); dctx.moveTo(x, y); dctx.lineTo(x, y-15 - Math.random()*20); dctx.stroke();
      dctx.fillStyle = ["#ff66a0","#ffd166","#8ac926","#1982c4","#ff9f1c"][Math.floor(Math.random()*5)];
      dctx.beginPath(); dctx.arc(x, y-18 - Math.random()*20, 6+Math.random()*4, 0, Math.PI*2); dctx.fill();
    }
    dctx.fillStyle = "rgba(0,0,0,.35)"; dctx.font = "bold 48px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    dctx.fillText("Dawn of Puzzles", 530, 80);
  }
  drawDemo();
  const demoImg = new Image(); demoImg.src = demoCanvas.toDataURL('image/png');

  // Daily challenge
  function dailySetup(){
    if(ui.mode.value !== 'daily') return;
    const tier = ui.tier.value;
    const pcs = window.DOP_dailyPieces(tier);
    ui.pieceCount.value = String(pcs);
  }
  ui.mode.addEventListener('change', dailySetup);

  // State
  let img = new Image();
  let pieces = [];
  let rows = 3, cols = 4;
  let draggingId = null;
  let offsetX = 0, offsetY = 0;
  let startedAt = null;
  let placedCount = 0;
  let completed = false;
  let cellW = 0, cellH = 0;
  let imgDX=0, imgDY=0, drawW=0, drawH=0;

  function formatTime(sec){ const m=String(Math.floor(sec/60)).padStart(2,'0'); const s=String(Math.floor(sec%60)).padStart(2,'0'); return m+":"+s; }
  function bestKey(){ return `dop-best-${ui.pieceCount.value}`; }
  function scoreKey(){ return `dop-scores`; }
  function updateBestDisplay(){ const best = localStorage.getItem(bestKey()); ui.best.textContent = best ? formatTime(Number(best)) : '—'; }
  function tick(){ if(!startedAt || completed) return; const sec=(Date.now()-startedAt)/1000; ui.time.textContent=formatTime(sec); requestAnimationFrame(tick); }
  function saveScore(seconds){
    const arr = JSON.parse(localStorage.getItem(scoreKey())||"[]");
    arr.push({ pieces: Number(ui.pieceCount.value), seconds, when: Date.now(), mode: ui.mode.value });
    arr.sort((a,b) => a.seconds - b.seconds);
    const top = arr.slice(0,20);
    localStorage.setItem(scoreKey(), JSON.stringify(top));
    const bk = bestKey(); const prev = Number(localStorage.getItem(bk) || Infinity);
    if(seconds < prev) localStorage.setItem(bk, String(seconds));
    renderScores(top); updateBestDisplay();
  }
  function renderScores(arr){
    ui.scoresList.innerHTML = "";
    arr.forEach(s => {
      const li = document.createElement('li');
      const date = new Date(s.when).toLocaleDateString();
      li.textContent = `${s.pieces} pcs — ${formatTime(s.seconds)} (${date}) [${s.mode||'free'}]`;
      ui.scoresList.appendChild(li);
    });
  }
  renderScores(JSON.parse(localStorage.getItem(scoreKey())||"[]")); updateBestDisplay();

  // Cloud leaderboard (Supabase) optional
  const SUPA_URL = window.DOP_SUPABASE_URL;
  const SUPA_KEY = window.DOP_SUPABASE_ANON_KEY;
  if(SUPA_URL && SUPA_KEY){ ui.cloudStatus.textContent = "Connected"; loadCloudTop(); }
  else { ui.cloudStatus.textContent = "Not configured"; }

  async function loadCloudTop(){
    try{
      const res = await fetch(`${SUPA_URL}/rest/v1/scores?select=pieces,seconds,when_timestamptz,mode&order=seconds.asc&limit=20`, {
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
      });
      const data = await res.json();
      ui.cloudScores.innerHTML = "";
      data.forEach(row => {
        const li = document.createElement('li');
        const when = row.when_timestamptz ? new Date(row.when_timestamptz).toLocaleDateString() : "";
        li.textContent = `${row.pieces} pcs — ${formatTime(row.seconds)} ${when?`(${when})`:''} [${row.mode||'free'}]`;
        ui.cloudScores.appendChild(li);
      });
    }catch(e){ ui.cloudStatus.textContent = "Cloud load failed"; }
  }

  ui.submitScore.addEventListener('click', async () => {
    if(!(SUPA_URL && SUPA_KEY)){ alert("Cloud leaderboard not configured."); return; }
    const seconds = Math.round((Date.now()-startedAt)/1000);
    if(!completed){ alert("Finish the puzzle to submit!"); return; }
    const body = { pieces:Number(ui.pieceCount.value), seconds, when_timestamptz:new Date().toISOString(), mode: ui.mode.value };
    try{
      const res = await fetch(`${SUPA_URL}/rest/v1/scores`, {
        method:'POST',
        headers: { 'Content-Type':'application/json', apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, Prefer:'return=minimal' },
        body: JSON.stringify(body)
      });
      if(res.ok){ alert("Submitted!"); loadCloudTop(); }
      else{ alert("Submission failed."); }
    }catch(e){ alert("Network error."); }
  });

  // Grid & seed
  function gridForPieces(n){
    let best = {rows:1, cols:n, score:1e9};
    for(let r=1; r<=Math.ceil(Math.sqrt(n))+60; r++){
      const c = Math.ceil(n / r);
      const aspect = c / r;
      const score = Math.abs(aspect - TARGET_ASPECT) + (r*c - n)*0.001;
      if(score < best.score){ best = {rows:r, cols:c, score}; }
    }
    return [best.rows, best.cols];
  }

  // Jigsaw edge pattern
  function seededRNG(seed){
    let s = seed>>>0;
    return () => ((s = (s*1664525 + 1013904223)>>>0) / 4294967296);
  }
  function buildEdgeMatrix(rows, cols, seed){
    const rand = seededRNG(seed);
    // For each interior edge, decide tab (+1) or blank (0) or hole (-1). Opposite sides invert.
    const horiz = []; // between cells horizontally: rows x (cols-1)
    const vert = [];  // between cells vertically: (rows-1) x cols
    for(let r=0;r<rows;r++){ horiz[r]=[]; for(let c=0;c<cols-1;c++){ const v = rand()<0.5 ? -1 : 1; horiz[r][c]=v; } }
    for(let r=0;r<rows-1;r++){ vert[r]=[]; for(let c=0;c<cols;c++){ const v = rand()<0.5 ? -1 : 1; vert[r][c]=v; } }
    return {horiz, vert};
  }
  function piecePath(p, cellW, cellH, edges){
    const tabW = Math.min(cellW, cellH) * 0.35;
    const tabH = Math.min(cellW, cellH) * 0.22;
    const neck = Math.min(cellW, cellH) * 0.10;

    const left   = p.c>0 ? -(edges.horiz[p.r][p.c-1]) : 0;
    const right  = p.c<cols-1 ? edges.horiz[p.r][p.c] : 0;
    const up     = p.r>0 ? -(edges.vert[p.r-1][p.c]) : 0;
    const down   = p.r<rows-1 ? edges.vert[p.r][p.c] : 0;

    const x = p.x, y = p.y, w = p.w, h = p.h;
    ctx.beginPath();
    // top
    ctx.moveTo(x, y);
    if(up===0){ ctx.lineTo(x+w, y); }
    else {
      const dir = up; // 1 = tab, -1 = hole
      const mid = x + w/2;
      ctx.lineTo(mid - neck, y);
      bezTab(mid - neck, y, mid, y - dir*tabH, mid + neck, y); // bump
      ctx.lineTo(x+w, y);
    }
    // right
    if(right===0){ ctx.lineTo(x+w, y+h); }
    else {
      const dir = right;
      const mid = y + h/2;
      ctx.lineTo(x+w, mid - neck);
      bezTab(x+w, mid - neck, x+w + dir*tabW, mid, x+w, mid + neck);
      ctx.lineTo(x+w, y+h);
    }
    // bottom
    if(down===0){ ctx.lineTo(x, y+h); }
    else {
      const dir = down;
      const mid = x + w/2;
      ctx.lineTo(mid + neck, y+h);
      bezTab(mid + neck, y+h, mid, y+h + dir*tabH, mid - neck, y+h);
      ctx.lineTo(x, y+h);
    }
    // left
    if(left===0){ ctx.lineTo(x, y); }
    else {
      const dir = left;
      const mid = y + h/2;
      ctx.lineTo(x, mid + neck);
      bezTab(x, mid + neck, x - dir*tabW, mid, x, mid - neck);
      ctx.lineTo(x, y);
    }
    ctx.closePath();

    function bezTab(ax, ay, bx, by, cx, cy){
      // simple symmetric bump via two quadratic curves
      ctx.quadraticCurveTo(ax, ay, bx, by);
      ctx.quadraticCurveTo(cx, cy, cx, cy);
    }
  }

  let edgeMatrix = null;

  function loadImage(src){
    img = new Image();
    img.onload = () => { preparePuzzle(); };
    img.src = src;
    ui.peekImage.src = src;
  }

  ui.file.addEventListener('change', (e) => {
    const f = e.target.files?.[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = e2 => loadImage(e2.target.result);
    reader.readAsDataURL(f);
  });

  function preparePuzzle(){
    clampTierPieces();
    if(ui.mode.value==='daily'){ dailySetup(); }
    const n = Number(ui.pieceCount.value);

    const targetAspect = W/H; const imgAspect = img.width / img.height;
    if(imgAspect > targetAspect){ drawW=W; drawH=W/imgAspect; imgDX=0; imgDY=(H-drawH)/2; }
    else { drawH=H; drawW=H*imgAspect; imgDY=0; imgDX=(W-drawW)/2; }
    ctx.clearRect(0,0,W,H); ctx.drawImage(img, imgDX, imgDY, drawW, drawH);

    [rows, cols] = gridForPieces(n);
    const seed = (ui.mode.value==='daily') ? window.DOP_dailySeed(ui.theme.value) : Math.floor(Math.random()*2**32);
    edgeMatrix = buildEdgeMatrix(rows, cols, seed);
    cellW = drawW / cols; cellH = drawH / rows;
    pieces = []; placedCount = 0; completed = false;
    ui.placed.textContent = String(placedCount); ui.total.textContent = String(n);

    let count = 0;
    for(let r=0;r<rows && count<n;r++){
      for(let c=0;c<cols && count<n;c++){
        const correctX = imgDX + c*cellW;
        const correctY = imgDY + r*cellH;
        const rx = Math.random() < 0.5 ? Math.random()*W*0.25 : W*0.75 + Math.random()*W*0.25;
        const ry = Math.random() < 0.5 ? Math.random()*H*0.25 : H*0.75 + Math.random()*H*0.25;
        pieces.push({ id:count, r, c, x:rx, y:ry, correctX, correctY, w:cellW, h:cellH, placed:false });
        count++;
      }
    }
    drawAll(); startedAt = Date.now(); ui.time.textContent = "00:00"; requestAnimationFrame(tick); updateBestDisplay();
  }

  function drawAll(){
    ctx.clearRect(0,0,W,H);
    ctx.globalAlpha = 0.07; drawImageFitted(); ctx.globalAlpha = 1;
    const placed = pieces.filter(p=>p.placed);
    const free = pieces.filter(p=>!p.placed && p.id!==draggingId);
    const dragging = pieces.find(p=>p.id===draggingId);
    placed.forEach(p => drawPiece(p, false));
    free.forEach(p => drawPiece(p, false));
    if(dragging) drawPiece(dragging, true);
  }
  function drawImageFitted(){
    ctx.drawImage(img, imgDX, imgDY, drawW, drawH);
  }
  function drawPiece(p, isDragging=false){
    ctx.save();
    piecePath(p, cellW, cellH, edgeMatrix);
    ctx.clip();
    ctx.drawImage(img, p.correctX, p.correctY, p.w, p.h, p.x, p.y, p.w, p.h);
    ctx.restore();
    ctx.lineWidth = isDragging ? 3 : 1.5;
    ctx.strokeStyle = isDragging ? "#ffcf4e" : "rgba(0,0,0,.28)";
    piecePath(p, cellW, cellH, edgeMatrix);
    ctx.stroke();
    if(!p.placed){
      ctx.globalAlpha = 0.15; ctx.fillStyle = "#000";
      ctx.fillRect(p.correctX+1, p.correctY+1, 5, 5); ctx.globalAlpha = 1;
    }
  }

  const SNAP = 14;
  function trySnap(p){
    const dx=Math.abs(p.x-p.correctX), dy=Math.abs(p.y-p.correctY);
    if(dx<SNAP && dy<SNAP){
      p.x=p.correctX; p.y=p.correctY;
      if(!p.placed){ p.placed=true; placedCount++; ui.placed.textContent=String(placedCount); }
      return true;
    }
    return false;
  }

  function getPointerPos(evt){
    const rect = canvas.getBoundingClientRect();
    let x,y;
    if(evt.touches && evt.touches[0]){ x = evt.touches[0].clientX - rect.left; y = evt.touches[0].clientY - rect.top; }
    else { x = evt.clientX - rect.left; y = evt.clientY - rect.top; }
    x *= (canvas.width / rect.width); y *= (canvas.height / rect.height);
    return {x,y};
  }
  function pickPiece(x,y){
    for(let i=pieces.length-1;i>=0;i--){
      const p=pieces[i];
      // quick bbox first
      if(x>=p.x && x<=p.x+p.w && y>=p.y && y<=p.y+p.h && !p.placed){
        // then precise hit test with the same path
        ctx.save();
        piecePath(p, cellW, cellH, edgeMatrix);
        const hit = ctx.isPointInPath(x, y);
        ctx.restore();
        if(hit) return p;
      }
    }
    return null;
  }
  function pointerDown(evt){
    evt.preventDefault();
    const {x,y} = getPointerPos(evt);
    const p = pickPiece(x,y);
    if(p){ draggingId=p.id; offsetX=x-p.x; offsetY=y-p.y; drawAll(); }
  }
  function pointerMove(evt){
    if(draggingId==null) return;
    evt.preventDefault();
    const {x,y} = getPointerPos(evt);
    const p = pieces.find(pp=>pp.id===draggingId); if(!p) return;
    p.x = x - offsetX; p.y = y - offsetY; drawAll();
  }
  function pointerUp(evt){
    if(draggingId==null) return;
    evt.preventDefault();
    const p = pieces.find(pp=>pp.id===draggingId); draggingId=null; if(!p) return;
    trySnap(p); drawAll(); checkComplete();
  }
  function checkComplete(){
    if(placedCount === pieces.length && !completed){
      completed = true;
      const sec = (Date.now()-startedAt)/1000;
      saveScore(sec);
      setTimeout(()=>alert(`Puzzle complete! Time: ${formatTime(sec)}`), 10);
    }
  }

  canvas.addEventListener('mousedown', pointerDown);
  window.addEventListener('mousemove', pointerMove);
  window.addEventListener('mouseup', pointerUp);
  canvas.addEventListener('touchstart', pointerDown, {passive:false});
  canvas.addEventListener('touchmove', pointerMove, {passive:false});
  canvas.addEventListener('touchend', pointerUp, {passive:false});

  ui.newGame.addEventListener('click', () => { if(!img.src){ loadImage(demoImg.src); } else preparePuzzle(); });
  ui.shuffle.addEventListener('click', () => {
    if(!pieces.length) return;
    pieces.forEach(p => { if(!p.placed){ p.x = Math.random()*(W-p.w); p.y = Math.random()*(H-p.h); } });
    drawAll();
  });
  ui.peek.addEventListener('click', () => { ui.peekOverlay.classList.remove('hidden'); setTimeout(()=>ui.peekOverlay.classList.add('hidden'), 1000); });
  ui.useDemo.addEventListener('click', () => loadImage(demoImg.src));

  // Init
  clampTierPieces();
  dailySetup();
  loadImage(demoImg.src);
})();
