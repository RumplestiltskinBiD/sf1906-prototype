// Shared presentation contract. No game engine, DOM, geometry or mutation of inputs.
// Catalog numbers are printed/base values; live calculated values must be supplied
// explicitly by a future game adapter, not inferred from text or project IDs.
const number=value=>Number.isFinite(value)?value:null;
const string=value=>typeof value==='string'?value:'';
const strings=value=>Object.freeze(Array.isArray(value)?value.filter(x=>typeof x==='string'):[]);
const freeze=value=>Object.freeze(value);
export function createTileView({slot,building,project=null,facts={}}){
 if(!slot||typeof slot.id!=='string'||!Number.isInteger(slot.n)||slot.n<1)throw Error('Invalid slot identity');
 const status=building?.status??'empty';
 if(!['empty','under','complete'].includes(status))throw Error('Unsupported tile status');
 const occupied=status!=='empty',owner=building?.owner??0;
 if(!Number.isInteger(owner)||owner<0||owner>5)throw Error('Invalid tile owner');
 const p=occupied&&project&&project.id===building?.projectId?project:null;
 const required=strings(p?.materials),delivered=status==='under'?strings(building?.delivered):freeze([]);
 return freeze({
  slotId:slot.id,districtId:slot.districtId,ordinal:slot.n,status,side:occupied?(status==='complete'?'back':'front'):null,
  owner,constructionId:occupied?building?.constructionId??null:null,projectId:occupied?building?.projectId??null:null,knownProject:!!p,
  name:occupied?(p?.name||'Тестовое здание'):'Свободный участок',categories:strings(p?.types),category:string(p?.type),standard:!!p?.standard,
  required,delivered,
  catalog:freeze({open:number(p?.open),baseIncome:number(p?.income),baseVP:number(p?.prestige),
   earthquake:number(p?.risk?.earthquake),fire:number(p?.risk?.fire),requires:string(p?.requires),effect:string(p?.effect),
   benefit:string(p?.benefit),actionName:string(p?.actionName),actionText:string(p?.actionText),limits:string(p?.limits)}),
  // null means not supplied, not zero or an invented rule. Stage 4–8 can extend
  // semantic descriptors here; core stays authoritative for all live values.
  live:freeze({income:number(facts.income),vp:number(facts.vp),occupantId:facts.occupantId??null,
   capacity:number(facts.capacity),stock:facts.stock===undefined?null:strings(facts.stock)})
 });
}
