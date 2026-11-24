// Physical board geometry only. No game state, DOM, or project rules.
export const SLOT_DISTRICTS=Object.freeze([{"id":"presidio","name":"Presidio","slots":0},{"id":"marina","name":"Marina","slots":2},{"id":"northbeach","name":"North Beach","slots":3},{"id":"chinatown","name":"Chinatown","slots":2},{"id":"pacific","name":"Pacific Heights","slots":5},{"id":"financial","name":"Financial District","slots":5},{"id":"soma","name":"SoMa","slots":5},{"id":"civic","name":"Civic Center","slots":5},{"id":"western","name":"Western Addition","slots":5},{"id":"innerrichmond","name":"Inner Richmond","slots":4},{"id":"outerrichmond","name":"Outer Richmond","slots":5},{"id":"haight","name":"Haight-Ashbury","slots":5},{"id":"innersunset","name":"Inner Sunset","slots":3},{"id":"sunset","name":"Outer Sunset","slots":6},{"id":"mission","name":"Mission","slots":5},{"id":"missionbay","name":"Mission Bay","slots":5},{"id":"potrero","name":"Potrero","slots":5},{"id":"noe","name":"Noe Valley","slots":5},{"id":"bernal","name":"Bernal Heights","slots":4},{"id":"park","name":"Golden Gate Park","slots":0},{"id":"twinpeaks","name":"Twin Peaks","slots":0}].map(Object.freeze));
export const SLOT_COUNT=SLOT_DISTRICTS.reduce((sum,d)=>sum+d.slots,0);
export const REFERENCE_TILE_MM=40;
export const SHAPE_SIDES=Object.freeze({square:4,hex:6,oct:8});
export const DEFAULT_CLEARANCE_MM=.5;
export const MIN_CLEARANCE_MM=0,MAX_CLEARANCE_MM=1;
export const SLOT_REGISTRY=Object.freeze(SLOT_DISTRICTS.flatMap(d=>Array.from({length:d.slots},(_,i)=>Object.freeze({id:d.id+'-'+(i+1),districtId:d.id,ordinal:i+1}))));
export function validClearance(value){return Number.isFinite(value)&&value>=MIN_CLEARANCE_MM&&value<=MAX_CLEARANCE_MM;}
export function legacyCenter(record,unitsPerMm){
 if(!Number.isFinite(unitsPerMm)||unitsPerMm<=0||!Number.isFinite(record.x)||!Number.isFinite(record.y))throw Error('Invalid reference coordinates');
 const a=REFERENCE_TILE_MM*unitsPerMm/2;
 return {x:record.x+a,y:record.y+a};
}
export function legacyAnchor(center,unitsPerMm){
 const a=REFERENCE_TILE_MM*unitsPerMm/2;return {x:center.x-a,y:center.y-a};
}
export function readSlotRegistry(districts,unitsPerMm){
 const known=new Set(SLOT_DISTRICTS.map(d=>d.id));
 if(!districts||typeof districts!=='object'||Array.isArray(districts)||Object.keys(districts).some(id=>!known.has(id)))throw Error('Неизвестный район в геометрии');
 const out=[];
 for(const d of SLOT_DISTRICTS){
  const a=districts[d.id]??(d.slots?null:[]);
  if(!Array.isArray(a)||a.length!==d.slots)throw Error('Количество мест в '+d.id+' не совпадает с согласованным набором');
  const seen=new Set();
  for(const item of a){
   if(!item||!Number.isInteger(item.slot)||item.slot<1||item.slot>d.slots||seen.has(item.slot)||!Number.isFinite(item.x)||!Number.isFinite(item.y)||Math.abs(item.x)>10000||Math.abs(item.y)>10000)throw Error('Некорректные координаты или дубли в '+d.id);
   seen.add(item.slot);
   out.push({id:d.id+'-'+item.slot,districtId:d.id,ordinal:item.slot,center:legacyCenter(item,unitsPerMm),record:item});
  }
 }
 return out;
}
export function regularVertices(n,diameter,angle=0,center={x:diameter/2,y:diameter/2}){
 return Array.from({length:n},(_,i)=>{
  const a=-Math.PI/2+2*Math.PI*i/n+angle*Math.PI/180;
  return {x:center.x+Math.cos(a)*diameter/2,y:center.y+Math.sin(a)*diameter/2};
 });
}
export function holeDiameterMm(shape,sizeMm,clearanceMm){
 if(!Object.hasOwn(SHAPE_SIDES,shape)||!Number.isFinite(sizeMm)||sizeMm<=0||!validClearance(clearanceMm))throw Error('Invalid hole geometry');
 // Hex (and oct) size is vertex-to-vertex. Expand each edge along its normal.
 return shape==='square'?sizeMm+2*clearanceMm:sizeMm+2*clearanceMm/Math.cos(Math.PI/SHAPE_SIDES[shape]);
}
export function shapeVertices(shape,size,center,angle=0){
 if(shape==='square'){const h=size/2;return [{x:center.x-h,y:center.y-h},{x:center.x+h,y:center.y-h},{x:center.x+h,y:center.y+h},{x:center.x-h,y:center.y+h}];}
 return regularVertices(SHAPE_SIDES[shape],size,angle,center);
}
export function slotGeometry({record,shape,sizeMm,clearanceMm=DEFAULT_CLEARANCE_MM,unitsPerMm,angle=0}){
 const center=legacyCenter(record,unitsPerMm),holeMm=holeDiameterMm(shape,sizeMm,clearanceMm);
 return {center,tileMm:sizeMm,holeMm,tile:shapeVertices(shape,sizeMm*unitsPerMm,center,angle),hole:shapeVertices(shape,holeMm*unitsPerMm,center,angle)};
}
export function polygonOverlap(a,b){
 for(const vertices of [a,b])for(let i=0;i<vertices.length;i++){
  const p=vertices[i],q=vertices[(i+1)%vertices.length],x=q.y-p.y,y=p.x-q.x;
  const ap=a.map(v=>v.x*x+v.y*y),bp=b.map(v=>v.x*x+v.y*y);
  if(Math.max(...ap)<=Math.min(...bp)+1e-9||Math.max(...bp)<=Math.min(...ap)+1e-9)return false;
 }
 return true;
}
export function pointEdgeDistanceSq(p,a,b){
 const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
 const t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;
 return (p.x-a.x-dx*t)**2+(p.y-a.y-dy*t)**2;
}
export function polygonDistance(a,b){
 if(polygonOverlap(a,b))return 0;
 let sq=Infinity;
 for(const [first,second] of [[a,b],[b,a]])for(const p of first)for(let i=0;i<second.length;i++)sq=Math.min(sq,pointEdgeDistanceSq(p,second[i],second[(i+1)%second.length]));
 return Math.sqrt(sq);
}
export function polygonBounds(p){return {minX:Math.min(...p.map(v=>v.x)),maxX:Math.max(...p.map(v=>v.x)),minY:Math.min(...p.map(v=>v.y)),maxY:Math.max(...p.map(v=>v.y))};}
export function bboxDistance(a,b){return Math.hypot(Math.max(0,a.minX-b.maxX,b.minX-a.maxX),Math.max(0,a.minY-b.maxY,b.minY-a.maxY));}
export function holeConflicts(entries){
 const pairs=[],bounds=entries.map(e=>polygonBounds(e.hole));let minimum=Infinity;
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const lower=bboxDistance(bounds[i],bounds[j]);if(lower>minimum&&lower>1e-8)continue;
  const distance=polygonDistance(entries[i].hole,entries[j].hole);minimum=Math.min(minimum,distance);
  if(distance<=1e-8)pairs.push({ids:[entries[i].id,entries[j].id],overlap:polygonOverlap(entries[i].hole,entries[j].hole)});
 }
 return {pairs,minimum:Number.isFinite(minimum)?minimum:null};
}
