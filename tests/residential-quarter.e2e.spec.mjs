import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const sizes=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
const quarter=projectById('residential_quarter');

function game(){
  const s=createInitialState({rng:()=>0.2});
  s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
  s.activeWorkerId=s.players[0].workers[0].id;s.activationMainActionUsed=false;
  s.players[0].capital=50;s.players[0].prestige=0;
  s.constructions=[{id:'Q',playerId:0,projectId:quarter.id,districtId:'civic',
    status:'under-construction',materialsDelivered:['Lumber','Lumber','Lumber'],
    warehouseInventory:[],startedRound:1,completedRound:null},
    {id:'W',playerId:0,projectId:'std_warehouse',districtId:'civic',
      status:'complete',materialsDelivered:['Lumber','Masonry','Steel'],
      warehouseInventory:['Masonry'],startedRound:1,completedRound:1}];
  return s;
}
async function seed(page,s){
  await page.addInitScript(({key,val})=>{
    if(localStorage.getItem(key)==null)localStorage.setItem(key,val);
  },{key:KEY,val:JSON.stringify(s)});
  await page.goto('/');
}
async function saved(page){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);}

for(const viewport of sizes){
  test('residential quarter market card and resource pips on '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=game();s.phase='declare';s.view='hall';s.declarationIndex=0;
    s.market[0].id=quarter.id;
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await seed(page,s);
    const card=page.locator('#projectMarket .project-card').filter({hasText:'Жилой квартал'}).first();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Доход +$3');
    await expect(card).toContainText('2 VP');
    await expect(card.locator('.card-resource-row .resource-pip.lumber')).toHaveCount(3);
    await expect(card.locator('.card-resource-row .resource-pip.masonry')).toHaveCount(1);
    await expect(card.locator('.card-resource-row .resource-pip')).toHaveCount(4);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
    expect(errors).toEqual([]);
  });
  test('quarter construction consumes local warehouse brick, saves and reloads on '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=game();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await seed(page,s);
    await page.locator('#officeBtn').click();
    const complete=page.locator('[data-complete-build="Q"]');
    await expect(complete).toBeEnabled();
    await complete.dispatchEvent('click');
    let current=await saved(page);
    expect(current.constructions.find(c=>c.id==='Q').status).toBe('complete');
    expect(current.constructions.find(c=>c.id==='W').warehouseInventory).toEqual([]);
    expect(current.players[0].prestige).toBe(2);
    expect(current.players[0].capital).toBe(50);
    await page.reload();
    current=await saved(page);
    expect(current.constructions.find(c=>c.id==='Q').status).toBe('complete');
    expect(current.players[0].prestige).toBe(2);
    expect(errors).toEqual([]);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });
}

test('legacy save inserts exactly two residential quarters without changing existing holdings',async({page})=>{
  const s=game();
  delete s.residentialQuarterExpansionV1;
  s.constructions=[];
  s.market=s.market.map(c=>c?.id===quarter.id?{...c,id:'tenement'}:c);
  s.deck=s.deck.filter(c=>c.id!==quarter.id);
  s.starterDraftHands=s.starterDraftHands.map(h=>h.filter(c=>c.id!==quarter.id));
  s.players[0].portfolio=['bank','tenement'];
  const oldMarket=s.market.map(c=>c?.uid);
  const oldCapital=s.players[0].capital;
  await seed(page,s);
  let current=await saved(page);
  const copies=g=>g.deck.filter(c=>c.id===quarter.id).length+
    g.market.filter(c=>c?.id===quarter.id).length+
    g.starterDraftHands.flat().filter(c=>c.id===quarter.id).length+
    g.players.flatMap(p=>p.portfolio).filter(id=>id===quarter.id).length;
  expect(current.residentialQuarterExpansionV1).toBe(true);
  expect(copies(current)).toBe(2);
  expect(current.market.map(c=>c?.uid)).toEqual(oldMarket);
  expect(current.players[0].portfolio).toEqual(['bank','tenement']);
  expect(current.players[0].capital).toBe(oldCapital);
  await page.reload();current=await saved(page);
  expect(copies(current)).toBe(2);
});

test('legacy partial save keeps a pre-existing quarter copy and only adds the missing one',async({page})=>{
  const s=game();
  delete s.residentialQuarterExpansionV1;
  s.constructions=[];
  s.deck=s.deck.filter(c=>c.id!==quarter.id);
  s.market=s.market.map(c=>c?.id===quarter.id?{...c,id:'tenement'}:c);
  s.starterDraftHands=s.starterDraftHands.map(h=>h.filter(c=>c.id!==quarter.id));
  s.players[0].portfolio=[quarter.id,'tenement'];
  await seed(page,s);
  const current=await saved(page);
  expect(current.players[0].portfolio).toEqual([quarter.id,'tenement']);
  expect(current.deck.filter(c=>c.id===quarter.id)).toHaveLength(1);
  expect(current.residentialQuarterExpansionV1).toBe(true);
});
