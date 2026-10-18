import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
function seed(page,s){
  return page.addInitScript(({key,value})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,value);
  },{key:KEY,value:JSON.stringify(s)});
}
function sampleBuilding(id,projectId,districtId,playerId=0){
  return {id,playerId,projectId,districtId,status:'complete',
    materialsDelivered:[],warehouseInventory:[],startedRound:1,completedRound:1};
}

for(const viewport of [{width:390,height:844},{width:932,height:430},{width:1366,height:768}]){
  test('new residential and school cards display five-material brick house and U+2 on '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=createInitialState({rng:()=>0.1});
    s.market[0].id='cottages';
    s.market[1].id='brickapartments';
    s.market[2].id='school';
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await seed(page,s);await page.goto('/');
    const market=page.locator('#projectMarket .project-card');
    const cottages=market.filter({hasText:'Пригородные викторианские коттеджи'}).first();
    const brick=market.filter({hasText:'Кирпичный многоквартирный дом'}).first();
    const school=market.filter({hasText:'Муниципальная начальная школа'}).first();
    await expect(cottages).toBeVisible();
    await expect(brick).toBeVisible();
    await expect(school).toBeVisible();
    await expect(brick.locator('.card-resource-row .resource-pip')).toHaveCount(5);
    await expect(brick.locator('.card-resource-row .resource-pip.lumber')).toHaveCount(1);
    await expect(brick.locator('.card-resource-row .resource-pip.masonry')).toHaveCount(2);
    await expect(brick.locator('.card-resource-row .resource-pip.steel')).toHaveCount(2);
    await expect(brick.locator('.risk-change.quake')).toContainText('У +2');
    await expect(brick).toContainText('Стоимость земли 2+');
    await expect(school.locator('.card-resource-row .resource-pip')).toHaveCount(3);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
    expect(errors).toEqual([]);
  });
}

test('existing games get each new project exactly twice without changing market and portfolios',async({page})=>{
  const s=createInitialState({rng:()=>0.1});
  s.phase='development';s.view='city';s.developmentPlayer=0;
  delete s.housingSchoolExpansionV1; // Simulate old v0.44 save.
  const ids=new Set(['cottages','brickapartments','school']);
  s.market=s.market.map((m,i)=>ids.has(m.id)?{...m,id:'tenement'}:m);
  s.deck=s.deck.filter(x=>!ids.has(x.id));
  s.starterDraftHands=s.starterDraftHands.map(hand=>hand.filter(x=>!ids.has(x.id)));
  s.players[0].portfolio=['bank','warehouse'];
  const oldMarket=s.market.map(x=>x?.id);
  await seed(page,s);await page.goto('/');
  let stored=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));
  expect(stored.housingSchoolExpansionV1).toBe(true);
  expect(stored.market.map(x=>x?.id)).toEqual(oldMarket);
  expect(stored.players[0].portfolio).toEqual(['bank','warehouse']);
  for(const id of ids)expect(stored.deck.filter(x=>x.id===id)).toHaveLength(2);
  await page.reload();
  stored=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));
  for(const id of ids)expect(stored.deck.filter(x=>x.id===id)).toHaveLength(2);
});

test('municipal school displays the awarded bonus after saving/reopening office',async({page})=>{
  const s=createInitialState({rng:()=>0.1});
  s.phase='development';s.view='city';s.developmentPlayer=0;
  s.constructions=[{...sampleBuilding('SCH','school','civic'),schoolHousingVpAwarded:2},
    sampleBuilding('H1','tenement','civic',1),sampleBuilding('H2','tenement','mission',2)];
  s.players[0].prestige=4;
  await seed(page,s);await page.goto('/');
  await page.locator('#officeBtn').click();
  const office=page.locator('#officeContent');
  await expect(office).toContainText('Муниципальная начальная школа');
  await expect(office).toContainText('школа +2 VP');
  await expect(office).toContainText('+4 VP');
});
