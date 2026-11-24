// Experimental folding layout. All dimensions in millimetres, relative to the board frame.
// The grid is a connected tree of rigid panels, not a certified hinge template.
import {polygonDistance,polygonBounds,bboxDistance} from './physical-map-geometry.js';
export const FOLD_PRESETS=Object.freeze(['2x2','3x2','4x2','4x3']);
const fractions=n=>Array.from({length:n-1},(_,i)=>(i+1)/n);
export function defaultFold(preset='3x2'){
 if(!FOLD_PRESETS.includes(preset))throw Error('Unknown fold preset');
 const [cols,rows]=preset.split('x').map(Number);
 return {enabled:false,preset,x:fractions(cols),y:fractions(rows),spine:Math.floor((cols-1)/2),guardMm:8,baseMm:1.5,topMm:1,boxW:290,boxH:290,boxDepth:65};
}
export function readFold(data){
 if(data===undefined)return defaultFold();
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Некорректная схема сгибов');
 const f=defaultFold(data.preset??'3x2');
 if(data.enabled!==undefined&&typeof data.enabled!=='boolean')throw Error('Некорректная видимость сгибов');
 f.enabled=data.enabled??false;
 for(const k of ['x','y']){
  const values=data[k]??f[k];
  if(!Array.isArray(values)||values.length!==f[k].length||values.some(v=>!Number.isFinite(v)))throw Error('Некорректные линии сгибов '+k);
  const all=[0,...values,1];
  if(all.some((v,i)=>i&&v-all[i-1]<.05-1e-9))throw Error('Панели должны занимать не менее 5% оси');
  f[k]=[...values];
 }
 const num=(k,lo,hi)=>{const v=data[k]??f[k];if(!Number.isFinite(v)||v<lo||v>hi)throw Error('Некорректный параметр сгиба: '+k);return v};
 f.spine=num('spine',0,f.x.length);if(!Number.isInteger(f.spine))throw Error('Некорректная колонка шарниров');
 f.guardMm=num('guardMm',0,12);f.baseMm=num('baseMm',1,2.5);f.topMm=num('topMm',.5,2);
 f.boxW=num('boxW',150,600);f.boxH=num('boxH',150,600);f.boxDepth=num('boxDepth',10,200);
 return f;
}
export function changeFoldPreset(f,preset){
 const d=defaultFold(preset);return readFold({...f,preset,x:d.x,y:d.y,spine:d.spine});
}
export function foldLayout(width,height,config){
 if(!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0)throw Error('Invalid board size');
 const f=readFold(config),xs=[0,...f.x.map(v=>v*width),width],ys=[0,...f.y.map(v=>v*height),height],cols=xs.length-1,rows=ys.length-1;
 const panels=[],seams=[];
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  const x=xs[c],y=ys[r],w=xs[c+1]-x,h=ys[r+1]-y;
  const left=c?f.guardMm:0,right=c<cols-1?f.guardMm:0,top=r?f.guardMm:0,bottom=r<rows-1?f.guardMm:0;
  panels.push({id:'p'+(r+1)+'-'+(c+1),r,c,x,y,w,h,overlay:{x:x+left,y:y+top,w:Math.max(0,w-left-right),h:Math.max(0,h-top-bottom)}});
  if(c<cols-1)seams.push({id:'v'+(c+1)+'-'+(r+1),kind:'hinge',axis:'x',at:xs[c+1],from:y,to:y+h});
  if(r<rows-1)seams.push({id:'h'+(r+1)+'-'+(c+1),kind:c===f.spine?'hinge':'cut',axis:'y',at:ys[r+1],from:x,to:x+w});
 }
 const stackW=Math.max(...panels.map(p=>p.w)),stackH=Math.max(...panels.map(p=>p.h)),stackDepth=panels.length*(f.baseMm+f.topMm);
 const regular=panels.every(p=>Math.abs(p.w-stackW)<1e-6&&Math.abs(p.h-stackH)<1e-6);
 const fitsPlan=(stackW<=f.boxW&&stackH<=f.boxH)||(stackW<=f.boxH&&stackH<=f.boxW);
 return {panels,seams,cols,rows,regular,stack:{w:stackW,h:stackH,depth:stackDepth},fitsNominal:fitsPlan&&stackDepth<=f.boxDepth,config:f};
}
export function seamPolygon(seam,guard){
 const {axis,at,from,to}=seam;
 return axis==='x'?[{x:at-guard,y:from},{x:at+guard,y:from},{x:at+guard,y:to},{x:at-guard,y:to}]:[{x:from,y:at-guard},{x:to,y:at-guard},{x:to,y:at+guard},{x:from,y:at+guard}];
}
// Actual polygons, including tangency. Zero guard still checks the seam itself.
export function foldConflicts(layout,entries){
 if(!layout.config.enabled)return [];
 const strips=layout.seams.map(s=>{const poly=seamPolygon(s,Math.max(layout.config.guardMm,1e-8));return {...s,poly,bounds:polygonBounds(poly)}});
 return entries.flatMap(e=>{
  const bounds=polygonBounds(e.polygon),seamIds=strips.filter(s=>bboxDistance(bounds,s.bounds)<=1e-7&&polygonDistance(e.polygon,s.poly)<=1e-7).map(s=>s.id);
  return seamIds.length?[{id:e.id,kind:e.kind,seamIds}]:[];
 });
}
