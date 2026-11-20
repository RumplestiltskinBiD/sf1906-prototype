import {test,expect} from '@playwright/test';
import {createInitialState,LOGISTICS_NODES} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const screens=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function setup(){
  const s=createInitialState({rng:()=>0.31});
  s.phase='development';s.view='city';s.developmentPlayer=0;
  s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
  s.developmentComplete=false;s.developmentSlotsUsed=[0,0,0];
  s.activationMainActionUsed=false;s.actionSpaceOccupancy={};
  s.pendingBreadProduction=[];s.pendingPressCampaigns=[];s.pendingWorkforceLinks=[];s.pendingSailorRecruitments=[];
  s.pendingReinforcements=[];
  s.newsCurrentIds=['H03'];s.newsF04Notices=null;s.newsE01Contracts=null;
  s.players.forEach(p=>{
    p.capital=50;p.prestige=0;p.workersLeft=3;
    p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});
  });
  s.activeWorkerId=s.players[0].workers[0].id;
  s.constructions=[
    {id:'CAMP-A',projectId:'polytechnic_campus',playerId:1,districtId:'civic',
      status:'complete',startedRound:1,completedRound:1,
      materialsDelivered:['Lumber','Lumber','Masonry','Masonry']},
    {id:'CAMP-B',projectId:'polytechnic_campus',playerId:2,districtId:'civic',
      status:'complete',startedRound:1,completedRound:1,
      materialsDelivered:['Lumber','Lumber','Masonry','Masonry']}
  ];
  return s;
}
async function seed(page,s){
  await page.goto('/');
  await page.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[KEY,s]);
  await page.reload();
}
const saved=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
async function chooseNextWorker(page,viewport,workerId){
  const selector=(viewport.width<=640||(viewport.width<=960&&viewport.height<=500))
    ?'[data-dock-worker="'+workerId+'"]'
    :'[data-select-worker="'+workerId+'"]';
  await expect(page.locator(selector)).toBeVisible();
  await page.locator(selector).click();
}
async function finishRealActivation(page,viewport){
  const mobile=viewport.width<=640||(viewport.width<=960&&viewport.height<=500);
  const selector=mobile?'[data-mobile-action="end"]':'#actionEndActivation';
  await expect(page.locator(selector)).toBeVisible();
  await page.locator(selector).click();
}
async function acquireViaCampus(page,source,researchId){
  await expect(page.locator('[data-campus-research="'+source+'"]')).toBeEnabled();
  await page.locator('[data-campus-research="'+source+'"]').click();
  await expect(page.locator('[data-research-pick-source="building:'+source+'"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-research-acquire="'+researchId+'"]').click();
  await expect(page.locator('[data-research-card="'+researchId+'"]')).toContainText('Удерживает');
  await page.locator('#researchDrawer .close-btn').click();
}
function fitted(page,viewport){
  return page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)
    .then(extra=>expect(extra).toBeLessThanOrEqual(3));
}
test.beforeEach(({page})=>{
  page.on('pageerror',e=>{throw e;});
  page.on('console',m=>{if(m.type()==='error')throw Error(m.text());});
});
for(const viewport of screens){
  test('Stage 9 real worker handoff: A campus used, mobile/desktop NEXT player selects B, then third uses Civic '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=setup();
    await seed(page,s);
    await acquireViaCampus(page,'CAMP-A','R01');
    let now=await saved(page);
    expect(now.research.R01.holderId).toBe(0);
    expect(now.actionSpaceOccupancy['CAMP-A']).toBe(0);
    expect(now.players[1].capital).toBe(51);
    expect(now.players[0].workersLeft).toBe(2);

    await finishRealActivation(page,viewport);
    now=await saved(page);
    expect(now.developmentPlayer).toBe(1);
    expect(now.activationMainActionUsed).toBe(false);
    await page.reload();
    await chooseNextWorker(page,viewport,s.players[1].workers[0].id);
    await expect(page.locator('[data-campus-research="CAMP-A"]')).toBeDisabled();
    await expect(page.locator('[data-campus-research="CAMP-B"]')).toBeEnabled();

    await acquireViaCampus(page,'CAMP-B','R02');
    now=await saved(page);
    expect(now.actionSpaceOccupancy['CAMP-B']).toBe(1);
    expect(now.players[2].capital).toBe(51);
    expect(now.players[1].capital).toBe(51);
    expect(now.research.R02.holderId).toBe(1);

    await finishRealActivation(page,viewport);
    now=await saved(page);
    expect(now.developmentPlayer).toBe(2);
    await chooseNextWorker(page,viewport,s.players[2].workers[0].id);
    await expect(page.locator('[data-campus-research="CAMP-A"]')).toBeDisabled();
    await expect(page.locator('[data-campus-research="CAMP-B"]')).toBeDisabled();
    await expect(page.locator('[data-research-open-source="civic"]')).toBeEnabled();
    await page.locator('[data-research-open-source="civic"]').click();
    await page.locator('[data-research-acquire="R03"]').click();
    now=await saved(page);
    expect(now.research.R03.holderId).toBe(2);
    expect(now.actionSpaceOccupancy).toEqual({'CAMP-A':0,'CAMP-B':1});
    expect(now.players[1].capital).toBe(51);
    expect(now.players[2].capital).toBe(51);
    await page.reload();
    expect((await saved(page)).actionSpaceOccupancy).toEqual({'CAMP-A':0,'CAMP-B':1});
    await fitted(page,viewport);
  });
  test('Stage 9 real UI combo: acquire R07, fund R07 and held R05 in same activation, persist both '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=setup();
    s.research.R05={status:'held',holderId:0,fundedRound:null};
    s.players[0].capital=70;
    await seed(page,s);
    await page.locator('[data-research-open-source="civic"]').click();
    await page.locator('[data-research-acquire="R07"]').click();
    let state=await saved(page);
    expect(state.research.R07.status).toBe('held');
    expect(state.players[0].workersLeft).toBe(2);
    await page.locator('[data-research-fund="R07"]').click();
    await page.locator('[data-research-fund="R05"]').click();
    state=await saved(page);
    expect(state.research.R07.status).toBe('funded');
    expect(state.research.R05.status).toBe('funded');
    expect(state.players[0].capital).toBe(62);
    expect(state.players[0].workersLeft).toBe(2);
    expect(state.researchLogisticsForecast.round).toBe(2);
    await expect(page.locator('[data-research-forecast]')).toBeVisible();
    await expect(page.locator('[data-research-forecast-node]')).toHaveCount(LOGISTICS_NODES.length);
    await page.reload();
    await page.locator('#researchBtn').click();
    await expect(page.locator('[data-research-forecast-node]')).toHaveCount(5);
    const after=await saved(page);
    expect(after.researchLogisticsForecast).toEqual(state.researchLogisticsForecast);
    expect(after.players[0].capital).toBe(62);
    const price=await page.evaluate(async key=>{
      const g=await import('/game-core.js');
      const current=JSON.parse(localStorage.getItem(key));
      return {node:g.purchaseMaterialUnitPrice(current,{kind:'node',id:'broadway'},'Lumber'),
              supplier:g.purchaseMaterialUnitPrice(current,{kind:'supplier',id:'engle-lumber'},'Lumber')};
    },KEY);
    expect(price).toEqual({node:2,supplier:4});
    await fitted(page,viewport);
  });
}
