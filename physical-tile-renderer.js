// Shared SVG renderer. Callers supply the physical geometry and immutable tile view.
// No dependency on the laboratory, catalog lookup, game rules, saves or global DOM.
import {SHAPE_SIDES,regularVertices,OWNERS,clippedCorner,ownershipGeometry} from './physical-map-geometry.js';
const SVG_NS='http://www.w3.org/2000/svg';
const COLORS=OWNERS.map(o=>o.color),SEAT_COLORS=[...COLORS,'#d1d9df','#bcc6cd'];
const round=x=>Math.round(x*1000)/1000;
export function svgElement(doc,tag,attrs={},text){
 const el=doc.createElementNS(SVG_NS,tag);
 for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));
 if(text!==undefined)el.textContent=String(text);
 return el;
}
export function vertexString(vertices){return vertices.map(v=>round(v.x)+','+round(v.y)).join(' ')}
export function cornerPath({shape,sizeMm,cutMm,unitsPerMm}){
 const s=sizeMm*unitsPerMm,model=clippedCorner({shape,sizeMm,cutMm});
 return 'M '+model.vertices.map(p=>round(s/2+p.x*unitsPerMm)+' '+round(s/2+p.y*unitsPerMm)).join(' L ')+' Z';
}
export function notchPath(n,s){
 const v=regularVertices(n,s),a=v[0],b=v[1],edge=Math.hypot(b.x-a.x,b.y-a.y);
 const half=Math.min(s*.067,edge*.22);
 const start={x:(a.x+b.x)/2-(b.x-a.x)*half/edge,y:(a.y+b.y)/2-(b.y-a.y)*half/edge};
 const end={x:(a.x+b.x)/2+(b.x-a.x)*half/edge,y:(a.y+b.y)/2+(b.y-a.y)*half/edge};
 const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},len=Math.hypot(s/2-mid.x,s/2-mid.y);
 const depth=s*.085,apex={x:mid.x+(s/2-mid.x)/len*depth,y:mid.y+(s/2-mid.y)/len*depth};
 const fmt=p=>round(p.x)+' '+round(p.y);
 return 'M '+fmt(a)+' L '+fmt(start)+' L '+fmt(apex)+' L '+fmt(end)+' '+v.slice(1).map(p=>'L '+fmt(p)).join(' ')+' Z';
}
function seatCenter(a,b,s){
 const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},len=Math.hypot(s/2-mid.x,s/2-mid.y);
 return {x:mid.x+(s/2-mid.x)/len*s*.048,y:mid.y+(s/2-mid.y)/len*s*.048};
}

export function drawCornerMarks(g,model,scale,cx,cy){
 const element=(...args)=>svgElement(g.ownerDocument,...args);
 for(const m of model.marks){
  const x=cx+m.x*scale,y=cy+m.y*scale,r=m.radius*scale;
  g.append(element('circle',{cx:x,cy:y,r,fill:SEAT_COLORS[m.index],class:'owner-seat corner-seat','data-owner-seat':m.index,stroke:'none'}));
  if(m.owner&&r>0)g.append(element('text',{x,y:y+r*.43,'font-size':r*1.28,class:'owner-symbol','text-anchor':'middle',fill:'#14232d'},m.owner.symbol));
 }
}
function compactLines(name){
 const words=String(name||'').split(/\s+/).filter(Boolean),out=['',''];
 for(const w of words){
  const idx=out[0].length<11?0:1;
  if(out[idx].length+w.length+(out[idx]?1:0)<=16)out[idx]+=(out[idx]?' ':'')+w;
  else if(idx===0)out[1]=w.slice(0,15);
  else out[1]=out[1].slice(0,14)+'…';
 }
 return out;
}

export function drawTileArtwork(g,v,s,shape){
 const element=(...args)=>svgElement(g.ownerDocument,...args),poly=shape!=='square';
 if(v.status==='empty'){g.append(element('text',{x:s/2,y:s*.54,'font-size':s*.27},v.ordinal));return}
 g.append(element('rect',{x:s*(poly?.22:.045),y:s*(poly?.225:.04),width:s*(poly?.56:.91),height:s*(poly?.09:.15),rx:2,fill:v.status==='complete'?'#c9b99b':'#a78c61'}));
 const [line1,line2]=compactLines(v.name),font=s*(line2.length>=14?.105:.123);
 g.append(element('text',{x:s*.5,y:s*(poly?.43:.34),'font-size':font,class:'tile-title'},line1));
 if(line2)g.append(element('text',{x:s*.5,y:s*(poly?.54:.49),'font-size':font,class:'tile-title'},line2));
 if(v.knownProject&&v.status==='under'){
  g.append(element('text',{x:s*.5,y:s*.67,'font-size':s*.124,class:'tile-stat'},v.delivered.length+' / '+v.required.length+' · стройка'));
  v.delivered.slice(0,5).forEach((m,i)=>{
   const x=s*((poly?.16:.08)+i*(poly?.14:.175)),code=({Lumber:'Д',Masonry:'К',Steel:'С'})[m]??'?';
   g.append(element('rect',{x,y:s*.75,width:s*(poly?.12:.148),height:s*.13,rx:1,fill:'#e4aa5f',class:'tile-chip','data-material':m}));
   g.append(element('text',{x:x+s*(poly?.06:.073),y:s*.847,'font-size':s*.105,class:'tile-stat'},code));
  });
 }else if(v.knownProject){
  const income=v.live.income??v.catalog.baseIncome,vp=v.live.vp??v.catalog.baseVP;
  const fmt=x=>x===null?'—':(x>=0?'+':'')+x;
  g.append(element('text',{x:s*.5,y:s*(poly?.68:.67),'font-size':s*.12,class:'tile-stat'},'Income '+fmt(income)+' · VP '+(vp??'—')));
  // Historical demo caption; actionName alone does NOT prove worker action availability.
  g.append(element('text',{x:s*.5,y:s*(poly?.8:.85),'font-size':s*.125,class:'tile-stat'},v.catalog.actionName&&v.catalog.actionName!=='—'?'● действие':'✓ готово'));
 }else g.append(element('text',{x:s*.5,y:s*.75,'font-size':s*.13,class:'tile-stat'},v.status==='complete'?'✓ готово':'стройка'));
 if(!poly)g.append(element('rect',{x:s*.795,y:s*.015,width:s*.19,height:s*.19,rx:2,class:'owner-mark',fill:COLORS[v.owner]}));
}
// geometry is the same slotGeometry result used by manufacturing diagnostics.
// Namespace is explicit so multiple render surfaces can coexist without clip ID collisions.
export function renderPhysicalTile(doc,{view,geometry,shape,sizeMm,unitsPerMm,rotation=0,cut='corner',cutMm=8,clearanceMm=.5,namespace='physical-face',className='',holeClass='',warning=false}){
 if(!/^[a-zA-Z0-9_-]+$/.test(namespace)||!/^[a-zA-Z0-9_-]+$/.test(view.slotId))throw Error('Invalid SVG tile namespace or slot ID');
 const element=(...args)=>svgElement(doc,...args),s=sizeMm*unitsPerMm,n=SHAPE_SIDES[shape],poly=shape!=='square';
 const origin={x:geometry.center.x-s/2,y:geometry.center.y-s/2};
 const g=element('g',{transform:'translate('+round(origin.x)+' '+round(origin.y)+')','data-slot-id':view.slotId,'data-shape':shape,'data-rotation':rotation,
  'data-tile-renderer':'shared','data-tile-status':view.status,...(view.constructionId!==null?{'data-construction-id':view.constructionId}:{}),
  class:'slot physical-tile'+(className?' '+className:'')});
 const hole=geometry.hole.map(p=>({x:p.x-origin.x,y:p.y-origin.y}));
 g.append(element('polygon',{points:vertexString(hole),class:'slot-hole'+(holeClass?' '+holeClass:''),'data-hole':view.slotId}));
 const faceClass='tile'+(view.status==='under'?' tile-under':view.status==='complete'?' tile-done':'');
 if(!poly){
  g.append(element('rect',{x:0,y:0,width:s,height:s,rx:1.6,class:faceClass}));
  drawTileArtwork(g,view,s,shape);
 }else{
  const guide=element('g',{transform:'rotate('+rotation+' '+s/2+' '+s/2+')'}),vertex=regularVertices(n,s);
  guide.append(element('polygon',{points:vertexString(vertex),class:view.status==='empty'?'tile':'slot-guide'}));
  if(cut==='corner')drawCornerMarks(guide,ownershipGeometry({shape,sizeMm,cutMm,clearanceMm}),unitsPerMm,s/2,s/2);
  else vertex.forEach((a,i)=>{
   const p=seatCenter(a,vertex[(i+1)%n],s);
   guide.append(element('circle',{cx:round(p.x),cy:round(p.y),r:round(s*.035),fill:SEAT_COLORS[i],class:'owner-seat','data-owner-seat':i}));
  });
  g.append(guide);
  if(view.status==='empty')drawTileArtwork(g,view,s,shape);
  else{
   const face=element('g',{transform:'rotate('+(rotation+view.owner*360/n)+' '+s/2+' '+s/2+')',
    'data-notch-owner':view.owner,'data-face':view.side,...(cut==='corner'?{class:'corner-face'}:{})});
   const path=cut==='corner'?cornerPath({shape,sizeMm,cutMm,unitsPerMm}):notchPath(n,s);
   face.append(element('path',{d:path,class:faceClass}));
   if(cut==='corner'){
    const clipId=namespace+'-'+view.slotId,clip=element('clipPath',{id:clipId});
    clip.append(element('path',{d:path}));face.append(clip);
    const artwork=element('g',{'clip-path':'url(#'+clipId+')'});drawTileArtwork(artwork,view,s,shape);face.append(artwork);
   }else drawTileArtwork(face,view,s,shape);
   g.append(face);
  }
 }
 g.append(element('title',{},view.name+' · '+view.districtId+' №'+view.ordinal+' · '+view.status+' · '+rotation+'°'+(warning?' · пересечение/граница':'')));
 return g;
}
