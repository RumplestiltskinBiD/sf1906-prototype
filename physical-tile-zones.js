// Semantic regions, independent of any project ID or game state.
// Coordinates remain the layout's responsibility; audit is in physical mm.
import {clippedCorner,edgeMargin} from './physical-map-geometry.js';
export const TILE_SAFE_MARGIN_MM=1.5; // prototype, not a factory tolerance
export const TILE_ZONES=Object.freeze({
 title:{label:'Название',sides:['front','back']},
 requirement:{label:'Требование',sides:['front']},
 price:{label:'Цена',sides:['front']},
 materials:{label:'Материалы',sides:['front']},
 reward:{label:'Награда за завершение',sides:['front']},
 property:{label:'Постоянное свойство',sides:['back']},
 art:{label:'Иллюстрация',sides:['back']},
 risk:{label:'Риск',sides:['back']},
 passive:{label:'Пассивный эффект',sides:['back']},
 storage:{label:'Физические ячейки',sides:['back']},
 action:{label:'Основное действие',sides:['back']},
 quick:{label:'Быстрое действие',sides:['back']}
});
export function tileSafePolygon(d,margin=TILE_SAFE_MARGIN_MM,cutMm=8){
 if(!Number.isFinite(margin)||margin<0)throw Error('Invalid safety margin');
 const poly=clippedCorner({sizeMm:d,cutMm,center:{x:d/2,y:d/2}}).vertices;
 const lines=poly.map((a,i)=>{
  const b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
  const nx=-dy/len,ny=dx/len;
  return {nx,ny,c:nx*a.x+ny*a.y+margin};
 });
 const vertices=lines.map((b,i)=>{
  const a=lines[(i+lines.length-1)%lines.length],det=a.nx*b.ny-a.ny*b.nx;
  return {x:(a.c*b.ny-a.ny*b.c)/det,y:(a.nx*b.c-a.c*b.nx)/det};
 });
 if(vertices.some(p=>edgeMargin(p,poly)<margin-1e-7))throw Error('Safety margin consumes tile');
 return vertices;
}
export function boxCorners(b){return [{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}];}
export function boxMargin(box,poly){return Math.min(...boxCorners(box).map(p=>edgeMargin(p,poly)));}
const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1e-5&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1e-5;
const inside=(a,b)=>a.x>=b.x-1e-5&&a.y>=b.y-1e-5&&a.x+a.w<=b.x+b.w+1e-5&&a.y+a.h<=b.y+b.h+1e-5;
export function auditTileBlocks(blocks,{diameter,side,cutMm=8,margin=TILE_SAFE_MARGIN_MM}){
 const poly=tileSafePolygon(diameter,0,cutMm),issues=[];
 for(const a of blocks){
  if(!TILE_ZONES[a.zone]?.sides.includes(side))issues.push({type:'zone',ids:[a.id]});
  if(!a.box||![a.box.x,a.box.y,a.box.w,a.box.h].every(Number.isFinite)){issues.push({type:'unmeasured',ids:[a.id]});continue;}
  const clearance=boxMargin(a.box,poly);
  if(clearance<margin-1e-5)issues.push({type:clearance< -1e-5?'outside':'safe-margin',ids:[a.id],clearance});
 }
 for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){
  const a=blocks[i],b=blocks[j];if(!a.box||!b.box)continue;
  // Frame may intentionally contain its own action elements. No exception
  // for formula/worker collisions or unrelated elements overlapping a frame.
  if(a.frameFor&&a.frameFor===b.actionGroup||b.frameFor&&b.frameFor===a.actionGroup){
   const frame=a.frameFor?a:b,child=a.frameFor?b:a;
   if(!inside(child.box,frame.box))issues.push({type:'frame-containment',ids:[frame.id,child.id]});
   continue;
  }
  if(overlap(a.box,b.box))issues.push({type:'overlap',ids:[a.id,b.id]});
 }
 return {ok:issues.length===0,issues,blocks,margin};
}
const LEAF='path,rect,circle,ellipse,polygon,polyline,line,text';
// Measure painted leaf bounds BEFORE ancestor clipping, in the reviewed root's
// local millimetres. Rectangular bounds are deliberately conservative for art.
// Stroke padding includes square/round caps and miter joins.
export function measureTileBlocks(root){
 const inv=root.getScreenCTM()?.inverse();
 const measured=Array.from(root.querySelectorAll('[data-layout-block]'),group=>{
  const id=group.dataset.layoutBlock,zone=group.dataset.zone;
  let bounds=null,failed=!inv;
  for(const leaf of group.querySelectorAll(LEAF)){
   if(leaf.closest('[data-layout-block]')!==group)continue;
   try{
    const style=leaf.ownerDocument.defaultView.getComputedStyle(leaf);
    if(style.display==='none'||style.visibility==='hidden')continue;
    const matrix=inv.multiply(leaf.getScreenCTM()),b=leaf.getBBox();
    let pad=0;
    if(style.stroke!=='none'&&parseFloat(style.strokeWidth)>0){
     const factor=style.strokeLinejoin==='miter'?Math.max(1,parseFloat(style.strokeMiterlimit)||4):1;
     pad=parseFloat(style.strokeWidth)*factor/2;
    }
    const corners=boxCorners({x:b.x-pad,y:b.y-pad,w:b.width+2*pad,h:b.height+2*pad}).map(p=>matrix.transformPoint(p));
    const minX=Math.min(...corners.map(p=>p.x)),maxX=Math.max(...corners.map(p=>p.x)),minY=Math.min(...corners.map(p=>p.y)),maxY=Math.max(...corners.map(p=>p.y));
    bounds=bounds?{minX:Math.min(bounds.minX,minX),minY:Math.min(bounds.minY,minY),maxX:Math.max(bounds.maxX,maxX),maxY:Math.max(bounds.maxY,maxY)}:{minX,minY,maxX,maxY};
   }catch{failed=true;}
  }
  return {id,zone,frameFor:group.dataset.frameFor,actionGroup:group.dataset.actionGroup,box:!failed&&bounds?{x:bounds.minX,y:bounds.minY,w:bounds.maxX-bounds.minX,h:bounds.maxY-bounds.minY}:null};
 });
 // New content cannot silently bypass the audit by omitting a semantic block.
 const orphan=Array.from(root.querySelectorAll(LEAF)).filter(n=>!n.closest('[data-layout-block]'));
 orphan.forEach((n,i)=>measured.push({id:'untagged-'+i,zone:'unknown',box:null}));
 return measured;
}
