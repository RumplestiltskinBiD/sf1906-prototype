import test from 'node:test';
import assert from 'node:assert/strict';
import {PROJECTS,GOODS_BUYER_CAPACITIES,LAND_VALUE_COMPLETION_CHANGE} from '../game-core.js';
import {createTileView} from '../physical-tile-view.js';
import {REVIEWED_TILE_LAYOUTS,reviewedTileSlots,reviewedSlotMargins,drawReviewedTileArtwork} from '../physical-tile-layouts.js';
const view=(p,side)=>createTileView({slot:{id:p.id,districtId:'test',n:1},building:{projectId:p.id,status:side==='front'?'under':'complete',owner:0,delivered:[]},project:p,facts:{capacity:GOODS_BUYER_CAPACITIES[p.id]??0,landChange:LAND_VALUE_COMPLETION_CHANGE[p.id]??0}});
function docStub(){const doc={createElementNS(ns,tag){return {tag,attrs:{},children:[],ownerDocument:doc,textContent:'',setAttribute(k,v){this.attrs[k]=String(v)},append(...nodes){this.children.push(...nodes)}}}};return doc;}
const flat=n=>[n,...n.children.flatMap(flat)];
test('reviewed slots preserve real component dimensions and fit all supported diameters',()=>{
 for(const p of PROJECTS.filter(p=>REVIEWED_TILE_LAYOUTS[p.id]))for(const d of Array.from({length:26},(_,i)=>i+40))for(const side of ['front','back']){
  const v=view(p,side),slots=reviewedTileSlots(v,d);
  assert.ok(reviewedSlotMargins(v,d).every(m=>m>=.2),p.id+' '+side+' '+d+' '+reviewedSlotMargins(v,d));
  if(side==='front')assert.deepEqual(slots.map(s=>s.resource),p.materials);
  else assert.equal(slots.filter(s=>s.kind==='goods').length,GOODS_BUYER_CAPACITIES[p.id]??0);
  for(const s of slots){assert.equal(s.w,s.kind==='worker'?14:8.8);assert.equal(s.h,s.kind==='worker'?9:8.8);}
  for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){const a=slots[i],b=slots[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,p.id+' overlap');}
 }
});
test('reviewed faces retain live catalog values, action separation, and do not duplicate sale rewards',()=>{
 const doc=docStub();
 for(const p of PROJECTS.filter(p=>REVIEWED_TILE_LAYOUTS[p.id])){
  for(const side of ['front','back']){
   const v=view(p,side),g=doc.createElementNS('svg','g'),before=JSON.stringify(v);
   assert.equal(drawReviewedTileArtwork(g,v,50,{surface:'#A58B43',filled:true}),true);
   const n=flat(g);assert.equal(JSON.stringify(v),before);
   if(side==='front'){assert.ok(n.some(x=>x.textContent==='$'+p.open));assert.ok(n.some(x=>x.textContent==='+ VP'));}
   else{assert.ok(n.some(x=>x.attrs['data-icon']==='fire'));assert.ok(n.some(x=>x.textContent==='+$'+p.income));assert.ok(!n.some(x=>/за товар/.test(x.textContent)));assert.equal(n.filter(x=>x.attrs['data-action-frame']).length,['shops','commission_house'].includes(p.id)?1:0);if(p.id==='wholesale_market'){assert.ok(n.some(x=>x.textContent==='Новый тип'));assert.ok(n.some(x=>x.attrs['data-icon']==='completion'));assert.ok(n.some(x=>x.textContent==='+3$'));}}
   assert.equal(n.filter(x=>x.attrs['data-placed']).length,reviewedTileSlots(v,50).length);
  }
 }
});

test('first four retain requirement, procurement limit and distinct receive semantics',()=>{
 const doc=docStub();
 for(const p of PROJECTS.filter(p=>REVIEWED_TILE_LAYOUTS[p.id]))for(const side of ['front','back']){
  const v=view(p,side),g=doc.createElementNS('svg','g');drawReviewedTileArtwork(g,v,50,{surface:'#A58B43'});const n=flat(g);
  assert.equal(n.filter(x=>x.attrs['data-requirement']==='TR3').length,p.id==='shops'&&side==='front'?1:0);
  assert.equal(n.filter(x=>x.attrs['data-icon']==='contraband-receive').length,0);
  if(side==='back'&&p.id==='shops'){
   assert.ok(n.some(x=>x.textContent==='≤2'));assert.ok(n.some(x=>x.textContent==='$1'));assert.ok(n.some(x=>x.textContent==='$0'));
   assert.equal(n.filter(x=>x.attrs['data-icon']==='material').length,1);
  }
  if(side==='back'&&p.id==='wholesale_market')assert.ok(reviewedTileSlots(v,50).every(s=>s.y+s.h/2<32.5));
 }
});