import {DISTRICTS,districtNeighbors,districtRisk,createInitialState,fireServiceProtection,researchCardState} from './game-core.js';
import {RESEARCH_CARDS} from './research-cards.js';

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
    // Phase I includes each station's own-district P reduction already.
    // Restore the pre-protection value, then let Phase II apply the same
    // researched amount ONCE, after earthquake survival is determined.
    // Both market firehouse and standard std_fire have a physical station.
    const stations=(game?.constructions||[]).filter(c=>c.districtId===id
      &&c.status==='complete'&&fireServiceProtection(game,c.projectId)>0);
    const fireProtection=stations.reduce((n,c)=>n+fireServiceProtection(game,c.projectId),0);
    return [id,{z:riskValue(r.earthquake.raw),
      p:riskValue((r.fire.net??r.fire.raw)+fireProtection),
      firehouse:stations.length>0,
      fireProtection}];
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
    const quakeBurning=quake==='destroyed';
    const firehouseBuilt=!!input[id]?.firehouse;
    // Legacy/manual presets only have a checkbox. Treat it as P−1;
    // imported parties specify the actual researched P−2 amount.
    const firehouseProtection=firehouseBuilt
      ?Math.max(1,Number.isInteger(input[id]?.fireProtection)?input[id].fireProtection:1):0;
    const survivesQuake=firehouseBuilt&&!quakeBurning;
    const quakeFireBonus=quake==='damaged'?config.damageFire:0;
    // Apply once after quake; +P from each neighbour is NOT blocked.
    // Cap at P0 so there is no invisible negative buffer.
    const initialAfterQuakeP=Math.max(0,baseP+quakeFireBonus-(survivesQuake?firehouseProtection:0));
    const fireRiskBurning=!quakeBurning&&initialAfterQuakeP>=config.ignition;
    const burning=quakeBurning||fireRiskBurning;
    const firehouseDestroyed=firehouseBuilt&&burning;
    const firehouseActive=firehouseBuilt&&!firehouseDestroyed;
    const origin=quakeBurning?'earthquake':fireRiskBurning?'fire-risk':null;
    nodes[id]={id,z,baseP,quake,quakeFireBonus,initialAfterQuakeP,
      p:initialAfterQuakeP,firehouseBuilt,firehouseProtection,firehouseActive,firehouseDestroyed,
      burning,origin,spreadDone:false,received:[]};
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
    let stationDestroyed=false;
    if(!to.burning&&to.p>=sim.config.ignition){
      to.burning=true;to.origin='spread';newlyBurning=true;
      if(to.firehouseActive){
        to.firehouseActive=false;to.firehouseDestroyed=true;
        stationDestroyed=true;
      }
      // Past -1 is not undone in the historical P counter after ignition.
      // The district is already irreversibly burning.
      ignited.push(id);sim.queue.push(id);
    }
    hits.push({id,before,after:to.p,newlyBurning,stationDestroyed});
  }
  const event={source,hits,ignited,index:sim.events.length+1};
  sim.events.push(event);sim.done=!sim.queue.length;return event;
}
export function run(sim){
  let count=0;
  while(!sim.done){next(sim);if(++count>DISTRICT_IDS.length)throw Error('Fire cycle');}
  return sim;
}
/** Final scoring adapter for the Phase II laboratory. Only a completed
 * earthquake+fire simulation can award the orphanage survival VP. This
 * does not automatically connect the separate laboratory to Phase I.
 */
export function orphanageSurvivalResults(game,simulation){
  if(!simulation?.done)return {ok:false,reason:'simulation-incomplete',entries:[]};
  const entries=(game?.constructions||[]).filter(c=>c.projectId==='orphanage'&&c.status==='complete')
    .map(c=>{
      const district=simulation.nodes?.[c.districtId];
      const survived=!!district&&district.quake!=='destroyed'&&!district.burning;
      return {constructionId:c.id,playerId:c.playerId,districtId:c.districtId,
        survived,quake:district?.quake||null,burned:!!district?.burning,
        bonus:survived?4:0};
    });
  return {ok:true,entries};
}
export function awardOrphanageSurvivalVp(game,simulation){
  const result=orphanageSurvivalResults(game,simulation);
  if(!result.ok)return result;
  const awards=[];
  for(const item of result.entries){
    const c=(game.constructions||[]).find(x=>x.id===item.constructionId);
    if(c.orphanageSurvivalVpAwarded)continue;
    c.orphanageSurvivalVpAwarded=true;
    if(item.bonus){
      const player=game.players?.[item.playerId];
      if(player){
        player.prestige=(player.prestige||0)+item.bonus;
        if(Array.isArray(game.log))game.log.push({cls:'good',msg:`${player.name}: Сиротский приют пережил катастрофу 1906 — +4 VP.`});
        awards.push(item);
      }
    }
  }
  return {ok:true,awards,prestige:awards.reduce((n,x)=>n+x.bonus,0)};
}

/** Registered deeds guarantee exactly one final VP for the selected building.
 * When general survivor scoring is added, it must exclude already-awarded
 * registered buildings to avoid a double +1.
 */
export function registeredPropertyTitleResults(game,simulation){
  if(!simulation?.done)return {ok:false,reason:'simulation-incomplete',entries:[]};
  const entries=(game?.constructions||[]).filter(c=>c.status==='complete'&&c.propertyTitleRegistered)
    .map(c=>{
      const district=simulation.nodes?.[c.districtId];
      const survived=!!district&&district.quake!=='destroyed'&&!district.burning;
      return {constructionId:c.id,playerId:c.playerId,districtId:c.districtId,
        survived,burned:!!district?.burning,quake:district?.quake||null,bonus:1};
    });
  return {ok:true,entries};
}
export function awardRegisteredPropertyTitleVp(game,simulation){
  const result=registeredPropertyTitleResults(game,simulation);
  if(!result.ok)return result;
  const awards=[];
  for(const item of result.entries){
    const c=(game.constructions||[]).find(x=>x.id===item.constructionId);
    if(c.propertyTitleVpAwarded||!game.players?.[item.playerId])continue;
    c.propertyTitleVpAwarded=true;
    const player=game.players[item.playerId];
    player.prestige=(player.prestige||0)+1;
    if(Array.isArray(game.log))game.log.push({cls:'good',msg:`${player.name}: зарегистрированное право на здание — гарантированный 1 VP после катастрофы 1906.`});
    awards.push(item);
  }
  return {ok:true,awards,prestige:awards.length};
}

/**
 * Phase II laboratory scoring adapter: research-funded medical survivors.
 * This reads the actual settled earthquake state AND the final fire result.
 * Quake damage to a strictly ADJACENT district qualifies even if that district
 * subsequently burns. Fire alone NEVER qualifies, and the medical district
 * itself never satisfies its own adjacency requirement.
 *
 * The scorer is pure: passing a live Phase I save cannot change that save.
 * Research effects are selected by registry type, not by R08 hard-coded here.
 * The separate award function may be invoked on a COPY for laboratory tests
 * or on the final game state when the Phase II finish is integrated later.
 */
export function medicalResearchSurvivalResults(game,simulation){
  if(!simulation?.done)return {ok:false,reason:'simulation-incomplete',entries:[]};
  if(!simulation.nodes||DISTRICT_IDS.some(id=>!simulation.nodes[id]||
    !['intact','damaged','destroyed'].includes(simulation.nodes[id].quake)
    ||typeof simulation.nodes[id].burning!=='boolean'))
    return {ok:false,reason:'invalid-simulation',entries:[]};
  const card=RESEARCH_CARDS.find(c=>c.effect?.appliesToAllPlayers===true
    &&c.effect?.phase2?.type==='medical-survivor-neighbor-earthquake-award');
  const e=card?.effect?.phase2;
  if(!e||e.onlyOncePerBuilding!==true||e.requiresCompletedBuilding!==true
    ||e.requiresSurvivingBuilding!==true||e.adjacentDistrictOnly!==true
    ||e.fireOnlyDamageDoesNotQualify!==true
    ||!Number.isSafeInteger(e.pointsPerEligibleBuilding)||e.pointsPerEligibleBuilding<1
    ||!Array.isArray(e.eligibleMedicalProjects)||!Array.isArray(e.neighboringEarthquakeStatuses))
    return {ok:false,reason:'research-terms',entries:[]};
  if(researchCardState(game,card.id)?.status!=='funded')
    return {ok:false,reason:'research-not-funded',entries:[]};
  const allowed=new Set(e.eligibleMedicalProjects),damage=new Set(e.neighboringEarthquakeStatuses);
  const seen=new Set();
  const entries=(game?.constructions||[]).filter(c=>{
    if(c.id==null||seen.has(c.id)||c.status!=='complete'||!allowed.has(c.projectId))return false;
    seen.add(c.id);return true;
  }).map(c=>{
    const own=simulation.nodes[c.districtId];
    const survived=!!own&&own.quake!=='destroyed'&&!own.burning;
    const damagedNeighbors=districtNeighbors(c.districtId).filter(id=>
      id!==c.districtId&&DISTRICT_IDS.includes(id)&&damage.has(simulation.nodes[id]?.quake));
    const owner=game?.players?.[c.playerId];
    const alreadyAwarded=!!c.catastropheResearchVpAwarded?.[card.id];
    const qualified=!!owner&&survived&&damagedNeighbors.length>0;
    const bonus=qualified?e.pointsPerEligibleBuilding:0;
    return {constructionId:c.id,projectId:c.projectId,playerId:c.playerId,
      districtId:c.districtId,survived,quake:own?.quake||null,burned:!!own?.burning,
      damagedNeighbors,qualified,alreadyAwarded,bonus,
      payable:bonus&&!alreadyAwarded?bonus:0};
  });
  return {ok:true,researchId:card.id,entries,
    eligibleBuildings:entries.filter(x=>x.qualified).length,
    pendingVp:entries.reduce((sum,x)=>sum+x.payable,0)};
}

/** One-time research VP award on the caller's game object.
 * Laboratory callers MUST pass a dedicated in-memory copy of the imported
 * party. It does not write localStorage or finish the Phase I game.
 */
export function awardMedicalResearchSurvivalVp(game,simulation){
  const preview=medicalResearchSurvivalResults(game,simulation);
  if(!preview.ok)return preview;
  const awards=[];
  for(const item of preview.entries){
    if(!item.payable)continue;
    const c=(game.constructions||[]).find(x=>x.id===item.constructionId);
    const player=game.players?.[item.playerId];
    if(!c||!player||c.catastropheResearchVpAwarded?.[preview.researchId])continue;
    c.catastropheResearchVpAwarded??={};
    c.catastropheResearchVpAwarded[preview.researchId]=true;
    player.prestige=(player.prestige||0)+item.payable;
    if(Array.isArray(game.log))game.log.push({cls:'good',msg:
      `${player.name}: ${c.projectId==='std_clinic'?'Районная амбулатория':'Клиника'} пережила катастрофу 1906, рядом район пострадал от землетрясения — +${item.payable} VP по ${preview.researchId}.`});
    awards.push({...item,bonus:item.payable});
  }
  return {ok:true,researchId:preview.researchId,awards,
    prestige:awards.reduce((sum,x)=>sum+x.bonus,0)};
}

export function stats(sim){
  const list=Object.values(sim.nodes);
  return {intact:list.filter(n=>n.quake==='intact').length,
    damaged:list.filter(n=>n.quake==='damaged').length,
    destroyed:list.filter(n=>n.quake==='destroyed').length,
    burning:list.filter(n=>n.burning).length,
    newFires:list.filter(n=>n.origin==='spread').length,
    firehousesBuilt:list.filter(n=>n.firehouseBuilt).length,
    firehousesActive:list.filter(n=>n.firehouseActive).length,
    firehousesDestroyed:list.filter(n=>n.firehouseDestroyed).length,
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
    'Правила: У повреждение от '+c.damage+'; У разрушение от '+c.collapse+
      '; повреждённый район +'+c.damageFire+' П; возгорание от П'+c.ignition+
      '; передача очага +'+c.spread+' П соседям.',
    'Реальные У и П без верхнего лимита; III — только индикатор.',
    'Граф: обычные застраиваемые районы; парк, Presidio и Twin Peaks исключены. Каждый источник передаёт огонь один раз.',
    'Пожарная часть: только свой район, −1 П обычно или −2 П после R03 однократно после землетрясения (не ниже П0); повреждённая работает; разрушенная/сгоревшая уничтожена. Входящий огонь не блокируется.',
    '',
    '=== ИСХОДНЫЕ ЗНАЧЕНИЯ ВСЕХ РАЙОНОВ (до землетрясения) ==='
  ];
  for(const id of DISTRICT_IDS){
    const n=simulation?.nodes[id],r=input?.[id]||{};
    lines.push(name(id)+': У'+(n?.z??riskValue(r.z))+' П'+(n?.baseP??riskValue(r.p))+
      '; пожарная часть: '+((n?.firehouseBuilt??!!r.firehouse)?'есть':'нет'));
  }
  if(!simulation){
    lines.push('','=== РАСЧЁТ ЕЩЁ НЕ ЗАПУЩЕН ===');
    return lines.join('\n');
  }
  lines.push('','=== РЕЗУЛЬТАТ ЗЕМЛЕТРЯСЕНИЯ ===');
  for(const id of DISTRICT_IDS){
    const n=simulation.nodes[id];
    lines.push(name(id)+': '+quakeName[n.quake]+
      '; П'+n.baseP+
      (n.quakeFireBonus?' +'+n.quakeFireBonus+' (повреждение)':'')+
      (n.firehouseBuilt&&n.quake!=='destroyed'?' −'+n.firehouseProtection+' (пожарная часть)':'')+
      ' → П'+n.initialAfterQuakeP+
      '; пожарная часть: '+(!n.firehouseBuilt?'нет':n.quake==='destroyed'?'уничтожена землетрясением':n.firehouseDestroyed?'уничтожена пожаром':'работает')+
      (n.origin==='earthquake'?'; первоначальный очаг от разрушения':
        n.origin==='fire-risk'?'; первоначальный очаг по П':''));
  }
  lines.push('Первоначальные очаги (У3+ или П'+c.ignition+'+, порядок): '+(simulation.starts.map(name).join(' → ')||'нет'));
  lines.push('','=== ПОШАГОВОЕ РАСПРОСТРАНЕНИЕ ПОЖАРА ===');
  if(!simulation.events.length)lines.push('Обработанных очагов пока нет.');
  for(const step of simulation.events){
    lines.push('Шаг '+step.index+'. Источник: '+name(step.source));
    if(!step.hits.length)lines.push('  Нет соседей для передачи.');
    for(const h of step.hits){
      lines.push('  → '+name(h.id)+': П'+h.before+' +'+(h.after-h.before)+' = П'+h.after+
        (h.newlyBurning?' — НОВЫЙ ОЧАГ':'')+
        (h.stationDestroyed?' — ПОЖАРНАЯ ЧАСТЬ УНИЧТОЖЕНА':''));
    }
    lines.push('  Новые очаги: '+(step.ignited.map(name).join(', ')||'нет'));
  }
  const summary=stats(simulation);
  lines.push('','=== ИТОГ И ТЕКУЩИЕ СОСТОЯНИЯ ===');
  lines.push('Всего районов: '+summary.total+'; целых после У: '+summary.intact+
    '; повреждены: '+summary.damaged+'; разрушены землетрясением: '+summary.destroyed+
    '; всего загорелось: '+summary.burning+'; новых очагов: '+summary.newFires+
    '; пожарных частей построено: '+summary.firehousesBuilt+
    '; действуют: '+summary.firehousesActive+
    '; уничтожены: '+summary.firehousesDestroyed+
    '; обработано источников: '+summary.sourcesProcessed+'.');
  lines.push('Осталось в очереди: '+(simulation.queue.map(name).join(' → ')||'нет')+'.');
  for(const id of DISTRICT_IDS){
    const n=simulation.nodes[id];
    lines.push(name(id)+': '+quakeName[n.quake]+'; П нач='+n.baseP+
      ', П тек='+n.p+'; огонь='+
      (n.burning?(n.origin==='earthquake'?'от разрушения':n.origin==='fire-risk'?'по исходной П':'от соседей'):'нет')+
      '; передал='+ (n.spreadDone?'да':'нет')+
      '; пожарная часть='+(!n.firehouseBuilt?'нет':n.firehouseDestroyed?'уничтожена':'работает')+
      '; получено: '+(n.received.map(x=>name(x.source)+' +'+x.amount).join(', ')||'нет'));
  }
  return lines.join('\n');
}
