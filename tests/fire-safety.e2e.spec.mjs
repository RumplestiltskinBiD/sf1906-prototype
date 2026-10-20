import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a';
function seed(page,s){
  return page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:KEY,value:JSON.stringify(s)});
}
function building(id,owner,project,district='civic'){
  return {id,playerId:owner,projectId:project,districtId:district,status:'complete',
    materialsDelivered:[...projectById(project).materials],warehouseInventory:[],
    startedRound:1,completedRound:1};
}
function game({workshop=true,inspect=false}={}){
  const s=createInitialState({rng:()=>0.1});
  s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
  s.activeWorkerId=s.players[0].workers[0].id;s.activationMainActionUsed=false;
  s.actionSpaceOccupancy={};
  s.players.forEach(p=>p.capital=50);
  s.players[0].workers[0].districtId='civic';
  s.constructions=[building('FH',1,'firehouse'),building('FAC',inspect?1:0,'factory')];
  if(workshop)s.constructions.push(building('WORK',2,'fireworkshop'));
  if(inspect)s.constructions.push(building('WOOD',2,'woodworks'));
  return s;
}
for(const viewport of [{width:390,height:844},{width:932,height:430},{width:1366,height:768}]){
  test('fire station voluntary upgrade works at '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=game();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await seed(page,s);await page.goto('/');
    await expect(page.locator('#cityActions [data-fire-mode="upgrade"]')).toBeEnabled();
    await page.locator('#cityActions [data-fire-mode="upgrade"]').click();
    const target=page.locator('#cityActions [data-fire-target="FAC"]');
    await expect(target).toBeVisible();
    await expect(target).toContainText('$1');
    await target.click();
    const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    expect(saved.constructions.find(c=>c.id==='FAC').fireSafetyModernized).toBe(true);
    expect(saved.players[0].capital).toBe(49);
    expect(saved.players[0].workers[0].used).toBe(true);
    expect(saved.actionSpaceOccupancy.FH).toBe(0);
    await page.reload();
    await page.locator('#officeBtn').click();
    await expect(page.locator('#officeContent')).toContainText('ПОЖАРНАЯ МОДЕРНИЗАЦИЯ');
    expect(errors).toEqual([]);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });
  test('inspecting tied buildings and applying permanent fine at '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=game({inspect:true});
    s.players[1].capital=1;s.players[2].capital=5;
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await seed(page,s);await page.goto('/');
    await page.locator('#cityActions [data-fire-mode="inspect"]').click();
    const target=page.locator('#cityActions [data-fire-target="civic"]');
    await expect(target).toContainText('2 объект');
    await target.click();
    const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    expect(saved.constructions.find(c=>c.id==='FAC').fireSafetyModernized).toBe(true);
    expect(saved.constructions.find(c=>c.id==='WOOD').fireSafetyModernized).toBe(true);
    expect(saved.players[1].capital).toBe(0);
    expect(saved.players[1].fireIncomePenalty).toBe(1);
    expect(saved.players[2].capital).toBe(2);
    expect(saved.players[2].fireIncomePenalty).toBe(0);
    await page.reload();
    await page.locator('#officeBtn').click();
    // Switch office to the offender to inspect the permanent annual fine.
    await page.locator('[data-office-tab="1"]').click();
    await expect(page.locator('#officeContent')).toContainText('пожарный штраф −$1/год');
    expect(errors).toEqual([]);
  });
}

test('old saved game receives exactly two workshops without disturbing hand/market and no repeat on reload',async({page})=>{
  const s=game({workshop:false});
  delete s.fireSafetyExpansionV1;
  s.deck=s.deck.filter(c=>c.id!=='fireworkshop');
  s.market=s.market.map(m=>m&&m.id==='fireworkshop'?{...m,id:'tenement'}:m);
  s.starterDraftHands=s.starterDraftHands.map(hand=>hand.filter(c=>c.id!=='fireworkshop'));
  s.players[0].portfolio=['school'];
  const market=s.market.map(x=>x?.id);
  await seed(page,s);await page.goto('/');
  const first=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  expect(first.fireSafetyExpansionV1).toBe(true);
  expect(first.market.map(x=>x?.id)).toEqual(market);
  expect(first.players[0].portfolio).toEqual(['school']);
  expect(first.deck.filter(x=>x.id==='fireworkshop')).toHaveLength(2);
  await page.reload();
  const second=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  expect(second.deck.filter(x=>x.id==='fireworkshop')).toHaveLength(2);
});
