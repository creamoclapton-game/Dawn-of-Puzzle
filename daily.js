
// Deterministic daily seed from YYYY-MM-DD and theme
window.DOP_dailySeed = function(theme){
  const d = new Date();
  const key = d.toISOString().slice(0,10) + '|' + (theme||'wildflowers');
  let h=2166136261>>>0;
  for(let i=0;i<key.length;i++){ h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
window.DOP_dailyPieces = function(tier){
  // pick a consistent piece count in the tier range for the day
  const rng = (s)=>{ s = (s^0x9e3779b9)>>>0; return ()=>((s = Math.imul(s^s>>>15,1|s))>>>0)/4294967296 };
  let min=10, max=50;
  if(tier==='intermediate'){ min=50; max=300; }
  if(tier==='hard'){ min=300; max=1000; }
  const seed = window.DOP_dailySeed(tier);
  const r = rng(seed)();
  return Math.max(min, Math.min(max, Math.round(min + r*(max-min))));
}
