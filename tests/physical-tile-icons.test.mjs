import test from 'node:test';
import assert from 'node:assert/strict';
import {TILE_ICONS,TILE_ICON_GROUPS,tileIcon,materialIconId,categoryIconId,renderTileIcon} from '../physical-tile-icons.js';
import {PROJECTS,STANDARD_PROJECTS,RESOURCE_PRICES,PINK_GOODS,CONTRABAND_CARGO,BUILDING_TYPES} from '../game-core.js';
import {createTileView} from '../physical-tile-view.js';
import {renderPhysicalTile} from '../physical-tile-renderer.js';
import {slotGeometry} from '../physical-map-geometry.js';
function docStub(){
 const doc={createElementNS(ns,tag){return {ns,tag,attrs:{},children:[],ownerDocument:doc,textContent:'',setAttribute(k,v){this.attrs[k]=v},append(...nodes){this.children.push(...nodes)}}}};
 return doc;
}
const flat=n=>[n,...n.children.flatMap(flat)];
test('semantic icon registry: unique IDs, unique graphic definitions, complete groups and stable unknown fallback',()=>{
 const ids=TILE_ICONS.map(i=>i.id);
 assert.equal(ids.length,new Set(ids).size);
 assert.equal(TILE_ICONS.length,new Set(TILE_ICONS.map(i=>i.paths.join('|'))).size);
 assert.equal(TILE_ICON_GROUPS.length,new Set(TILE_ICON_GROUPS.map(g=>g.id)).size);
 for(const id of ['money','bid','income','vp','influence','land','earthquake','fire','worker','capacity','quick','year','once','completion','condition'])assert.equal(tileIcon(id).id,id);
 for(const i of TILE_ICONS){
  assert.ok(TILE_ICON_GROUPS.some(g=>g.id===i.group));assert.ok(i.label&&i.description&&i.paths.length);
  assert.ok(Object.isFrozen(i)&&Object.isFrozen(i.paths));
  assert.ok(i.paths.every(d=>typeof d==='string'&&d.startsWith('M')));
 }
 for(const id of ['nonexistent','constructor','__proto__',undefined])assert.equal(tileIcon(id).id,'unknown');
});
test('all current catalog materials, trade goods and building categories resolve without text inference',()=>{
 const projects=[...PROJECTS,...STANDARD_PROJECTS];
 for(const m of [...Object.keys(RESOURCE_PRICES),...PINK_GOODS,CONTRABAND_CARGO,...projects.flatMap(p=>p.materials)])assert.notEqual(materialIconId(m),'unknown',m);
 for(const t of [...BUILDING_TYPES,...projects.flatMap(p=>p.types)])assert.notEqual(categoryIconId(t),'unknown',t);
 assert.equal(new Set(Object.keys(RESOURCE_PRICES).map(materialIconId)).size,3);
 assert.equal(materialIconId('unknown future material'),'unknown');assert.equal(materialIconId('__proto__'),'unknown');
 assert.equal(categoryIconId('unknown future category'),'unknown');assert.equal(categoryIconId('constructor'),'unknown');
});
test('SVG icon has accessible label, monochrome geometry, physical size and explicit decorative mode',()=>{
 const doc=docStub();
 for(const def of TILE_ICONS){
  const a=renderTileIcon(doc,def.id,{size:3.5,x:2,y:1,ink:'#fff'});
  assert.equal(a.attrs.width,'3.5');assert.equal(a.attrs.height,'3.5');assert.equal(a.attrs.viewBox,'0 0 24 24');
  assert.equal(a.attrs['aria-label'],def.label);assert.equal(a.attrs.role,'img');assert.equal(a.attrs['data-icon'],def.id);
  assert.equal(a.children[0].textContent,def.label);assert.equal(a.children[1].attrs.stroke,'#fff');
  assert.equal(a.children[1].children.length,def.paths.length);
 }
 const d=renderTileIcon(doc,'income',{decorative:true});assert.equal(d.attrs['aria-hidden'],'true');assert.equal(d.attrs.role,undefined);
 assert.equal(renderTileIcon(doc,'no-such-id').attrs['data-icon'],'unknown');
 for(const size of [0,-1,Infinity,NaN])assert.throws(()=>renderTileIcon(doc,'vp',{size}));
});
test('shared renderer draws exact delivered material symbols and category symbols without adding gameplay semantics',()=>{
 const doc=docStub(),slot={id:'civic-1',districtId:'civic',n:1,x:0,y:0};
 const project={id:'fixture',name:'Тест',types:['Жилое','Бизнес'],materials:['Masonry','Masonry','Steel'],income:-1,prestige:2,actionName:'Условный эффект'};
 const view=createTileView({slot,building:{status:'under',projectId:project.id,owner:2,delivered:['Masonry','Masonry']},project});
 const before=JSON.stringify(view);
 for(const shape of ['square','hex','oct']){
  const g=renderPhysicalTile(doc,{view,geometry:slotGeometry({record:slot,shape,sizeMm:50,unitsPerMm:1}),shape,sizeMm:50,unitsPerMm:1});
  assert.deepEqual(flat(g).filter(n=>n.attrs['data-icon']).map(n=>n.attrs['data-icon']),['housing','business','masonry','masonry']);
  assert.equal(flat(g).filter(n=>n.attrs['data-material']==='Masonry').length,2);
  assert.equal(JSON.stringify(view),before);
 }
 assert.equal(view.live.occupantId,null);assert.equal(view.live.income,null);
});
