import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SLOT_COUNT,SLOT_REGISTRY,legacyCenter,legacyAnchor,readSlotRegistry,holeDiameterMm,slotGeometry,shapeVertices,polygonDistance,holeConflicts} from '../physical-map-geometry.js';
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
