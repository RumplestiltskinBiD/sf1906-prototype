import test from 'node:test';
import assert from 'node:assert/strict';
import {createTileView} from '../physical-tile-view.js';
import {emptyDemo,readDemoRecord,writeDemoRecord,startDemo,finishDemo,supplyDemo,changeDemoOwner,demoTileView} from '../physical-map-demo.js';
import {renderPhysicalTile} from '../physical-tile-renderer.js';
import {slotGeometry} from '../physical-map-geometry.js';
import {PROJECTS,STANDARD_PROJECTS} from '../game-core.js';
const slot=Object.freeze({id:'civic-1',districtId:'civic',n:1,x:200,y:300,rotation:15});
const project={id:'fixture',name:'Тестовый объект',types:['Торговое'],type:'Тест',materials:['Lumber','Masonry','Masonry','Steel'],open:4,income:-1,prestige:0,risk:{earthquake:1,fire:-1},effect:'Условный эффект, не вычислять из текста',actionName:'Разовый эффект',actionText:'Не обязательно действие рабочего'};
const map=new Map([[project.id,project]]);
test('presentation is immutable, geometry independent and distinguishes catalog values from live facts',()=>{
 const d=startDemo(emptyDemo(),project,4),partial=supplyDemo(d,project);
 const v=demoTileView(slot,partial,map);
 assert.equal(v.side,'front');assert.equal(v.owner,4);assert.equal(v.catalog.baseIncome,-1);assert.equal(v.catalog.baseVP,0);assert.equal(v.catalog.fire,-1);
 assert.equal(v.catalog.effect,project.effect);assert.equal(v.live.income,null);assert.equal(v.live.capacity,null);assert.equal(v.live.stock,null);
 assert.deepEqual(v.required,project.materials);assert.deepEqual(v.delivered,['Lumber']);
 assert.equal(v.constructionId,null);assert.equal(Object.hasOwn(v,'x'),false);
 assert.deepEqual(demoTileView({...slot,x:900,y:20,rotation:88},partial,map),v);
 assert.ok(Object.isFrozen(v)&&Object.isFrozen(v.catalog)&&Object.isFrozen(v.required)&&Object.isFrozen(v.live));
 assert.notEqual(v.required,project.materials);assert.notEqual(v.delivered,partial.delivered);
 const live=createTileView({slot,building:{...partial,constructionId:'C42'},project,facts:{income:0,vp:2,capacity:5,stock:['Steel'],occupantId:1}});
 assert.equal(live.constructionId,'C42');assert.equal(live.live.income,0);assert.equal(live.live.capacity,5);assert.equal(live.live.occupantId,1);assert.deepEqual(live.live.stock,['Steel']);
 assert.equal(live.catalog.baseIncome,-1);
});
test('demo adapter handles partial delivery, owner switch, completion, clear and legacy import without mutating slot or project',()=>{
 const d=startDemo(emptyDemo(1),project,2),p=supplyDemo(d,project);
 assert.deepEqual(d.delivered,[]);assert.deepEqual(p.delivered,['Lumber']);
 const changed=changeDemoOwner(p,5);assert.equal(changed.owner,5);assert.deepEqual(changed.delivered,p.delivered);assert.equal(p.owner,2);
 const imported=readDemoRecord(writeDemoRecord(changed),project);assert.deepEqual(imported,changed);
 const done=supplyDemo(imported,project,true);assert.equal(done.status,'complete');assert.equal(done.owner,5);assert.deepEqual(done.delivered,[]);
 assert.equal(demoTileView(slot,done,map).side,'back');
 assert.equal(supplyDemo(done,project,true),null);assert.equal(finishDemo(done),null);assert.equal(startDemo(done,project,2),null);
 assert.equal(startDemo(emptyDemo(),project,6),null);assert.equal(changeDemoOwner(emptyDemo(),2),null);
 assert.deepEqual(readDemoRecord({...writeDemoRecord(p),delivered:['Steel']},project).delivered,[]);
 assert.deepEqual(writeDemoRecord(emptyDemo(5)),{status:'empty',owner:5});
 assert.equal(demoTileView(slot,emptyDemo(5),map).side,null);
 assert.equal(demoTileView(slot,{status:'under',owner:0,projectId:'unknown',delivered:[]},map).knownProject,false);
 assert.equal(slot.x,200);assert.equal(project.materials.length,4);
});
test('every real project has a presentation on both sides without assuming an effective income or worker action',()=>{
 const catalog=[...PROJECTS,...STANDARD_PROJECTS],byId=new Map(catalog.map(p=>[p.id,p]));
 assert.ok(catalog.length>40);assert.equal(byId.size,catalog.length);
 for(const p of catalog){
  const d=startDemo(emptyDemo(),p,3);
  for(const state of [d,finishDemo(d)]){
   const v=demoTileView(slot,state,byId);
   assert.equal(v.knownProject,true,p.id);assert.equal(v.projectId,p.id);
   assert.equal(v.name,p.name);assert.deepEqual(v.required,p.materials);assert.deepEqual(v.categories,p.types);
   assert.equal(v.catalog.baseIncome,p.income);assert.equal(v.catalog.baseVP,p.prestige);
   assert.equal(v.live.income,null);assert.equal(v.live.occupantId,null);
  }
 }
});
// Minimal SVG document for renderer contract checks; real SVG and CSS are covered by Playwright.
function fakeDocument(){
 const doc={createElementNS(ns,tag){return {ns,tag,attrs:{},children:[],ownerDocument:doc,textContent:'',setAttribute(k,v){this.attrs[k]=v},append(...nodes){this.children.push(...nodes)}}}};
 return doc;
}
function flatten(node){return [node,...node.children.flatMap(flatten)]}
test('shared renderer accepts independent geometry and view, all shapes, sides and namespaces',()=>{
 const doc=fakeDocument(),d=startDemo(emptyDemo(),project,4),partial=supplyDemo(d,project),done=finishDemo(partial);
 for(const shape of ['square','hex','oct'])for(const status of [emptyDemo(),partial,done])for(const cut of ['corner','notch']){
  const view=demoTileView(slot,status,map),geometry=slotGeometry({record:slot,shape,sizeMm:50,unitsPerMm:1.3,angle:15});
  const opts={view,geometry,shape,sizeMm:50,unitsPerMm:1.3,rotation:15,cut};
  const before=JSON.stringify(opts),a=renderPhysicalTile(doc,{...opts,namespace:'a'}),b=renderPhysicalTile(doc,{...opts,namespace:'b'}),nodes=flatten(a);
  assert.equal(JSON.stringify(opts),before);assert.equal(a.attrs['data-tile-renderer'],'shared');assert.equal(a.attrs['data-slot-id'],slot.id);
  assert.equal(nodes.filter(n=>n.attrs['data-hole']===slot.id).length,1);
  assert.equal(nodes.filter(n=>n.attrs['data-owner-seat']!==undefined).length,shape==='square'?0:shape==='hex'?6:8);
  assert.equal(nodes.filter(n=>n.attrs['data-material']==='Lumber').length,status.status==='under'?1:0);
  if(status.status!=='empty'&&shape!=='square'){
   assert.equal(nodes.find(n=>n.attrs['data-notch-owner']==='4').attrs['data-face'],view.side);
   if(cut==='corner'){
    assert.ok(nodes.some(n=>n.attrs.id==='a-civic-1'));assert.ok(flatten(b).some(n=>n.attrs.id==='b-civic-1'));
   }
  }
 }
 const view=createTileView({slot,building:{...done,constructionId:'C1'},project,facts:{income:0,vp:7}});
 const tile=renderPhysicalTile(doc,{view,geometry:slotGeometry({record:slot,shape:'hex',sizeMm:50,unitsPerMm:1}),shape:'hex',sizeMm:50,unitsPerMm:1});
 assert.equal(tile.attrs['data-construction-id'],'C1');
 assert.ok(flatten(tile).some(n=>n.textContent==='Income +0 · VP 7'));
});
