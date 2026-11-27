// Reviewed physical-tile layouts. Presentation only; numbers for price,
// materials, VP, Income, risks and requirements come from createTileView.
import {renderTileIcon,renderTileRequirement,formatTileGain,materialIconId,RESOURCE_COLORS,TILE_INK} from './physical-tile-icons.js';
import {clippedCorner,edgeMargin} from './physical-map-geometry.js';
export const REVIEWED_TILE_LAYOUTS=Object.freeze({
 commission_house:Object.freeze({title:['Комиссионный','торговый дом'],action:'commission',goods:0,art:'commission'}),
 pub:Object.freeze({title:['Городская','пивная'],goods:2,art:'pub'}),
 shops:Object.freeze({title:['Торговый ряд'],action:'procurement',goods:1,art:'shops'}),
 wholesale_market:Object.freeze({title:['Городской','оптовый рынок'],passive:'new-type',goods:3,art:'market'})
});
export const REVIEW_DIMENSIONS=Object.freeze({min:40,max:65,default:50,cut:8,cube:8,cubeCell:8.8,workerWidth:14,workerHeight:9});
const NS='http://www.w3.org/2000/svg';
const e=(doc,tag,a={},value)=>{const n=doc.createElementNS(NS,tag);for(const [k,v] of Object.entries(a))n.setAttribute(k,String(v));if(value!==undefined)n.textContent=String(value);return n;};
const signed=n=>n>0?'+'+n:String(n);
const rect=(x,y,w,h,kind,resource=null)=>({x:x-w/2,y:y-h/2,w,h,kind,resource});
// Fixed physical components, shared placement rows.
const workerRow=d=>d*.65+Math.min(2,Math.max(0,d-40)*.2);
const goodsRow=d=>d*.635;
export function reviewedTileSlots(view,d){
 const layout=REVIEWED_TILE_LAYOUTS[view.projectId];if(!layout)return [];
 const {cubeCell:c,workerWidth:w,workerHeight:h}=REVIEW_DIMENSIONS;
 const cells=[];
 if(view.side==='front'){
  const row=view.required;
  row.forEach((m,i)=>cells.push(rect(d/2+(i-(row.length-1)/2)*(c+1),d*.535,c,c,'material',m)));
 }else{
  if(layout.action)cells.push(rect(d/2-(layout.goods?5.3:0),workerRow(d),w,h,'worker'));
  const capacity=view.live.capacity??layout.goods;
  for(let i=0;i<capacity;i++)cells.push(rect(layout.action?d/2+8.3:d/2+(i-(capacity-1)/2)*(c+1),goodsRow(d),c,c,'goods','Beer'));
 }
 return cells;
}
export function reviewedSlotMargins(view,d,cutMm=REVIEW_DIMENSIONS.cut){
 const poly=clippedCorner({shape:'hex',sizeMm:d,cutMm,center:{x:d/2,y:d/2}}).vertices;
 return reviewedTileSlots(view,d).map(s=>Math.min(...[[s.x,s.y],[s.x+s.w,s.y],[s.x+s.w,s.y+s.h],[s.x,s.y+s.h]].map(([x,y])=>edgeMargin({x,y},poly))));
}
// Schematic original vector illustrations; no generated image assets.
// All are on a normalized 100×60 canvas. Replace individual artwork here later.
function drawBuilding(doc,g,art,d){
 const group=e(doc,'g',{transform:'translate('+d*.285+' '+d*.305+') scale('+d*.0043+' '+d*.0024+')','data-building-art':art});
 const path=(d,fill,stroke='#615345')=>group.append(e(doc,'path',{d,fill,stroke,'stroke-width':.9}));
 group.append(e(doc,'ellipse',{cx:50,cy:52,rx:46,ry:6,fill:'#514629',opacity:.19}));
 if(art==='commission'){
  path('M8 14L65 21V52L8 45Z','#D1BFA0');path('M65 21L91 8V40L65 52Z','#9E8167');path('M4 14L30 0L95 8L65 23Z','#786258');
  for(let r=0;r<2;r++)for(let c=0;c<4;c++)group.append(e(doc,'path',{transform:'translate('+(15+c*12)+' '+(22+r*12+c*1.4)+')',d:'M0 10V2Q4 -2 8 2V10Z',fill:'#405960',stroke:'#E0CFB0','stroke-width':1.1}));
 }else if(art==='pub'){
  path('M10 22L64 34V53L10 41Z','#CBB697');path('M64 34L92 20V39L64 53Z','#9F8268');path('M2 21L33 0L72 11L64 34Z','#74564F');path('M72 11L98 19L64 34Z','#987067');
  path('M23 13L34 6L41 9V19L23 15Z','#D6BD8D');path('M28 11L34 9L37 11V15L28 13Z','#4C6063');path('M16 27L29 30V42L16 39Z M39 32L52 35V47L39 44Z M68 34L79 28V45L68 50Z','#405960');path('M64 30L93 17L98 22L68 36Z','#6B3D33');
 }else if(art==='shops'){
  path('M4 17L79 26V51L4 42Z M79 26L98 15V40L79 51Z','#D4BCA0');path('M0 17L22 5L100 15L79 27Z','#78665B');
  for(let c=0;c<3;c++){const shop=e(doc,'g',{transform:'translate('+(7+c*24)+' '+(23+c*3)+')'});shop.append(e(doc,'path',{d:'M0 1L20 4V19L0 16Z',fill:'#526970'}),e(doc,'path',{d:'M-2 0L21 3L24 9L-4 5Z',fill:['#884B42','#58705A','#6F555F'][c]}),e(doc,'path',{d:'M2 6L2 16M12 7V18',stroke:'#D8C6A8','stroke-width':1.4}));group.append(shop);}
 }else{
  path('M5 23L71 31V51L5 43Z M71 31L97 15V36L71 51Z','#C5B39A');path('M5 23Q5 1 31 3L95 11Q73 13 71 31Z','#778786','#495C5D');
  for(let c=0;c<4;c++)group.append(e(doc,'path',{d:'M'+(9+c*16)+' '+(23+c*2)+'Q'+(10+c*16)+' '+(7+c*2)+' '+(29+c*16)+' '+(6+c*2),stroke:'#B5C5BD','stroke-width':1.8,fill:'none'}));
  for(let c=0;c<3;c++)group.append(e(doc,'path',{transform:'translate('+(10+c*20)+' '+(27+c*2.5)+')',d:'M0 14V5Q8 -3 16 5V16Z',fill:'#455B60',stroke:'#E1C9A0','stroke-width':1.5}));
 }
 g.append(group);
}
// All coordinates are millimetres in a square diameter-sized local frame.
// The parent renderer applies exactly one scale conversion, never scales
// a component to fit a smaller tile. Cells have independently fixed sizes.
export function drawReviewedTileArtwork(g,view,d,{surface,filled=false,unitsPerMm=1}={}){
 const layout=REVIEWED_TILE_LAYOUTS[view.projectId];if(!layout)return false;
 const doc=g.ownerDocument,ink=TILE_INK;
 const root=e(doc,'g',{transform:'scale('+unitsPerMm+')','data-reviewed-layout':view.projectId,'data-diameter-mm':d});
 let target=root;
 const block=(id,zone,extra={})=>{
  target=e(doc,'g',{'data-layout-block':id,'data-zone':zone,...extra});root.append(target);
 };
 const text=(x,y,value,size,anchor='middle',klass='')=>target.append(e(doc,'text',{x,y,'font-size':size,'font-family':'Arial, sans-serif','font-weight':'bold','text-anchor':anchor,fill:ink,style:'fill:'+ink+';stroke:none;text-anchor:'+anchor+';font-weight:bold',class:klass},value));
 const icon=(id,x,y,size,value)=>target.append(renderTileIcon(doc,id,{x,y,size,ink,surface,value}));
 const arrow=(x,y,w)=>target.append(e(doc,'path',{d:'M'+x+' '+y+'h'+w+'m-.75 -.75l.75 .75-.75 .75',stroke:ink,'stroke-width':.3,'stroke-linecap':'round','stroke-linejoin':'round',fill:'none'}));
 const slots=reviewedTileSlots(view,d),front=view.side==='front';
 const font=d*.056;
 layout.title.forEach((line,i)=>{block('title-'+i,'title');text(d/2,d*(layout.title.length===1?.235:.20+i*.063),line,font,'middle','tile-title');});
 if(front){
  const hasLandRequirement=view.catalog.landMin!==null&&view.catalog.landMin!==undefined;
  block('price','price');text(d*(hasLandRequirement?.57:.5),d*.375,'$'+view.catalog.open,d*.09);
  if(hasLandRequirement){block('land-requirement','requirement');target.append(renderTileRequirement(doc,'land',{x:d*.18,y:d*.30,size:d*.115,value:'≥'+view.catalog.landMin,label:'Стоимость земли не ниже '+view.catalog.landMin}));}
  const reward=[];
  if(view.catalog.baseVP)reward.push({type:'vp',value:view.catalog.baseVP});
  if(view.catalog.baseIncome)reward.push({type:'income',value:view.catalog.baseIncome});
  if(view.catalog.landChange)reward.push({type:'land',value:view.catalog.landChange});
  reward.forEach((r,i)=>{
   block('reward-'+r.type,'reward');const x=d/2+(i-(reward.length-1)/2)*d*.28;
   if(r.type==='vp')text(x,d*.765,formatTileGain(r.value,'VP'),d*.075);
   else if(r.type==='land')icon('land',x-d*.065,d*.69,d*.13,(r.value>0?'↑':'↓')+Math.abs(r.value));
   else{icon('income',x-d*.115,d*.69,d*.10);block('reward-income-value','reward');text(x+d*.065,d*.765,formatTileGain(r.value,'money'),d*.06);}
  });
 }else{
  block('illustration','art');drawBuilding(doc,target,layout.art,d);
  if(view.catalog.baseIncome){
   block('property-income-icon','property');icon('income',d*.125,d*.303,d*.095);
   block('property-income-value','property');text(d*.18,d*.447,formatTileGain(view.catalog.baseIncome,'money'),d*.048);
  }
  if(view.catalog.fire){block('fire-risk','risk');icon('fire',d*.75,d*.31,d*.13,signed(view.catalog.fire));}
  if(view.catalog.earthquake){block('earthquake-risk','risk');icon('earthquake',d*.75,d*.45,d*.10);text(d*.80,d*.575,signed(view.catalog.earthquake),d*.045);}
  if(layout.action){
   const worker=slots.find(x=>x.kind==='worker'),left=worker.x-1.2,right=worker.x+worker.w+1.2,top=d*.48,bottom=worker.y+worker.h+1;
   block('action-frame','action',{'data-frame-for':'main'});target.append(e(doc,'rect',{x:left,y:top,width:right-left,height:bottom-top,rx:1,stroke:ink,'stroke-width':.35,'stroke-linejoin':'round',fill:ink,'fill-opacity':.06,'data-action-frame':layout.action}));
   const cx=worker.x+worker.w/2,y=top+3.65;
   if(layout.action==='commission'){
    block('action-cost','action',{'data-action-group':'main'});icon('project',cx-6.5,y-2.8,3.5);block('action-arrow','action',{'data-action-group':'main'});arrow(cx-2.1,y-1,3.5);block('action-result','action',{'data-action-group':'main'});text(cx+4.7,y,'$4',2.8);
   }else{
    // Explicit upper limit; zero is the material price, not transport.
    block('action-cost','action',{'data-action-group':'main'});text(cx-6.1,y,'$1',2.15);block('action-arrow','action',{'data-action-group':'main'});arrow(cx-4.0,y-.9,1.9);
    block('action-limit','action',{'data-action-group':'main'});text(cx-.35,y,'≤2',2.05);
    block('action-material','action',{'data-action-group':'main'});icon('material',cx+1.35,y-2.7,2.8);
    block('action-result','action',{'data-action-group':'main'});text(cx+6.05,y,'$0',2.15);
   }
  }
  if(layout.passive==='new-type'){
   block('passive-condition','passive');text(d*.22,d*.515,'Новый тип',d*.043);
   block('passive-completion','passive');icon('completion',d*.34,d*.454,d*.083);
   block('passive-location','passive');text(d*.555,d*.515,'в районе',d*.043);
   block('passive-result','passive');text(d*.775,d*.515,'+3$',d*.061);
  }
 }
 const delivered=[...view.delivered];
 slots.forEach((s,i)=>{
  const worker=s.kind==='worker',goods=s.kind==='goods',color=worker?ink:RESOURCE_COLORS[s.resource];
  block('component-'+i,worker?'action':goods?'storage':'materials',worker?{'data-action-group':'main'}:{});
  const used=filled||(!worker&&!goods&&delivered.includes(s.resource));
  if(!worker&&!goods&&delivered.includes(s.resource))delivered.splice(delivered.indexOf(s.resource),1);
  target.append(e(doc,'rect',{x:s.x,y:s.y,width:s.w,height:s.h,rx:.45,stroke:color,'stroke-width':goods?.65:.35,'stroke-linejoin':'round','stroke-dasharray':worker?'1.5 .9':'none',fill:goods?color:'none','fill-opacity':goods?.12:1,'data-component-slot':s.kind,'data-slot-index':i,'data-width-mm':s.w,'data-height-mm':s.h,...(s.resource?{'data-resource':s.resource}:{})}));
  if(worker){
   if(used)target.append(e(doc,'rect',{x:s.x,y:s.y,width:s.w,height:s.h,rx:.5,fill:'#DF5B42','data-placed':'worker'}));
   else{target.append(e(doc,'circle',{cx:s.x+s.w/2,cy:s.y+3,r:1.1,fill:ink,opacity:.55}));target.append(e(doc,'path',{d:'M'+(s.x+s.w/2-1.3)+' '+(s.y+4.5)+'h2.6l1 2.5h-4.6Z',fill:ink,opacity:.55}));}
  }else if(used){
   target.append(e(doc,'rect',{x:s.x+.4,y:s.y+.4,width:8,height:8,rx:.3,fill:color,stroke:'#20282C','stroke-width':.25,'stroke-linejoin':'round','data-placed':'cube'}));
  }else if(!goods)icon(materialIconId(s.resource),s.x+1.4,s.y+1.4,6);
 });
 g.append(root);return true;
}
