import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SLOT_COUNT,SLOT_REGISTRY,legacyCenter,legacyAnchor,readSlotRegistry,holeDiameterMm,slotGeometry,shapeVertices,polygonDistance,holeConflicts,OWNERS,clippedCorner,ownershipGeometry,edgeMargin,mirrorAcrossCut} from '../physical-map-geometry.js';
const hex=JSON.parse(readFileSync(new URL('../docs/PHYSICAL_MAP_LAYOUT_110CM_HEX50_USER_2026-11-24.json',import.meta.url),'utf8'));
const square=JSON.parse(readFileSync(new URL('../docs/PHYSICAL_MAP_LAYOUT_110CM_USER_2026-11-24.json',import.meta.url),'utf8'));
const close=(a,b,epsilon=1e-8)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
test('shared registry preserves all 79 original stable IDs and legacy anchors',()=>{
 assert.equal(SLOT_COUNT,79);assert.equal(new Set(SLOT_REGISTRY.map(s=>s.id)).size,79);
 for(const layout of [hex,square]){
  const u=1536/layout.boardWidthMm;
  const records=readSlotRegistry(layout.districts,u);
  assert.equal(records.length,79);
  assert.deepEqual(records.map(r=>r.id).sort(),SLOT_REGISTRY.map(r=>r.id).sort());
  for(const r of records){
   const anchor=legacyAnchor(r.center,u);
   close(anchor.x,r.record.x);close(anchor.y,r.record.y);
   close(r.center.x,r.record.x+20*u);close(r.center.y,r.record.y+20*u);
  }
 }
});
test('registry rejects duplicate ordinal, unknown district and wrong count',()=>{
 for(const mutate of [d=>d.civic[1].slot=d.civic[0].slot,d=>d.unknown=[],d=>d.civic.pop(),d=>d.park=[{slot:1,x:1,y:1}],d=>d.civic[0].x=NaN]){
  const d=structuredClone(hex.districts);mutate(d);assert.throws(()=>readSlotRegistry(d,1536/1100));
 }
});
test('normal clearance is exact for every hex side at arbitrary rotation, scale and size',()=>{
 for(const sizeMm of [25,40,50,70])for(const c of [0,.2,.5,1])for(const angle of [0,23,60,359]){
  const u=1536/840/1.2;
  const g=slotGeometry({record:{x:100,y:200},shape:'hex',sizeMm,clearanceMm:c,unitsPerMm:u,angle});
  close(g.holeMm,sizeMm+4*c/Math.sqrt(3));
  close(g.center.x,100+20*u);close(g.center.y,200+20*u);
  for(let i=0;i<6;i++){
   const p=g.tile[i],q=g.tile[(i+1)%6],h=g.hole[i];
   const normalDistance=Math.abs((q.x-p.x)*(h.y-p.y)-(q.y-p.y)*(h.x-p.x))/Math.hypot(q.x-p.x,q.y-p.y);
   close(normalDistance,c*u);
  }
 }
 close(holeDiameterMm('square',40,.5),41);
 close(holeDiameterMm('oct',40,.5),40+1/Math.cos(Math.PI/8));
 for(const c of [-.1,1.1,NaN,'0.5'])assert.throws(()=>holeDiameterMm('hex',50,c));
});
test('exact distance detects contact, overlap and separated rotated openings',()=>{
 const a=shapeVertices('hex',50,{x:0,y:0});
 const b=shapeVertices('hex',50,{x:50*Math.sqrt(3)/2,y:0});
 close(polygonDistance(a,b),0);
 const c=shapeVertices('hex',50,{x:50*Math.sqrt(3)/2+2,y:0});
 close(polygonDistance(a,c),2);
 assert.equal(holeConflicts([{id:'a',hole:a},{id:'b',hole:b}]).pairs.length,1);
 assert.equal(holeConflicts([{id:'a',hole:a},{id:'b',hole:a}]).pairs[0].overlap,true);
 assert.equal(holeConflicts([{id:'a',hole:a},{id:'c',hole:c}]).pairs.length,0);
});
test('actual HEX50 reference retains centers while clearance reduces minimum bridge',()=>{
 const u=1536/hex.boardWidthMm;
 const rows=readSlotRegistry(hex.districts,u);
 const geometry=c=>rows.map(r=>({id:r.id,...slotGeometry({record:r.record,shape:'hex',sizeMm:50,clearanceMm:c,unitsPerMm:u,angle:r.record.rotation})}));
 const base=geometry(0),expanded=geometry(.5);
 assert.deepEqual(base.map(e=>e.center),expanded.map(e=>e.center));
 const original=holeConflicts(base),withClearance=holeConflicts(expanded);
 close(original.minimum/u,2.2234042899447672,1e-5);
 close(withClearance.minimum/u,1.2234042899447672,1e-5);
 assert.equal(withClearance.pairs.length,0);
});

test('clipped hex uses a single cut with exact physical dimensions and a bounded edge length',()=>{
 for(const d of [25,40,45,50,70])for(const a of [3,5,8,12]){
  const c=clippedCorner({sizeMm:d,cutMm:a});
  assert.equal(c.vertices.length,7);
  close(c.cutMm,Math.min(a,.9*d/2));
  close(c.depthMm,c.cutMm/2);
  close(c.widthMm,c.cutMm*Math.sqrt(3));
  close(Math.hypot(c.cutEdge[1].x-c.cutEdge[0].x,c.cutEdge[1].y-c.cutEdge[0].y),c.widthMm);
 }
});
test('six owners retain the same opening and expose exactly one mark through both faces',()=>{
 assert.equal(OWNERS.length,6);
 for(const sizeMm of [40,45,50,70])for(const angle of [0,23,359])for(let owner=0;owner<6;owner++){
  const g=ownershipGeometry({sizeMm,cutMm:8,clearanceMm:.5,angle,owner});
  assert.equal(g.safe,true);
  assert.equal(g.marks.length,6);
  close(g.faceAngle,angle+owner*60);
  assert.deepEqual(g.hole,ownershipGeometry({sizeMm,cutMm:8,clearanceMm:.5,angle,owner:0}).hole);
  assert.equal(g.vertices.length,7);
  for(const p of g.backVertices)assert.ok(g.vertices.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<1e-8));
  for(const p of mirrorAcrossCut(g.backVertices,{x:0,y:0},g.faceAngle))assert.ok(g.vertices.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<1e-8));
  for(const poly of [g.vertices,g.backVertices]){
   // Sample the entire conservative translation circle, including arbitrary directions.
   for(let k=0;k<72;k++){
    const theta=k*Math.PI/36,dx=g.translationBoundMm*Math.cos(theta),dy=g.translationBoundMm*Math.sin(theta);
    const shifted=poly.map(p=>({x:p.x+dx,y:p.y+dy}));
    for(const m of g.marks){
     const margin=edgeMargin(m,shifted);
     if(m.index===owner)assert.ok(margin<=-m.radius+1e-8,'owner mark must be outside cut');
     else assert.ok(margin>=m.radius-1e-8,'other marks must remain covered');
    }
   }
  }
 }
});
test('small cuts at large clearance are flagged rather than promising an invisible mark',()=>{
 const bad=ownershipGeometry({sizeMm:50,cutMm:3,clearanceMm:1});
 assert.equal(bad.safe,false);
 assert.equal(bad.marks[0].radius,0);
 const good=ownershipGeometry({sizeMm:50,cutMm:12,clearanceMm:1});
 assert.equal(good.safe,true);
 for(const invalid of [-1,6,1.2])assert.throws(()=>ownershipGeometry({sizeMm:50,cutMm:8,owner:invalid}));
 // Legacy octagon experiment remains supported, with two non-player locations.
 const oct=ownershipGeometry({shape:'oct',sizeMm:50,cutMm:8,clearanceMm:.5,owner:5});
 assert.equal(oct.marks.length,8);assert.equal(oct.vertices.length,9);
});

import {defaultFold,readFold,changeFoldPreset,foldLayout,foldConflicts} from '../physical-map-folds.js';
test('fold grids form a connected tree with separate overlays and correct nominal stack',()=>{
 for(const [preset,count] of [['2x2',4],['3x2',6],['4x2',8],['4x3',12]]){
  const f=defaultFold(preset),l=foldLayout(840,560,f);
  assert.equal(l.panels.length,count);assert.equal(l.seams.filter(s=>s.kind==='hinge').length,count-1);
  const reached=new Set(['p1-1']);
  for(let k=0;k<count;k++)for(const s of l.seams.filter(s=>s.kind==='hinge')){
   const [i,j]=s.id.slice(1).split('-').map(Number);
   const a=s.axis==='x'?'p'+j+'-'+i:'p'+i+'-'+j;
   const b=s.axis==='x'?'p'+j+'-'+(i+1):'p'+(i+1)+'-'+j;
   if(reached.has(a)||reached.has(b)){reached.add(a);reached.add(b)}
  }
  assert.equal(reached.size,count);
  close(l.stack.w,840/l.cols);close(l.stack.h,560/l.rows);close(l.stack.depth,count*2.5);
  close(l.panels.reduce((a,p)=>a+p.w*p.h,0),840*560);
  for(const p of l.panels){
   assert.ok(p.overlay.w>0&&p.overlay.h>0);
   if(p.c)close(p.overlay.x-p.x,8);
   if(p.r)close(p.overlay.y-p.y,8);
   if(p.c<l.cols-1)close(p.x+p.w-p.overlay.x-p.overlay.w,8);
   if(p.r<l.rows-1)close(p.y+p.h-p.overlay.y-p.overlay.h,8);
  }
 }
 const l=foldLayout(840,560,defaultFold());
 assert.deepEqual(l.stack,{w:280,h:280,depth:15});assert.equal(l.fitsNominal,true);
 assert.equal(foldLayout(840,560,{...l.config,boxW:279}).fitsNominal,false);
 assert.equal(foldLayout(840,560,{...l.config,boxDepth:14}).fitsNominal,false);
});
test('fold line positions, unequal panels and box rotation are explicit and validated',()=>{
 const f=defaultFold(),changed=readFold({...f,x:[.25,.6],spine:2});
 const l=foldLayout(840,560,changed);
 close(l.stack.w,336);assert.equal(l.regular,false);
 assert.equal(l.seams.find(s=>s.id==='h1-3').kind,'hinge');
 assert.equal(l.seams.find(s=>s.id==='h1-2').kind,'cut');
 assert.deepEqual(readFold(JSON.parse(JSON.stringify(changed))),changed);
 assert.equal(foldLayout(840,560,{...changed,boxW:280,boxH:337}).fitsNominal,true);
 assert.equal(changeFoldPreset(changed,'4x3').x.length,3);
 for(const invalid of [{x:[.6,.25]},{x:[.02,.6]},{x:[.3]},{guardMm:13},{baseMm:0},{spine:3},{boxW:100}])assert.throws(()=>readFold({...f,...invalid}));
});
test('seam collision uses actual opening and infrastructure polygons, including touch and zero guard',()=>{
 const f={...defaultFold(),enabled:true},l=foldLayout(840,560,f);
 const rect=(x,y,w,h)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
 const entries=[{id:'hole',kind:'slot',polygon:rect(270,40,8,10)},{id:'node',kind:'node',polygon:rect(100,272,10,10)},{id:'safe',kind:'slot',polygon:rect(10,10,10,10)},{id:'touch',kind:'slot',polygon:rect(260,40,12,10)}];
 assert.deepEqual(foldConflicts(l,entries).map(x=>x.id),['hole','node','touch']);
 assert.deepEqual(foldConflicts(foldLayout(840,560,{...f,enabled:false}),entries),[]);
 const noGuard=foldLayout(840,560,{...f,guardMm:0});
 assert.deepEqual(foldConflicts(noGuard,[{id:'cross',kind:'slot',polygon:rect(275,40,10,10)},{id:'away',kind:'slot',polygon:rect(270,40,9,10)}]).map(x=>x.id),['cross']);
});
test('reference 79-slot HEX50 geometry has thirteen conflicts at 110cm / 3x2 without moving records',()=>{
 const u=1536/1100,layout=foldLayout(1100,1100*2/3,{...defaultFold(),enabled:true});
 const entries=readSlotRegistry(hex.districts,u).map(e=>({id:e.id,kind:'slot',polygon:slotGeometry({record:e.record,shape:'hex',sizeMm:50,clearanceMm:.5,unitsPerMm:u,angle:e.record.rotation}).hole.map(p=>({x:p.x/u,y:(p.y-11)/u}))}));
 assert.equal(foldConflicts(layout,entries).length,13);
});

import {readManufacturing,polygonArea,clipToRect,rectMargin,manufacturingDiagnostics,tileMaterial} from '../physical-map-manufacturing.js';
const mfgRect=(x,y,w,h)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
const mfgEntry=(id,x,y,w,h)=>({id,polygon:mfgRect(x,y,w,h)});
test('manufacturing thresholds distinguish actual web, edge, reserve and logistics proximity',()=>{
 const layout=foldLayout(100,100,defaultFold());
 const entries=[mfgEntry('a',5,20,10,10),mfgEntry('b',20,20,10,10),mfgEntry('c',36,20,10,10)];
 const nodes=[mfgEntry('node',31,20,3,3),mfgEntry('node2',34.5,20,1,3)];
 const r=manufacturingDiagnostics({width:100,height:100,entries,nodes,layout,zones:{left:7},config:{webMm:6,edgeMm:6,nodeGapMm:2}});
 assert.deepEqual(r.pairs.map(p=>p.ids),[['a','b']]);close(r.minimumWebMm,5);
 assert.deepEqual(r.edges,[{id:'a',distanceMm:5}]);assert.deepEqual(r.reserves,['a']);
 assert.deepEqual(r.logistics.map(p=>p.ids),[['b','node'],['c','node2']]);
 assert.deepEqual(r.nodePairs.map(p=>p.ids),[['node','node2']]);
 assert.deepEqual(r.badSlots.sort(),['a','b','c']);assert.equal(r.overlapCount,0);
});
test('manufacturing overlay edges include fold guard, and clipping subtracts only material actually present',()=>{
 const f={...defaultFold('2x2'),enabled:true,guardMm:8};
 const layout=foldLayout(100,100,f);
 const entries=[mfgEntry('inside',5,5,10,10),mfgEntry('cross',38,10,24,10)];
 const r=manufacturingDiagnostics({width:100,height:100,entries,layout,config:{edgeMm:6}});
 assert.equal(r.boardMaterial.panelCount,4);
 close(r.boardMaterial.grossTopMm2,4*42*42);
 close(r.boardMaterial.holesRemovedMm2,100+80);
 close(r.boardMaterial.topNetMm2,4*42*42-180);
 assert.equal(r.panelEdges.find(p=>p.id==='cross').distanceMm,-20);
 assert.equal(r.panelEdges.find(p=>p.id==='inside').distanceMm,5);
 close(polygonArea(clipToRect(mfgRect(-5,-5,10,10),{x:0,y:0,w:100,h:100})),25);
 assert.equal(polygonArea(clipToRect(mfgRect(200,200,5,5),{x:0,y:0,w:100,h:100})),0);
 assert.equal(rectMargin(mfgRect(-5,0,10,10),{x:0,y:0,w:100,h:100}),-5);
});
test('material estimates withhold overlapping-hole net weight but handle touching and out-of-board holes',()=>{
 const layout=foldLayout(100,100,defaultFold());
 const args={width:100,height:100,layout,config:{webMm:0}};
 const overlap=manufacturingDiagnostics({...args,entries:[mfgEntry('a',10,10,10,10),mfgEntry('b',15,10,10,10)]});
 assert.equal(overlap.overlapCount,1);assert.equal(overlap.boardMaterial.netG,null);
 assert.equal(overlap.boardMaterial.topNetMm2,null);close(overlap.boardMaterial.grossG,20);
 const touch=manufacturingDiagnostics({...args,entries:[mfgEntry('a',10,10,10,10),mfgEntry('b',20,10,10,10),mfgEntry('edge',-5,30,10,10)]});
 assert.equal(touch.overlapCount,0);assert.equal(touch.pairs.length,1);
 close(touch.boardMaterial.holesRemovedMm2,250);close(touch.boardMaterial.netG,19.8);
});
test('manufacturing reference gap counts match exact HEX50 openings for multiple sizes',()=>{
 const u=1536/1100,layout=foldLayout(1100,1100*2/3,defaultFold());
 const rows=readSlotRegistry(hex.districts,u);
 for(const [sizeMm,count,min] of [[50,46,1.2234042899447672],[48,23,2.955455097513737],[45,2,5.5535313088669325],[42,0,8.15160752022029]]){
  const entries=rows.map(e=>({id:e.id,polygon:slotGeometry({record:e.record,shape:'hex',sizeMm,clearanceMm:.5,unitsPerMm:u,angle:e.record.rotation}).hole.map(p=>({x:p.x/u,y:(p.y-11)/u}))}));
  const r=manufacturingDiagnostics({width:1100,height:1100*2/3,entries,layout});
  assert.equal(r.pairs.length,count);close(r.minimumWebMm,min,1e-6);
  if(sizeMm===50){assert.equal(r.badSlots.length,58);close(r.boardMaterial.netG,1505.9145901793581,1e-6)}
 }
});
test('punchboard estimator uses real clipped area, conservative cells, independent sheet gap and BOM',()=>{
 const t=tileMaterial({shape:'hex',sizeMm:50,cut:'corner',cutMm:8});
 close(t.areaMm2,3*Math.sqrt(3)*50**2/8-8**2*Math.sqrt(3)/4);
 assert.equal(t.perSheet,25);assert.equal(t.sheets,5);close(t.netG,280.9109281747508,1e-6);
 close(t.grossMm2,5*285*285);assert.ok(t.utilization<1);
 const tiny=tileMaterial({shape:'hex',sizeMm:70,cut:'corner',cutMm:8,config:{sheetW:100,sheetH:100,sheetEdgeMm:25}});
 assert.equal(tiny.perSheet,0);assert.equal(tiny.sheets,null);assert.equal(tiny.grossG,null);
 assert.equal(tileMaterial({shape:'hex',sizeMm:50,cut:'notch',cutMm:8}).exact,false);
 const f=readManufacturing({tileCount:120,webMm:4,sheetWebMm:7,highlight:true});
 assert.deepEqual(readManufacturing(JSON.parse(JSON.stringify(f))),f);
 for(const invalid of [{webMm:-1},{tileCount:1.5},{density:0},{highlight:'yes'},{sheetW:0}])assert.throws(()=>readManufacturing(invalid));
});
