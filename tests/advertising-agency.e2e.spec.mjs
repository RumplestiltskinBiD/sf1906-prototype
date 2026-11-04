import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
const site=(id,owner=1,districtId='civic',status='complete')=>({
  id,playerId:owner,projectId:'ad_agency',districtId,status,
  materialsDelivered:status==='complete'?[...projectById('ad_agency').materials]:[],
  warehouseInventory:[],startedRound:1,completedRound:status==='complete'?1:null
});
function game(){
  const s=createInitialState({rng:()=>0.2});
  s.phase='development';s.view='city';s.developmentComplete=false;s.developmentPlayer=0;
  s.activeWorkerId=s.players[0].workers[0].id;s.activationMainActionUsed=false;
  s.actionSpaceOccupancy={};
  s.players[0].capital=10;
  s.constructions=[site('AD-1',1)];
  return s;
}
async function seed(page,state){
  await page.addInitScript(({key,val})=>localStorage.setItem(key,val),{key:KEY,val:JSON.stringify(state)});
  await page.goto('/');
}
async function stored(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}

for(const viewport of viewports){
  test('agency card shows only its own text at '+viewport.width+'×'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=createInitialState({rng:()=>0.2});
    s.phase='declare';s.view='hall';s.declarationIndex=0;s.market[0].id='ad_agency';
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await seed(page,s);
    const card=page.locator('#projectMarket .project-card').filter({hasText:'Городское рекламное агентство'}).first();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Стоимость земли 2+');
    await expect(card).toContainText('Рекламная кампания');
    await expect(card).toContainText('+2 к постоянному Income');
    await expect(card.locator('.card-resource-row .resource-pip')).toHaveCount(3);
    await expect(card.locator('.card-rule.limits')).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
    expect(errors).toEqual([]);
  });

  test('other player can advertise, sees changed Income, and reload preserves it at '+viewport.width+'×'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await seed(page,game());
    const button=page.locator('[data-advertising-action="AD-1"]');
    await expect(button).toBeEnabled();
    await button.dispatchEvent('click');
    let s=await stored(page);
    expect(s.players[0].capital).toBe(8);
    expect(s.players[0].advertisingIncomeBonus).toBe(2);
    expect(s.players[1].advertisingIncomeBonus).toBe(0);
    expect(s.players[0].workers[0].used).toBe(true);
    expect(s.actionSpaceOccupancy['AD-1']).toBe(0);
    await expect(button).toBeDisabled();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
    await page.reload();
    s=await stored(page);
    expect(s.players[0].advertisingIncomeBonus).toBe(2);
    expect(s.actionSpaceOccupancy['AD-1']).toBe(0);
    expect(errors).toEqual([]);
  });

  test('agency action respects insufficient cash and distance at '+viewport.width+'×'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=game();s.players[0].capital=1;
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await seed(page,s);
    await expect(page.locator('[data-advertising-action="AD-1"]')).toBeDisabled();
    let saved=await stored(page);expect(saved.players[0].advertisingIncomeBonus).toBe(0);
    expect(errors).toEqual([]);
  });
}

test('old save receives two new cards exactly once, no loss of existing buildings',async({page})=>{
  const s=game();s.advertisingAgencyExpansionV1=false;
  s.constructions=[{id:'EXIST',playerId:0,projectId:'tenement',districtId:'civic',status:'complete',
    materialsDelivered:['Lumber','Lumber','Masonry'],warehouseInventory:[],startedRound:1,completedRound:1}];
  s.players.forEach(p=>delete p.advertisingIncomeBonus);
  s.market=s.market.map(m=>m?.id==='ad_agency'?{...m,id:'tenement'}:m);
  s.deck=s.deck.filter(c=>c.id!=='ad_agency');
  s.starterDraftHands=s.starterDraftHands.map(h=>h.filter(c=>c.id!=='ad_agency'));
  await seed(page,s);
  const count=state=>[...state.market,...state.deck,...state.starterDraftHands.flat()].filter(c=>c?.id==='ad_agency').length;
  let current=await stored(page);
  expect(count(current)).toBe(2);
  expect(current.advertisingAgencyExpansionV1).toBe(true);
  expect(current.players[0].advertisingIncomeBonus).toBe(0);
  expect(current.constructions.some(c=>c.id==='EXIST'&&c.status==='complete')).toBe(true);
  await page.reload();
  current=await stored(page);
  expect(count(current)).toBe(2);
  expect(current.constructions.some(c=>c.id==='EXIST')).toBe(true);
});

test('second agency copy remains usable by same player after first one was occupied',async({page})=>{
  const s=game();
  s.constructions.push(site('AD-2',2));
  s.actionSpaceOccupancy={'AD-1':0};
  s.players[0].advertisingIncomeBonus=2;
  s.players[0].workers[0].used=true;
  s.activeWorkerId=s.players[0].workers[1].id;
  await seed(page,s);
  await expect(page.locator('[data-advertising-action="AD-1"]')).toBeDisabled();
  const second=page.locator('[data-advertising-action="AD-2"]');
  await expect(second).toBeEnabled();await second.dispatchEvent('click');
  const after=await stored(page);
  expect(after.players[0].advertisingIncomeBonus).toBe(4);
  expect(after.players[0].workers[1].used).toBe(true);
  expect(after.actionSpaceOccupancy['AD-2']).toBe(0);
});
