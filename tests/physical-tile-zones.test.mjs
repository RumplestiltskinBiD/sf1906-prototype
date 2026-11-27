import test from 'node:test';
import assert from 'node:assert/strict';
import {tileSafePolygon,boxMargin,auditTileBlocks,TILE_ZONES} from '../physical-tile-zones.js';
import {edgeMargin} from '../physical-map-geometry.js';
const box=(x,y,w,h)=>({x,y,w,h});
const item=(id,zone,b,extra={})=>({id,zone,box:b,...extra});
const audit=(blocks,side='back',margin=1.5)=>auditTileBlocks(blocks,{diameter:50,side,margin});
test('exact inward offset of all seven cut edges for every supported diameter',()=>{
 for(let d=40;d<=65;d++)for(const margin of [0,.5,1.5,3]){
  const poly=tileSafePolygon(d,0),safe=tileSafePolygon(d,margin);
  assert.equal(safe.length,7);for(const p of safe)assert.ok(Math.abs(edgeMargin(p,poly)-margin)<1e-7);
 }
 assert.throws(()=>tileSafePolygon(50,-1));
});
test('audit distinguishes clipped content, insufficient safe margin and unknown measurement',()=>{
 const r=audit([item('outside','art',box(2,24,2,2)),item('near','risk',box(4,20,1,1)),item('unmeasured','property',null),item('wrong','price',box(22,20,2,2))]);
 assert.ok(r.issues.some(i=>i.type==='outside'&&i.ids[0]==='outside'));
 assert.ok(r.issues.some(i=>i.type==='safe-margin'&&i.ids[0]==='near'));
 assert.ok(r.issues.some(i=>i.type==='unmeasured'));
 assert.ok(r.issues.some(i=>i.type==='zone'));
 assert.equal(audit([item('x','risk',box(22,22,2,2))]).ok,true);
 assert.ok(boxMargin(box(22,22,2,2),tileSafePolygon(50,0))>10);
});
test('only deliberate containment of same action frame is allowed; real overlaps remain failures',()=>{
 const frame=item('frame','action',box(14,17,22,18),{frameFor:'main'});
 const formula=item('formula','action',box(18,20,8,3),{actionGroup:'main'});
 const worker=item('worker','action',box(18,25,14,9),{actionGroup:'main'});
 assert.equal(audit([frame,formula,worker]).ok,true);
 assert.ok(audit([frame,formula,{...worker,box:box(18,22,14,9)}]).issues.some(i=>i.type==='overlap'&&i.ids.includes('worker')));
 assert.ok(audit([frame,{...worker,box:box(30,25,14,9)}]).issues.some(i=>i.type==='frame-containment'));
 assert.ok(audit([frame,item('goods','storage',box(32,25,8,8))]).issues.some(i=>i.type==='overlap'));
 assert.ok(Object.hasOwn(TILE_ZONES,'quick'));
});
