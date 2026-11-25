// Stage 2B: experimental manufacturing diagnostics, in frame-relative mm.
// Thresholds are hypotheses, not a manufacturer's tolerances.
import {polygonBounds,bboxDistance,polygonDistance,polygonOverlap,shapeVertices,clippedCorner} from './physical-map-geometry.js';
export const DEFAULT_MANUFACTURING=Object.freeze({highlight:false,webMm:6,edgeMm:6,nodeGapMm:2,density:800,tileThicknessMm:2,tileCount:110,sheetW:285,sheetH:285,sheetWebMm:6,sheetEdgeMm:6});
export const MANUFACTURING_FIELDS=Object.freeze({webMm:[0,20],edgeMm:[0,20],nodeGapMm:[0,20],density:[400,1200],tileThicknessMm:[1,3],tileCount:[1,500],sheetW:[100,600],sheetH:[100,600],sheetWebMm:[0,20],sheetEdgeMm:[0,25]});
const EPS=1e-7;
export function readManufacturing(data){
 const f={...DEFAULT_MANUFACTURING};if(data===undefined)return f;
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Некорректные производственные настройки');
 if(data.highlight!==undefined&&typeof data.highlight!=='boolean')throw Error('Некорректная подсветка');
 f.highlight=data.highlight??false;
 for(const [k,[lo,hi]] of Object.entries(MANUFACTURING_FIELDS)){
  const v=data[k]??f[k];
  if(!Number.isFinite(v)||v<lo||v>hi||(k==='tileCount'&&!Number.isInteger(v)))throw Error('Некорректный производственный параметр: '+k);
  f[k]=v;
 }
 return f;
}
export function polygonArea(p){
 if(p.length<3)return 0;
 // Translate to local origin to avoid cancellation at large coordinates.
 const o=p[0];let sum=0;
 for(let i=1;i<p.length-1;i++)sum+=(p[i].x-o.x)*(p[i+1].y-o.y)-(p[i].y-o.y)*(p[i+1].x-o.x);
 return Math.abs(sum)/2;
}
export function clipToRect(poly,rect){
 if(rect.w<=0||rect.h<=0)return [];
 let out=poly;
 for(const [axis,limit,sign] of [['x',rect.x,1],['x',rect.x+rect.w,-1],['y',rect.y,1],['y',rect.y+rect.h,-1]]){
  const old=out;out=[];
  for(let i=0;i<old.length;i++){
   const a=old[i],b=old[(i+1)%old.length],inside=p=>sign*(p[axis]-limit)>=0,ai=inside(a),bi=inside(b);
   if(ai)out.push(a);
   if(ai!==bi){const t=(limit-a[axis])/(b[axis]-a[axis]);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
  }
 }
 return out;
}
export function rectMargin(poly,rect){
 const b=polygonBounds(poly);
 return Math.min(b.minX-rect.x,b.minY-rect.y,rect.x+rect.w-b.maxX,rect.y+rect.h-b.maxY);
}
const below=(distance,limit)=>distance<limit-EPS||distance<=EPS;
export function manufacturingDiagnostics({width,height,entries,nodes=[],layout,zones={},config}){
 const f=readManufacturing(config),board={x:0,y:0,w:width,h:height};
 const usable={x:zones.left??0,y:zones.top??0,w:width-(zones.left??0)-(zones.right??0),h:height-(zones.top??0)-(zones.bottom??0)};
 const overlays=layout.config.enabled?layout.panels.map(p=>({id:p.id,...p.overlay})): [{id:'board',...board}];
 const panels=layout.config.enabled?layout.panels:[{id:'board',...board}];
 const pairs=[],edges=[],panelEdges=[],reserves=[],logistics=[],nodeEdges=[],nodeReserves=[],nodePairs=[],badSlots=new Set(),badNodes=new Set();
 const bounds=entries.map(e=>polygonBounds(e.polygon)),nb=nodes.map(n=>polygonBounds(n.polygon));let minWeb=Infinity,overlapCount=0;
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const lower=bboxDistance(bounds[i],bounds[j]);
  if(lower>Math.max(f.webMm,minWeb)+EPS)continue;
  const d=polygonDistance(entries[i].polygon,entries[j].polygon);minWeb=Math.min(minWeb,d);
  if(below(d,f.webMm)){
   const overlap=polygonOverlap(entries[i].polygon,entries[j].polygon);
   if(overlap)overlapCount++;
   pairs.push({ids:[entries[i].id,entries[j].id],distanceMm:d,overlap});badSlots.add(entries[i].id);badSlots.add(entries[j].id);
  }
 }
 let minEdge=Infinity,minPanelEdge=Infinity;
 for(const e of entries){
  const d=rectMargin(e.polygon,board);minEdge=Math.min(minEdge,d);
  if(below(d,f.edgeMm)){edges.push({id:e.id,distanceMm:d});badSlots.add(e.id)}
  if(rectMargin(e.polygon,usable)<-EPS){reserves.push(e.id);badSlots.add(e.id)}
  if(layout.config.enabled){
   // Best containing panel/overlay, or negative margin if the opening crosses a boundary.
   const candidates=overlays.map(p=>({panel:p.id,distanceMm:rectMargin(e.polygon,p)})).sort((a,b)=>b.distanceMm-a.distanceMm);
   const best=candidates[0];minPanelEdge=Math.min(minPanelEdge,best.distanceMm);
   if(below(best.distanceMm,f.edgeMm)){panelEdges.push({id:e.id,...best});badSlots.add(e.id)}
  }
 }
 for(let i=0;i<nodes.length;i++){
  const n=nodes[i],d=rectMargin(n.polygon,board);
  if(below(d,f.edgeMm)){nodeEdges.push({id:n.id,distanceMm:d});badNodes.add(n.id)}
  if(rectMargin(n.polygon,usable)<-EPS){nodeReserves.push(n.id);badNodes.add(n.id)}
  for(let j=0;j<entries.length;j++){
   if(bboxDistance(nb[i],bounds[j])>f.nodeGapMm+EPS)continue;
   const distanceMm=polygonDistance(n.polygon,entries[j].polygon);
   if(below(distanceMm,f.nodeGapMm)){logistics.push({ids:[entries[j].id,n.id],distanceMm});badSlots.add(entries[j].id);badNodes.add(n.id)}
  }
  for(let j=0;j<i;j++){
   if(bboxDistance(nb[i],nb[j])>f.nodeGapMm+EPS)continue;
   const distanceMm=polygonDistance(n.polygon,nodes[j].polygon);
   if(below(distanceMm,f.nodeGapMm)){nodePairs.push({ids:[nodes[j].id,n.id],distanceMm});badNodes.add(nodes[j].id);badNodes.add(n.id)}
  }
 }
 // Do not subtract overlapping holes twice. Withhold net mass on such layouts.
 const grossBaseMm2=width*height,grossTopMm2=overlays.reduce((a,p)=>a+p.w*p.h,0);
 const holesRemovedMm2=overlapCount?null:entries.reduce((a,e)=>a+overlays.reduce((b,p)=>b+polygonArea(clipToRect(e.polygon,p)),0),0);
 const topNetMm2=holesRemovedMm2===null?null:Math.max(0,grossTopMm2-holesRemovedMm2);
 const toGrams=(area,thickness)=>area*thickness*f.density/1e6;
 const baseG=toGrams(grossBaseMm2,layout.config.baseMm),grossTopG=toGrams(grossTopMm2,layout.config.topMm),netTopG=topNetMm2===null?null:toGrams(topNetMm2,layout.config.topMm);
 const boardMaterial={grossBaseMm2,grossTopMm2,holesRemovedMm2,topNetMm2,baseG,grossTopG,netTopG,grossG:baseG+grossTopG,netG:netTopG===null?null:baseG+netTopG,panelCount:panels.length};
 return {pairs,edges,panelEdges,reserves,logistics,nodeEdges,nodeReserves,nodePairs,badSlots:[...badSlots],badNodes:[...badNodes],minimumWebMm:Number.isFinite(minWeb)?minWeb:null,minimumEdgeMm:Number.isFinite(minEdge)?minEdge:null,minimumPanelEdgeMm:Number.isFinite(minPanelEdge)?minPanelEdge:null,overlapCount,boardMaterial};
}
export function tileMaterial({shape,sizeMm,cut,cutMm,config}){
 const f=readManufacturing(config);
 // The archived V-notch is intentionally estimated as an uncut upper bound.
 const exact=cut==='corner'&&shape!=='square';
 const polygon=exact?clippedCorner({shape,sizeMm,cutMm}).vertices:shapeVertices(shape,sizeMm,{x:0,y:0});
 const areaMm2=polygonArea(polygon),b=polygonBounds(polygon),w=b.maxX-b.minX,h=b.maxY-b.minY;
 const capacity=(width,height)=>Math.max(0,Math.floor((f.sheetW-2*f.sheetEdgeMm+f.sheetWebMm+EPS)/(width+f.sheetWebMm)))*Math.max(0,Math.floor((f.sheetH-2*f.sheetEdgeMm+f.sheetWebMm+EPS)/(height+f.sheetWebMm)));
 const normal=capacity(w,h),turned=capacity(h,w),perSheet=Math.max(normal,turned),sheets=perSheet?Math.ceil(f.tileCount/perSheet):null;
 const netMm2=areaMm2*f.tileCount,grossMm2=sheets===null?null:sheets*f.sheetW*f.sheetH;
 return {areaMm2,netMm2,netG:netMm2*f.tileThicknessMm*f.density/1e6,perSheet,sheets,grossMm2,grossG:grossMm2===null?null:grossMm2*f.tileThicknessMm*f.density/1e6,utilization:grossMm2?netMm2/grossMm2:null,rotation:turned>normal?90:0,exact:shape==='square'||exact};
}
