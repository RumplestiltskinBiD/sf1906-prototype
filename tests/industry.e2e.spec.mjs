import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const STORE='sf1906_phase1_ui_v030a';

function building(id,owner,project,district,stock=[]){
  return {id,playerId:owner,projectId:project,districtId:district,status:'complete',
    industrialInventory:[...stock],warehouseInventory:[],materialsDelivered:[],
    startedRound:1,completedRound:1};
}
async function seed(page,s){
  await page.addInitScript(({key,value})=>{
    localStorage.setItem(key,value);
  },{key:STORE,value:JSON.stringify(s)});
}
function game(){
  const s=createInitialState({rng:()=>0.1});
  s.phase='development';s.view='city';s.developmentPlayer=0;
  s.developmentComplete=false;s.activationMainActionUsed=false;s.activeWorkerId=null;
  s.players.forEach(p=>p.capital=60);
  s.constructions=[
    building('BR',0,'brickworks','mission',['Masonry','Masonry']),
    building('FO',0,'foundry','soma',['Steel']),
    building('CAN',0,'cannery','mission'),
    building('H1',1,'tenement','mission'),
    building('H2',0,'luxury','mission'),
    building('H3',2,'speculative','mission')
  ];
  return s;
}

test('all new industrial cards display in market with correct colors and recipes',async({page})=>{
  const s=createInitialState({rng:()=>0.1});
  for(let i=0;i<4;i++)s.market[i].id=['brickworks','woodworks','foundry','cannery'][i];
  await seed(page,s);await page.goto('/');
  const cards=page.locator('#projectMarket .project-card');
  await expect(cards.filter({hasText:'Кирпичный завод'})).toBeVisible();
  await expect(cards.filter({hasText:'Деревообрабатывающая фабрика'})).toBeVisible();
  await expect(cards.filter({hasText:'Литейно-механический завод'})).toBeVisible();
  await expect(cards.filter({hasText:'Консервный завод'})).toBeVisible();
  await expect(cards.filter({hasText:'Консервный завод'})).toContainText('Доход');
  const industrialCards=cards.locator('.card-stripe');
  await expect(industrialCards).toHaveCount(5);
});

for(const viewport of [
  {width:390,height:844},
  {width:932,height:430},
  {width:1366,height:768}
]){
  test('factory stock selectable for delivery, no crash at '+viewport.width+'×'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=game();await seed(page,s);
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/');
    const mobile=viewport.width<=640||(viewport.height<=500&&viewport.width<=960);
    const open=page.locator(mobile?'[data-mobile-action="delivery"]':'#actionDelivery');
    await expect(open).toBeVisible();
    await open.click();
    if(mobile)await page.locator('#deliveryShowSourceList').click();
    const factory=page.locator('[data-ds-plant="BR"]');
    await expect(factory).toBeVisible();
    await expect(factory).toContainText('Кирпичный завод');
    await expect(factory).toContainText('2/2');
    await expect(page.locator('[data-ds-plant="FO"]')).toContainText('1/1');
    if(mobile)await expect(page.locator('[data-delivery-industry="BR"]')).toHaveCount(1);
    await factory.click();
    await expect(page.locator('[data-load="Masonry"]')).toBeVisible();
    await page.locator('[data-hauler="standard"]').click();
    await page.locator('[data-load="Masonry"]').click();
    await expect(page.locator('.cargo-box')).toContainText('1/3');
    const over=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(over).toBeLessThanOrEqual(2);
    expect(errors).toEqual([]);
  });
}
