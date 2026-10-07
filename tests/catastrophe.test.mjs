import test from 'node:test';
import assert from 'node:assert/strict';
import {districtNeighbors,createInitialState,districtRisk} from '../game-core.js';
import {DISTRICT_IDS,indicator,riskValue,fromGame,preset,begin,next,run,stats,formatReport} from '../catastrophe-core.js';
test('unbounded risk: III is only a label, 7 minus one is 6',()=>{
  assert.deepEqual(indicator(7),{raw:7,level:3});
  assert.equal(riskValue(7-1),6);
  assert.equal(riskValue(-3),0);
});
test('uses live base game risks and geographic adjacency',()=>{
  const data=fromGame();
  assert.equal(DISTRICT_IDS.length,18);
  assert.equal(data.missionbay.z,2);
  assert.equal(data.soma.z,1);
  assert.equal(data.chinatown.p,1);
  for(const id of ['missionbay','civic']){
    assert.ok(districtNeighbors('soma').includes(id),'soma->'+id);
    assert.ok(districtNeighbors('mission').includes(id),'mission->'+id);
  }
});
test('one state per entire district, damage+1 fire, collapse at Z3',()=>{
  const data=preset('base');
  data.soma={z:7,p:9};data.mission={z:2,p:1};data.civic={z:1,p:0};
  const s=begin(data);
  assert.equal(s.nodes.soma.quake,'destroyed');
  assert.equal(s.nodes.soma.burning,true);
  assert.equal(s.nodes.soma.p,9);
  assert.equal(s.nodes.mission.quake,'damaged');
  assert.equal(s.nodes.mission.p,2);
  assert.equal(s.nodes.civic.quake,'intact');
});
test('SoMa+Mission contributions add +4 to Mission Bay and Civic, even after fire',()=>{
  const s=begin(preset('three'));
  assert.equal(s.starts.length,3);
  const b=s.nodes.missionbay.p,c=s.nodes.civic.p;
  for(let i=0;i<3;i++)next(s);
  assert.equal(s.nodes.missionbay.p,b+4);
  assert.equal(s.nodes.civic.p,c+4);
  for(const id of ['missionbay','civic']){
    assert.ok(s.nodes[id].burning);
    assert.equal(s.nodes[id].received.filter(x=>['soma','mission'].includes(x.source)).length,2);
  }
});
test('no spontaneous fire at P7 if there are no earthquake sources',()=>{
  const data=preset('base');
  for(const id of DISTRICT_IDS)data[id]={z:0,p:7};
  assert.equal(stats(run(begin(data))).burning,0);
});
test('every burning district processed once, closed zones not in graph',()=>{
  const s=run(begin(preset('five')));
  assert.equal(s.events.length,stats(s).burning);
  assert.equal(new Set(s.events.map(e=>e.source)).size,s.events.length);
  for(const id of ['park','presidio','twinpeaks'])assert.equal(s.nodes[id],undefined);
});
test('source order does not affect final burning districts',()=>{
  const p=preset('three'),a=run(begin(p)),b=begin(p);
  b.queue.reverse();run(b);
  const burned=s=>Object.values(s.nodes).filter(x=>x.burning).map(x=>x.id).sort();
  assert.deepEqual(burned(a),burned(b));
});
test('scenario matrix reported for design review',()=>{
  for(const key of ['base','one','three','five','low-fire','high-risk']){
    const s=run(begin(preset(key))),st=stats(s);
    assert.equal(st.sourcesProcessed,st.burning);
    assert.ok(st.burning>=st.destroyed&&st.burning<=18);
    console.log('CATASTROPHE-SCENARIO',key,JSON.stringify(st));
  }
});

test('tuning fire strength and ignition changes outcome without touching Phase I',()=>{
  const strong=stats(run(begin(preset('one')))).burning;
  const mild=stats(run(begin(preset('one'),{spread:1,ignition:4}))).burning;
  console.log('CATASTROPHE-SENSITIVITY',JSON.stringify({oneOriginStrong:strong,oneOriginMild:mild}));
  assert.ok(strong>mild);
  assert.equal(mild,1);
});

test('full report contains raw risks, thresholds, stacked sources and all steps',()=>{
  const p=preset('three');
  p.soma.z=7;p.mission.p=8;
  const s=run(begin(p,{ignition:5,spread:2}));
  const report=formatReport({input:p,simulation:s,scenario:'Тест трёх очагов'});
  assert.match(report,/Сценарий: Тест трёх очагов/);
  assert.match(report,/Статус: Расчёт завершён/);
  assert.match(report,/У разрушение от 3/);
  assert.match(report,/возгорание от П5/);
  assert.match(report,/SoMa: У7 П1/);
  assert.match(report,/Mission: У3 П8/);
  assert.match(report,/Первоначальные очаги/);
  assert.match(report,/Шаг 1\. Источник:/);
  assert.match(report,/Mission Bay.*П\d+ \+2 = П\d+/);
  assert.match(report,/Civic Center.*П\d+ \+2 = П\d+/);
  assert.match(report,/П тек=/);
  assert.match(report,/Осталось в очереди: нет/);
  assert.match(report,/Всего районов: 18/);
});
test('partial and pre-quake reports are explicit and reproducible',()=>{
  const p=preset('one');
  const before=formatReport({input:p,scenario:'Один очаг',config:{ignition:9,spread:1}});
  assert.match(before,/Расчёт ещё не запущен/i);
  assert.match(before,/возгорание от П9/);
  const sim=begin(p);next(sim);
  const partial=formatReport({input:p,simulation:sim,scenario:'Один очаг'});
  assert.match(partial,/Частичный расчёт/);
  assert.match(partial,/Осталось в очереди:/);
  assert.match(partial,/Шаг 1\. Источник:/);
  assert.ok(partial.length>before.length);
});

test('firehouse subtracts a single initial P; five origins can be blocked in Financial District',()=>{
  const plain=preset('five');
  const baseline=stats(run(begin(plain,{spread:1}))).burning;
  const guarded=preset('five');guarded.financial.firehouse=true;
  const result=run(begin(guarded,{spread:1}));
  assert.equal(result.nodes.financial.initialAfterQuakeP,0);
  assert.equal(result.nodes.financial.received.length,2);
  assert.equal(result.nodes.financial.p,2);
  assert.equal(result.nodes.financial.burning,false);
  assert.equal(result.nodes.financial.firehouseActive,true);
  const saved=baseline-stats(result).burning;
  console.log('FIREHOUSE-SCENARIO',JSON.stringify({
    baseline,guarded:stats(result).burning,saved
  }));
  // Marina is now historically vulnerable (У2), so the unprotected baseline burns one extra district.
  assert.equal(baseline,13);
  assert.equal(stats(result).burning,6);
  assert.equal(saved,7);
});
test('station at zero does not intercept incoming P1',()=>{
  const d=preset('base');
  for(const id of DISTRICT_IDS)d[id]={z:0,p:0,firehouse:false};
  d.soma.z=3;
  d.civic.firehouse=true;
  const sim=begin(d,{spread:1});
  assert.equal(sim.nodes.civic.p,0);
  next(sim);
  assert.equal(sim.nodes.civic.p,1);
  assert.equal(sim.nodes.civic.received.length,1);
  assert.equal(sim.nodes.civic.firehouseActive,true);
});
test('firehouse in damaged district remains active',()=>{
  const d=preset('base');d.missionbay={z:2,p:1,firehouse:true};
  const sim=begin(d);
  assert.equal(sim.nodes.missionbay.quake,'damaged');
  assert.equal(sim.nodes.missionbay.quakeFireBonus,1);
  assert.equal(sim.nodes.missionbay.p,1);
  assert.equal(sim.nodes.missionbay.firehouseActive,true);
  assert.equal(sim.nodes.missionbay.firehouseDestroyed,false);
});
test('station in quake-destroyed district is destroyed without any protection',()=>{
  const d=preset('base');d.soma={z:3,p:2,firehouse:true};
  const sim=begin(d);
  assert.equal(sim.nodes.soma.p,2);
  assert.equal(sim.nodes.soma.firehouseActive,false);
  assert.equal(sim.nodes.soma.firehouseDestroyed,true);
  assert.equal(sim.nodes.soma.burning,true);
});
test('station is destroyed when spreading fire ignites its district',()=>{
  const d=preset('base');
  for(const id of DISTRICT_IDS)d[id]={z:0,p:0,firehouse:false};
  d.soma.z=3;d.civic.p=2;d.civic.firehouse=true;
  const sim=begin(d,{spread:2});
  assert.equal(sim.nodes.civic.p,1);
  const evt=next(sim);
  assert.equal(sim.nodes.civic.p,3);
  assert.equal(sim.nodes.civic.burning,true);
  assert.equal(sim.nodes.civic.firehouseActive,false);
  assert.equal(sim.nodes.civic.firehouseDestroyed,true);
  assert.ok(evt.hits.some(h=>h.id==='civic'&&h.newlyBurning&&h.stationDestroyed));
});
test('loading completed Phase I firehouse never double-counts minus one even at P0',()=>{
  const game=createInitialState({rng:()=>0.5});
  game.constructions.push({id:'FH1',districtId:'financial',projectId:'firehouse',status:'complete',playerId:0});
  assert.equal(districtRisk(game,'financial').fire.net,0);
  const values=fromGame(game);
  assert.equal(values.financial.p,1);
  assert.equal(values.financial.firehouse,true);
  assert.equal(begin(values).nodes.financial.p,0);
  game.constructions.push({id:'FH2',districtId:'civic',projectId:'firehouse',status:'complete',playerId:0});
  assert.equal(districtRisk(game,'civic').fire.net,-1);
  assert.equal(fromGame(game).civic.p,0);
  assert.equal(begin(fromGame(game)).nodes.civic.p,0);
  const stateWithUnfinished=createInitialState({rng:()=>0.5});
  stateWithUnfinished.constructions.push({id:'FH3',districtId:'civic',projectId:'firehouse',status:'under-construction',playerId:0});
  assert.equal(fromGame(stateWithUnfinished).civic.firehouse,false);
});
test('full copied report contains firehouse placement, loss, quake and final status',()=>{
  const d=preset('base');
  d.soma={z:3,p:3,firehouse:true};
  d.missionbay={z:2,p:1,firehouse:true};
  const s=run(begin(d,{spread:2}));
  const report=formatReport({input:d,simulation:s,scenario:'Station test'});
  assert.match(report,/Пожарная часть: только свой район/);
  assert.match(report,/SoMa: У3 П3; пожарная часть: есть/);
  assert.match(report,/уничтожена землетрясением/);
  assert.match(report,/пожарных частей построено: 2/);
  assert.match(report,/пожарная часть=/);
  assert.match(report,/П1 \+1 \(повреждение\) −1 \(пожарная часть\) → П1/);
  assert.match(report,/Mission Bay/);
});
