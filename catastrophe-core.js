import {DISTRICTS,districtNeighbors,districtRisk,createInitialState} from './game-core.js';

// A separate Phase II laboratory: it does not change Phase I state or saves.
// Actual risks are nonnegative integers without upper clipping; III is display only.
export const RULES=Object.freeze({damage:2,collapse:3,ignition:3,spread:2,damageFire:1});
export const CENTERS=Object.freeze({
presidio:[479,177],marina:[735,130],northbeach:[910,140],chinatown:[944,217],
pacific:[747,231],financial:[1034,303],soma:[1042,480],civic:[835,399],western:[646,352],
innerrichmond:[436,335],outerrichmond:[243,346],haight:[647,505],innersunset:[479,632],
sunset:[274,700],mission:[795,644],missionbay:[1106,646],potrero:[1103,822],
noe:[641,784],bernal:[842,855],park:[358,490],twinpeaks:[480,800]
});
export const DISTRICT_IDS=Object.freeze(DISTRICTS.filter(d=>d.buildable!==false).map(d=>d.id));
export function riskValue(n){return Math.max(0,Math.floor(Number(n)||0));}
export function indicator(n){const raw=riskValue(n);return {raw,level:Math.min(raw,3)};}
const isPlayable=id=>DISTRICT_IDS.includes(id);
export const eastToWest=(a,b)=>(CENTERS[b]?.[0]||0)-(CENTERS[a]?.[0]||0)
  ||(CENTERS[a]?.[1]||0)-(CENTERS[b]?.[1]||0)||a.localeCompare(b);

export function fromGame(game=createInitialState({rng:()=>0.5})){
  return Object.fromEntries(DISTRICT_IDS.map(id=>{
    const r=districtRisk(game,id);
    return [id,{z:riskValue(r.earthquake.raw),p:riskValue(r.fire.raw)}];
  }));
}
export function preset(key='three'){
  const d=fromGame();
  const setZ=(ids,value=3)=>ids.forEach(id=>{d[id].z=value;});
  if(key==='base')return d;
  if(key==='one')setZ(['soma']);
  else if(key==='three')setZ(['soma','mission','chinatown']);
  else if(key==='five')setZ(['soma','mission','chinatown','innerrichmond','potrero']);
  else if(key==='low-fire'){setZ(['soma','mission','chinatown']);for(const id of DISTRICT_IDS)d[id].p=0;}
  else if(key==='high-risk'){setZ(['soma'],7);setZ(['mission'],5);setZ(['chinatown'],4);}
  else throw Error('Unknown preset '+key);
  return d;
}

export function begin(input,custom={}){
  const config={...RULES,...custom};
  if(!(Number.isInteger(config.damage)&&config.damage>=1&&Number.isInteger(config.collapse)&&config.collapse>config.damage&&Number.isInteger(config.ignition)&&config.ignition>=1&&Number.isInteger(config.spread)&&config.spread>=1&&Number.isInteger(config.damageFire)&&config.damageFire>=0))
    throw Error('Invalid catastrophe configuration');
  const nodes={};const starts=[];
  for(const id of DISTRICT_IDS){
    const z=riskValue(input[id]?.z),baseP=riskValue(input[id]?.p);
    const quake=z>=config.collapse?'destroyed':z>=config.damage?'damaged':'intact';
    const burning=quake==='destroyed';
    nodes[id]={id,z,baseP,quake,p:baseP+(quake==='damaged'?config.damageFire:0),
      burning,origin:burning?'earthquake':null,spreadDone:false,received:[]};
    if(burning)starts.push(id);
  }
  starts.sort(eastToWest);
  return {config,nodes,starts,queue:[...starts],events:[],done:!starts.length};
}

// Process the burning-source queue, not every building. New fires join at
// the end; existing burning targets STILL accumulate further +P contributions.
export function next(sim){
  if(!sim.queue.length){sim.done=true;return null;}
  const source=sim.queue.shift(),from=sim.nodes[source];
  if(!from||!from.burning||from.spreadDone)throw Error('Invalid repeated source');
  from.spreadDone=true;
  const hits=[],ignited=[];
  for(const id of districtNeighbors(source).filter(isPlayable).sort(eastToWest)){
    const to=sim.nodes[id],before=to.p;
    to.p+=sim.config.spread;
    to.received.push({source,amount:sim.config.spread});
    let newlyBurning=false;
    if(!to.burning&&to.p>=sim.config.ignition){
      to.burning=true;to.origin='spread';newlyBurning=true;
      ignited.push(id);sim.queue.push(id);
    }
    hits.push({id,before,after:to.p,newlyBurning});
  }
  const event={source,hits,ignited,index:sim.events.length+1};
  sim.events.push(event);sim.done=!sim.queue.length;return event;
}
export function run(sim){
  let count=0;
  while(!sim.done){next(sim);if(++count>DISTRICT_IDS.length)throw Error('Fire cycle');}
  return sim;
}
export function stats(sim){
  const list=Object.values(sim.nodes);
  return {intact:list.filter(n=>n.quake==='intact').length,
    damaged:list.filter(n=>n.quake==='damaged').length,
    destroyed:list.filter(n=>n.quake==='destroyed').length,
    burning:list.filter(n=>n.burning).length,
    newFires:list.filter(n=>n.origin==='spread').length,
    sourcesProcessed:sim.events.length,total:list.length};
}

// A reproducible, complete plain-text snapshot for sharing game-design tests.
// Data comes from the simulation history, never from transient DOM log entries.
export function formatReport({input,simulation=null,config=RULES,scenario='Не указан'}={}){
  const c=simulation?.config||{...RULES,...config};
  const names=Object.fromEntries(DISTRICTS.map(d=>[d.id,d.name]));
  const name=id=>names[id]||id;
  const quakeName={intact:'Цел',damaged:'Повреждён',destroyed:'Разрушен'};
  const lines=[
    'SAN FRANCISCO 1906 | ОТЧЁТ СИМУЛЯТОРА КАТАСТРОФЫ',
    'Сценарий: '+scenario,
    'Статус: '+(!simulation?'Не запущено':simulation.done?'Расчёт завершён':'Частичный расчёт'),
    'Правила: З повреждение от '+c.damage+'; З разрушение от '+c.collapse+
      '; повреждённый район +'+c.damageFire+' П; возгорание от П'+c.ignition+
      '; передача очага +'+c.spread+' П соседям.',
    'Реальные З и П без верхнего лимита; III — только индикатор.',
    'Граф: обычные застраиваемые районы; парк, Presidio и Twin Peaks исключены. Каждый источник передаёт огонь один раз.',
    '',
    '=== ИСХОДНЫЕ ЗНАЧЕНИЯ ВСЕХ РАЙОНОВ (до землетрясения) ==='
  ];
  for(const id of DISTRICT_IDS){
    const n=simulation?.nodes[id],r=input?.[id]||{};
    lines.push(name(id)+': З'+(n?.z??riskValue(r.z))+' П'+(n?.baseP??riskValue(r.p)));
  }
  if(!simulation){
    lines.push('','=== РАСЧЁТ ЕЩЁ НЕ ЗАПУЩЕН ===');
    return lines.join('\n');
  }
  lines.push('','=== РЕЗУЛЬТАТ ЗЕМЛЕТРЯСЕНИЯ ===');
  for(const id of DISTRICT_IDS){
    const n=simulation.nodes[id];
    lines.push(name(id)+': '+quakeName[n.quake]+
      '; П'+n.baseP+' → П'+(n.baseP+(n.quake==='damaged'?c.damageFire:0))+
      (n.origin==='earthquake'?'; первоначальный очаг':''));
  }
  lines.push('Первоначальные очаги (порядок): '+(simulation.starts.map(name).join(' → ')||'нет'));
  lines.push('','=== ПОШАГОВОЕ РАСПРОСТРАНЕНИЕ ПОЖАРА ===');
  if(!simulation.events.length)lines.push('Обработанных очагов пока нет.');
  for(const step of simulation.events){
    lines.push('Шаг '+step.index+'. Источник: '+name(step.source));
    if(!step.hits.length)lines.push('  Нет соседей для передачи.');
    for(const h of step.hits){
      lines.push('  → '+name(h.id)+': П'+h.before+' +'+(h.after-h.before)+' = П'+h.after+
        (h.newlyBurning?' — НОВЫЙ ОЧАГ':''));
    }
    lines.push('  Новые очаги: '+(step.ignited.map(name).join(', ')||'нет'));
  }
  const summary=stats(simulation);
  lines.push('','=== ИТОГ И ТЕКУЩИЕ СОСТОЯНИЯ ===');
  lines.push('Всего районов: '+summary.total+'; целых после З: '+summary.intact+
    '; повреждены: '+summary.damaged+'; разрушены землетрясением: '+summary.destroyed+
    '; всего загорелось: '+summary.burning+'; новых очагов: '+summary.newFires+
    '; обработано источников: '+summary.sourcesProcessed+'.');
  lines.push('Осталось в очереди: '+(simulation.queue.map(name).join(' → ')||'нет')+'.');
  for(const id of DISTRICT_IDS){
    const n=simulation.nodes[id];
    lines.push(name(id)+': '+quakeName[n.quake]+'; П нач='+n.baseP+
      ', П тек='+n.p+'; огонь='+
      (n.burning?(n.origin==='earthquake'?'от землетрясения':'от соседей'):'нет')+
      '; передал='+ (n.spreadDone?'да':'нет')+
      '; получено: '+(n.received.map(x=>name(x.source)+' +'+x.amount).join(', ')||'нет'));
  }
  return lines.join('\n');
}
