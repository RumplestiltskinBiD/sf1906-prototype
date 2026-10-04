import test from 'node:test';
import assert from 'node:assert/strict';
import {districtNeighbors} from '../game-core.js';
import {DISTRICT_IDS,indicator,riskValue,fromGame,preset,begin,next,run,stats} from '../catastrophe-core.js';
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
