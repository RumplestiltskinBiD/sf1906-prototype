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
  assert.match(html,/Influence & Upkeep v0\.43B/);
  assert.match(html,/app\.js\?v=043b-suppliers/);
  assert.match(html,/styles\.css\?v=043b-suppliers/);
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
    'deliveryLockRoute',
    'node-hit',
    'showOfficeObjectsMap'
  ]) assert.ok(app.includes(needle),needle);
});


test('v0.30A risk UI hooks are present',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  for(const needle of [
    'function districtRiskPanelHtml(',
    'function constructionRiskPreviewHtml(',
    'riskViewActive',
    'riskViewBtn',
    'risk-preview-box'
  ]) assert.ok(app.includes(needle),needle);
});


test('v0.30A-UX friction-reduction hooks are present',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  for(const needle of [
    'function undoLastGameAction()',
    'function renderMarketOverview()',
    'function renderMobileActionDock()',
    'gameplayFingerprint('
  ]) assert.ok(app.includes(needle),needle);
  for(const needle of ['id="undoBtn"','id="marketOverview"','id="mobileActionDock"']) assert.ok(html.includes(needle),needle);
});


test('v0.30A-UX3 mobile turn flow hooks are present',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  for(const needle of ['function confirmDeliveryRoute()','step=\'unload\'','persistent-turn-dock','function openActiveFreeActions()','Подтвердить маршрут','Подтвердить доставку'])assert.ok(app.includes(needle),needle);
});


test('v0.30A-UX3.1 construction-needs and drawer-peek hooks are present',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  for(const needle of ['function compactConstructionNeed(','function deliveryConstructionNeedsHtml(','construction-need-text','drawer-open','НУЖНО НА СТРОЙКАХ'])assert.ok(app.includes(needle),needle);
});

test('v0.30A-L1 logistics fallback hooks are present',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  const core=await readFile(new URL('../game-core.js',import.meta.url),'utf8');
  for(const needle of ['FREIGHT_YARD','freightYardInventory','freight-yard','Грузовой двор'])assert.ok(app.includes(needle),needle);
  for(const needle of ['export const FREIGHT_YARD','export function freightYardInventory','yardRentCost','completesProject'])assert.ok(core.includes(needle),needle);
});


test('v0.43B influence and upkeep UI hooks are present',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  const core=await readFile(new URL('../game-core.js',import.meta.url),'utf8');
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  for(const needle of ['function renderYearTransition()','closeConstructionForUpkeep','upkeepSelectedConstructionId','turn-order-badge','Простой незавершённых строек'])assert.ok(app.includes(needle),needle);
  for(const needle of ['export function moveInfluence','export function constructionUpkeepDue','export function closeConstructionForUpkeep','yearTurnOrder'])assert.ok(core.includes(needle),needle);
  for(const needle of ['id="yearTransitionBackdrop"','id="yearTransitionSheet"'])assert.ok(html.includes(needle),needle);
});


test('building type color palette and stripe hooks are present everywhere',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  const css=await readFile(new URL('../styles.css',import.meta.url),'utf8');
  for(const pair of [
    ["'Жилое':'#56875A'","Жилое"],
    ["'Бизнес':'#76558F'","Бизнес"],
    ["'Промышленное':'#34383D'","Промышленное"],
    ["'Общественное':'#3F78A8'","Общественное"],
    ["'Торговое':'#D5A021'","Торговое"]
  ]) assert.ok(app.includes(pair[0]),pair[1]);
  for(const needle of [
    'function projectTypeStripe(project)',
    'linear-gradient(90deg',
    'typed-project',
    'type-stripe-compact',
    'projectSvgTypeStripe',
    'construction-type-cap'
  ]) assert.ok(app.includes(needle),needle);
  for(const needle of ['.typed-project', '--type-stripe', '.detail-type-stripe', '.construction-type-cap'])assert.ok(css.includes(needle),needle);
});


test('historical neutral material suppliers are wired into core and Delivery UI',async()=>{
  const core=await readFile(new URL('../game-core.js',import.meta.url),'utf8');
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  const css=await readFile(new URL('../styles.css',import.meta.url),'utf8');
  for(const needle of ['Gray Brothers Quarry','Engle & Son Lumber Yard','Axford Bros. Iron Foundry','NEUTRAL_MATERIAL_SUPPLIERS'])assert.ok(core.includes(needle),needle);
  for(const needle of ['data-delivery-supplier','data-ds-supplier','neutral-supplier-node','исторический поставщик'])assert.ok(app.includes(needle),needle);
  for(const needle of ['.neutral-supplier-node','.neutral-supplier-source','.supplier-pin'])assert.ok(css.includes(needle),needle);
});
