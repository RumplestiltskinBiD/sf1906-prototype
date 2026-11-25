// Laboratory-only demo adapter. It never imports the game engine or calculates money.
import {createTileView} from './physical-tile-view.js';
export function emptyDemo(owner=0){return {status:'empty',owner,projectId:null,delivered:[]};}
export function readDemoRecord(item,project){
 const status=['empty','under','complete'].includes(item.status)?item.status:'empty';
 const owner=Number.isInteger(item.owner)?Math.max(0,Math.min(5,item.owner)):0;
 const delivered=Array.isArray(item.delivered)&&project&&status==='under'&&item.delivered.length<=project.materials.length&&item.delivered.every((m,i)=>m===project.materials[i])?[...item.delivered]:[];
 return {status,owner,projectId:project?.id||null,delivered};
}
export function writeDemoRecord(d){
 return {status:d.status,owner:d.owner,...(d.projectId?{projectId:d.projectId}:{}),...(d.delivered.length?{delivered:[...d.delivered]}:{})};
}
export function startDemo(d,project,owner){
 if(d.status!=='empty'||!project||!Number.isInteger(owner)||owner<0||owner>5)return null;
 return {status:'under',owner,projectId:project.id,delivered:[]};
}
export function finishDemo(d){return d.status==='under'?{...d,status:'complete',delivered:[]}:null;}
export function supplyDemo(d,project,all=false){
 if(d.status!=='under'||!project||d.projectId!==project.id||d.delivered.length>=project.materials.length)return null;
 const delivered=project.materials.slice(0,all?project.materials.length:d.delivered.length+1);
 return delivered.length===project.materials.length?finishDemo(d):{...d,delivered};
}
export function changeDemoOwner(d,owner){
 if(d.status==='empty'||!Number.isInteger(owner)||owner<0||owner>5)return null;
 return {...d,owner,delivered:[...d.delivered]};
}
export function demoTileView(slot,d,projectById){return createTileView({slot,building:d,project:projectById.get(d.projectId)});}
