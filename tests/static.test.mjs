import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {PROJECTS,STANDARD_PROJECTS,RETIRED_PROJECTS,projectById} from '../game-core.js';

test('app.js has no querySelector(...).forEach regression',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  const bad=app.split('\n').map((line,i)=>({line:i+1,text:line.trim()})).filter(x=>/(^|[^$])\$\([^)]*\)\.forEach/.test(x.text));
  assert.deepEqual(bad,[]);
});

test('browser entrypoints and displayed version are in sync',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/<title>San Francisco 1906 — v0\.54\.1 · Исследования R01–R08<\/title>/);
  assert.match(html,/<span class="version-badge">v0\.54\.1<\/span>/);
  assert.match(html,/<button class="nav-btn" id="researchBtn">/);
  assert.match(html,/app\.js\?v=0594-yard-retired/);
  assert.match(html,/styles\.css\?v=0594-yard-retired/);
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  assert.match(app,/game-core\.js\?v=0594-yard-retired/);
  assert.match(app,/newspaper-cards\.js\?v=0590-research-state/);
  const core=await readFile(new URL('../game-core.js',import.meta.url),'utf8');
  assert.match(core,/newspaper-cards\.js\?v=0590-research-state/);
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

test('retired Freight Yard hooks are gone while ordinary Delivery and saved-game migration remain',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  const core=await readFile(new URL('../game-core.js',import.meta.url),'utf8');
  const styles=await readFile(new URL('../styles.css',import.meta.url),'utf8');
  for(const needle of ['FREIGHT_YARD','freightYardInventory','freight-yard','data-ds-yard','data-delivery-freight-yard','Грузовой двор'])
    assert.equal(app.includes(needle),false,'obsolete UI action: '+needle);
  for(const needle of ['export const FREIGHT_YARD','export function freightYardInventory','yardRentCost',"'freight-yard'"])
    assert.equal(core.includes(needle),false,'obsolete game-core action: '+needle);
  for(const needle of ['freight-yard-node','freight-yard-pin','yard-count'])
    assert.equal(styles.includes(needle),false,'obsolete map style: '+needle);
  for(const needle of ['migrateRetiredFreightYard(parsed)','completedWarehouses','data-ds-wh'])
    assert.ok(app.includes(needle),'existing warehouse UI or migration missing: '+needle);
  for(const needle of ['export function migrateRetiredFreightYard','export function validateDeliveryPlan','completesProject'])
    assert.ok(core.includes(needle),'existing Delivery or migration missing: '+needle);
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
  const palette=await readFile(new URL('../building-type-palette.js',import.meta.url),'utf8');
  const renderer=await readFile(new URL('../physical-tile-renderer.js',import.meta.url),'utf8');
  for(const pair of [
    ["'Жилое':'#466B50'","Жилое"],
    ["'Бизнес':'#624D73'","Бизнес"],
    ["'Промышленное':'#353B40'","Промышленное"],
    ["'Общественное':'#3C607C'","Общественное"],
    ["'Торговое':'#A58B43'","Торговое"]
  ]){
    assert.ok(palette.includes(pair[0]),pair[1]);
    const color=pair[0].match(/#[A-F0-9]{6}/)[0];
    for(const source of [app,css,renderer])assert.ok(!source.includes(color),'Duplicate palette color '+color);
  }
  assert.ok(app.includes("from './building-type-palette.js'"));
  assert.ok(renderer.includes("from './building-type-palette.js'"));
  assert.ok(!css.includes('.draft-market-item.type-housing{border-top-color:'));
  assert.ok(palette.includes('linear-gradient(90deg'));
  for(const needle of [
    'function projectTypeStripe(project)',
    'categoryStripe(projectTypes(project))',
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


test('v0.44 City Hall Goals hooks are present',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  const core=await readFile(new URL('../game-core.js',import.meta.url),'utf8');
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const css=await readFile(new URL('../styles.css',import.meta.url),'utf8');
  for(const needle of ['CITY_GOALS','claimCityGoal','cityGoalEvaluation','reportCompletedCityGoals','refreshCityGoalMarket','failIncompleteCityGoals'])assert.ok(core.includes(needle),needle);
  for(const needle of ['function renderCityGoals()','goalRewardText','data-goal-slot','office-goal'])assert.ok(app.includes(needle),needle);
  assert.ok(html.includes('id="cityGoalMarket"'));
  for(const needle of ['.city-goal-market','.city-goal-card','.office-goal'])assert.ok(css.includes(needle),needle);
});

test('card base VP is shown once and legacy prestige copy is absent',async()=>{
  const cards=[...PROJECTS,...STANDARD_PROJECTS,...RETIRED_PROJECTS];
  for(const card of cards){
    for(const field of ['effect','benefit']){
      const copy=card[field]||'';
      assert.doesNotMatch(copy,/Престиж|Prestige/,card.id+' '+field+' legacy text');
      const pieces=copy.split(' · ');
      const base=card.prestige||0;
      const redundant=['+'+base+' VP',base+' VP',base+' VP при завершении'];
      for(const fragment of pieces)assert.ok(!redundant.includes(fragment),card.id+' '+field+' repeats '+fragment);
    }
  }
  assert.equal(projectById('orphanage').prestige,3);
  assert.match(projectById('orphanage').effect,/Политическое влияние [+]1 при завершении/);
  assert.match(projectById('orphanage').benefit,/ещё 4 VP/);
  assert.match(projectById('bakery').effect,/[$]7 или [+]1 VP/);
  assert.match(projectById('school').effect,/до [+]2 дополнительных VP/);
  assert.match(projectById('club').actionText,/[+]1 Влияние/);
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  assert.doesNotMatch(app,/Престиж|Prestige VP|Prestige после/);
  assert.match(app,/class="prestige-chip">VP /);
});

// Fail in the fast core phase if a newspaper E2E spec contains a syntax error.
// Otherwise Playwright may discover the defect only after installing Chromium.
test('newspaper browser specifications parse before full browser regression',()=>{
  for(const file of ['tests/newspaper.e2e.spec.mjs','tests/newspaper-e03.e2e.spec.mjs','tests/newspaper-e04.e2e.spec.mjs','tests/newspaper-e05.e2e.spec.mjs']){
    const parsed=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert.equal(parsed.status,0,file+' syntax error:\n'+(parsed.stderr||parsed.stdout));
  }
});
