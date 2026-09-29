import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

test('app.js has no querySelector(...).forEach regression',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  const bad=app.split('\n').map((line,i)=>({line:i+1,text:line.trim()})).filter(x=>/(^|[^$])\$\([^)]*\)\.forEach/.test(x.text));
  assert.deepEqual(bad,[]);
});

test('browser entrypoints and displayed version are in sync',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/Prototype v0\.29\.2/);
  assert.match(html,/app\.js\?v=0292/);
  assert.match(html,/styles\.css\?v=0292/);
});

test('Delivery UI contains all progressive flow handlers',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  for(const needle of [
    "deliveryDraft.step='load'",
    "$$('[data-hauler]').forEach",
    "$$('[data-load]').forEach",
    "$$('[data-route-next]').forEach",
    "$$('[data-drop-type]').forEach",
    "$('#deliveryConfirm')?.addEventListener('click',confirmDelivery)",
    "el.className='delivery-panel active'"
  ]) assert.ok(app.includes(needle),needle);
});


test('JavaScript entry files parse successfully',()=>{
  for(const file of ['app.js','game-core.js']){
    const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(r.status,0,file+' syntax error:\n'+(r.stderr||r.stdout));
  }
});


test('persistent city overview hooks are present',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  for(const needle of [
    'function renderCityOverview()',
    'function focusConstruction(',
    'function focusMapOnDistrict(',
    'action-available',
    'build-dim',
    'data-construction-token'
  ]) assert.ok(app.includes(needle),needle);
});


test('mobile map-first hooks are present',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  for(const needle of [
    'function renderMobileObjectStrip()',
    'function showObjectsOnMap(',
    'deliveryShowSourceList',
    'deliveryShowRouteList',
    'node-hit',
    'showOfficeObjectsMap'
  ]) assert.ok(app.includes(needle),needle);
});
