import {test,expect} from '@playwright/test';
import {createInitialState,claimCityGoal,reportCompletedCityGoals} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function fixture({funded=true,advance=false}={}){
  const s=createInitialState({rng:()=>0.3});
  s.phase='declare';s.view='hall';s.declarationIndex=0;
  s.newsCurrentIds=['E02'];s.newsC03Offer=null;
  s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
  s.players.forEach(p=>{p.capital=30;p.prestige=12;});
  s.research.R06={status:funded?'funded':'held',holderId:funded?2:0,fundedRound:funded?1:null};
  if(advance){
    const idx=s.goalMarket.findIndex(x=>x?.id==='C01');
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(claimCityGoal(s,idx,{takeAdvance:true}).ok).toBe(true);
  }
  return s;
}
async function seed(page,s){
  await page.goto('/');
  await page.evaluate(([key,value])=>localStorage.setItem(key,JSON.stringify(value)),[KEY,s]);
  await page.reload();
}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function noOverflow(page,viewport){
  const m=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(m.width).toBeLessThanOrEqual(viewport.width+3);
}
for(const viewport of viewports){
  test('R06 funded does not silently advance old City Hall UI claim '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    await seed(page,fixture());
    await expect(page.locator('#cityGoalMarket .city-goal-card')).toHaveCount(5);
    await expect(page.locator('[data-goal-slot="0"]')).toBeEnabled();
    await page.locator('[data-goal-slot="0"]').click();
    await expect(page.locator('#passTender')).toBeVisible();
    const s=await saved(page);
    expect(s.players[0].capital).toBe(30,'default UI must never take an opt-in advance without player choice');
    expect(s.players[0].goals).toHaveLength(1);
    expect(s.players[0].goals[0]).not.toHaveProperty('advanceAmount');
    expect(s.declarationIndex).toBe(0);
    expect(s.research.R06.status).toBe('funded');
    await page.reload();
    expect((await saved(page)).players[0].goals[0]).not.toHaveProperty('advanceAmount');
    await noOverflow(page,viewport);
  });
  test('R06 advanced City Hall goal survives real browser load and remains limited '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const original=fixture({advance:true}),entry=original.players[0].goals[0];
    expect(original.players[0].capital).toBe(33);
    await seed(page,original);
    const s=await saved(page);
    expect(s.players[0].goals[0]).toEqual(entry);
    expect(s.players[0].capital).toBe(33);
    const option=await page.evaluate(async key=>{
      const G=await import('/game-core.js');
      const s=JSON.parse(localStorage.getItem(key));
      s.round=2;s.players[0].goalTakenRound=null;
      return G.cityGoalAdvanceOptions(s,0);
    },KEY);
    expect(option.active).toBe(1);
    expect(option.reason).toBe('advance-limit');
    await page.locator('[data-office="0"]').click();
    await expect(page.locator('.office-goal')).toHaveCount(1);
    await page.reload();
    expect((await saved(page)).players[0].goals[0].advanceAmount).toBe(3);
    await noOverflow(page,viewport);
  });
  test('R06 paid reward is preserved after a saved multi-year goal report '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=fixture({advance:true});
    s.round=2;s.phase='declare';s.declarationIndex=0;
    s.constructions=[
      {id:'A',projectId:'tenement',playerId:0,districtId:'outerrichmond',status:'complete',materialsDelivered:[]},
      {id:'B',projectId:'cottages',playerId:0,districtId:'innersunset',status:'complete',materialsDelivered:[]}
    ];
    const reports=reportCompletedCityGoals(s);
    expect(reports).toHaveLength(1);
    expect(reports[0].capital).toBe(1);
    expect(s.players[0].capital).toBe(34);
    await seed(page,s);
    const actual=await saved(page);
    expect(actual.players[0].capital).toBe(34);
    expect(actual.players[0].goals[0].status).toBe('completed');
    expect(actual.lastGoalReports[0].advanceAmount).toBe(3);
    await page.reload();
    const loaded=await saved(page);
    expect(loaded.players[0].capital).toBe(34);
    expect(loaded.players[0].goals[0].status).toBe('completed');
    await noOverflow(page,viewport);
  });
}
