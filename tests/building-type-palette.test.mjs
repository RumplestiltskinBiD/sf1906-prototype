import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDING_TYPES,PROJECTS,STANDARD_PROJECTS} from '../game-core.js';
import {BUILDING_TYPE_COLORS,categoryColors,categoryStripe,categoryStops,categoryTextStyle,UNKNOWN_CATEGORY_COLOR} from '../building-type-palette.js';
import {createTileView} from '../physical-tile-view.js';
import {slotGeometry} from '../physical-map-geometry.js';
import {renderPhysicalTile} from '../physical-tile-renderer.js';
const expected={'Жилое':'#466B50','Бизнес':'#624D73','Промышленное':'#353B40','Общественное':'#3C607C','Торговое':'#A58B43'};
function docStub(){
 const doc={createElementNS(ns,tag){return {tag,attrs:{},children:[],ownerDocument:doc,textContent:'',setAttribute(k,v){this.attrs[k]=v},append(...nodes){this.children.push(...nodes)}}}};
 return doc;
}
const flat=n=>[n,...n.children.flatMap(flat)];
test('approved palette is immutable, exhaustive and preserves both categories of every real mixed project',()=>{
 assert.deepEqual(BUILDING_TYPE_COLORS,expected);
 assert.deepEqual(Object.keys(BUILDING_TYPE_COLORS),BUILDING_TYPES);
 assert.ok(Object.isFrozen(BUILDING_TYPE_COLORS));
 for(const p of [...PROJECTS,...STANDARD_PROJECTS])assert.deepEqual(categoryColors(p.types),p.types.map(t=>expected[t]),p.id);
 assert.deepEqual(categoryColors(['unknown','__proto__','constructor']),[]);
 assert.equal(categoryStripe([]),UNKNOWN_CATEGORY_COLOR);
 assert.equal(categoryStripe(['Бизнес']),expected['Бизнес']);
 assert.equal(categoryStripe(['Бизнес','Торговое']),'linear-gradient(90deg,#624D73 0%,#624D73 50%,#A58B43 50%,#A58B43 100%)');
 assert.deepEqual(categoryStops(['#111111','#222222']),[{color:'#111111',offset:0},{color:'#111111',offset:50},{color:'#222222',offset:50},{color:'#222222',offset:100}]);
 assert.equal(categoryTextStyle(['#353B40']),'fill:#FFF4DB;');
 assert.equal(categoryTextStyle(['#A58B43']),'fill:#182127;');
});
test('one palette override feeds stripe and both physical sides; every catalog type is visible without touching game data',()=>{
 const doc=docStub(),slot={id:'test-1',districtId:'civic',n:1,x:0,y:0};
 const palette={...BUILDING_TYPE_COLORS,'Бизнес':'#112233'};
 for(const p of [...PROJECTS,...STANDARD_PROJECTS])for(const shape of ['square','hex','oct'])for(const status of ['under','complete']){
  const view=createTileView({slot,project:p,building:{status,owner:2,projectId:p.id,delivered:[]}});
  const geometry=slotGeometry({record:slot,shape,sizeMm:50,unitsPerMm:1});
  const before=JSON.stringify(view),nodes=flat(renderPhysicalTile(doc,{view,geometry,shape,sizeMm:50,unitsPerMm:1,namespace:'palette-test',palette}));
  const colors=categoryColors(p.types,palette),face=nodes.find(n=>n.attrs['data-category-colors']);
  assert.ok(face,p.id);assert.equal(face.attrs['data-category-colors'],colors.join(','));
  assert.equal(face.attrs['data-category-fill'],colors.length===1?'single':'split');
  assert.equal(face.attrs.style,colors.length===1?'fill:'+colors[0]:'fill:url(#palette-test-test-1-category-fill)');
  if(colors.length>1)assert.deepEqual(nodes.filter(n=>n.tag==='stop').map(n=>n.attrs['stop-color']),colors.flatMap(c=>[c,c]));
  for(const c of colors)assert.ok(categoryStripe(p.types,palette).includes(c));
  assert.equal(JSON.stringify(view),before);
 }
 const empty=createTileView({slot,building:{status:'empty',owner:0}});
 const nodes=flat(renderPhysicalTile(doc,{view:empty,geometry:slotGeometry({record:slot,shape:'hex',sizeMm:50,unitsPerMm:1}),shape:'hex',sizeMm:50,unitsPerMm:1}));
 assert.ok(!nodes.some(n=>n.attrs['data-category-colors']));
});
