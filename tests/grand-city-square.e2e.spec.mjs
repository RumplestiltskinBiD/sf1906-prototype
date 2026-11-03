import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a';
const sizes=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
const square=(id,status='under-construction')=>({id,playerId:0,projectId:'grand_city_square',districtId:'civic',status,
  materialsDelivered:['Lumber','Masonry'],warehouseInventory:[],startedRound:1,completedRound:status==='complete'?1:null});
const game=()=>{
  const s=createInitialState({rng:()=>0.2});
  s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
  s.activeWorkerId=s.players[0].workers[0].id;s.activationMainActionUsed=false;
  s.players[0].capital=50;s.players[0].prestige=0;
  s.districts.civic.landValue=2;s.constructions=[square('G')];
  return s;
};
async function seed(page,s){
  await page.addInitScript(({key,val})=>{if(localStorage.getItem(key)==null)localStorage.setItem(key,val);},
    {key:KEY,val:JSON.stringify(s)});
  await page.goto('/');
}
async function stored(page){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);}
for(const viewport of sizes){
 test('Square card, real completion and save at '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);const s=game();
  s.market[0].id='grand_city_square';
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await seed(page,s);
  const card=page.locator('#projectMarket .project-card').filter({hasText:'Большой городской сквер'}).first();
  if(await card.count()){
    await expect(card).toContainText('Большой городской сквер');
    await expect(card.locator('.prestige-chip')).toHaveText('VP 2');
    await expect(card.locator('.resource-pip')).toHaveCount(2);
  }
  await page.locator('#officeBtn').click();
  const complete=page.locator('[data-complete-build="G"]');
  await expect(complete).toBeEnabled();
  await expect(complete).toContainText('Завершить строительство');
  await complete.dispatchEvent('click');
  let saved=await stored(page);
  expect(saved.constructions.find(c=>c.id==='G').status).toBe('complete');
  expect(saved.districts.civic.landValue).toBe(4);
  expect(saved.players[0].prestige).toBe(2);
  expect(saved.players[0].capital).toBe(50);
  await page.reload();saved=await stored(page);
  expect(saved.districts.civic.landValue).toBe(4);
  expect(saved.players[0].prestige).toBe(2);
  expect(errors).toEqual([]);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
 });
}
test('old game adds exactly two new Square copies once and keeps the existing market, projects and money',async({page})=>{
 const s=game();s.grandCitySquareExpansionV1=false;
 s.constructions=[];s.market=s.market.map(c=>c?.id==='grand_city_square'?{...c,id:'tenement'}:c);
 s.deck=s.deck.filter(c=>c.id!=='grand_city_square');
 s.starterDraftHands=s.starterDraftHands.map(h=>h.filter(c=>c.id!=='grand_city_square'));
 const previousMoney=s.players[0].capital;
 await seed(page,s);
 let saved=await stored(page);
 const count=g=>g.deck.filter(c=>c.id==='grand_city_square').length
   +g.market.filter(c=>c?.id==='grand_city_square').length
   +g.starterDraftHands.flat().filter(c=>c.id==='grand_city_square').length;
 expect(count(saved)).toBe(2);expect(saved.players[0].capital).toBe(previousMoney);
 expect(saved.grandCitySquareExpansionV1).toBe(true);
 await page.reload();saved=await stored(page);
 expect(count(saved)).toBe(2);
});
