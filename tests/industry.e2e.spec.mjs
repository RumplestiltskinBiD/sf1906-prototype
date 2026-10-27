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
  // During the private draft the large market is replaced by its compact reference.
  // After draft, the full market must still contain all industrial cards/recipes.
  await seed(page,s);await page.goto('/');
  const compact=page.locator('.draft-market-ref');
  await expect(compact).toBeVisible();
  for(const name of ['Кирпичный завод','Деревообрабатывающая фабрика','Литейно-механический завод','Консервный завод']){
    await expect(compact).toContainText(name);
  }
  await expect(page.locator('#projectMarket')).toBeHidden();
  for(let player=0;player<3;player++){
    await page.locator('#revealStarterDraft').click();
    await page.locator('.draft-card').nth(0).locator('[data-draft-card]').click();
    await page.locator('.draft-card').nth(1).locator('[data-draft-card]').click();
    await page.locator('#confirmStarterDraft').click();
  }
  await expect(page.locator('#passTender')).toBeVisible();
  const cards=page.locator('#projectMarket .project-card');
  await expect(cards.filter({hasText:'Кирпичный завод'}).first()).toBeVisible();
  await expect(cards.filter({hasText:'Деревообрабатывающая фабрика'}).first()).toBeVisible();
  await expect(cards.filter({hasText:'Литейно-механический завод'}).first()).toBeVisible();
  await expect(cards.filter({hasText:'Консервный завод'}).first()).toBeVisible();
  await expect(cards.filter({hasText:'Консервный завод'}).first()).toContainText('Доход');
  const industrialCards=cards.locator('.card-stripe');
  await expect(industrialCards).toHaveCount(5);
});


for(const viewport of [{width:390,height:844},{width:932,height:430}]){
  test('industrial compact market remains accessible and draft confirmation stays on selected card at '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=createInitialState({rng:()=>0.1});
    for(let i=0;i<4;i++)s.market[i].id=['brickworks','woodworks','foundry','cannery'][i];
    await seed(page,s);await page.goto('/');
    await expect(page.locator('#hallActionBar')).toBeHidden();
    await expect(page.locator('.draft-market-ref')).toContainText('Кирпичный завод');
    await page.locator('#revealStarterDraft').click();
    await page.locator('.draft-card').nth(0).locator('[data-draft-card]').click();
    await expect(page.locator('.draft-card').nth(0).locator('.age-badge')).toHaveText('✓ 1/2');
    await page.locator('.draft-card').nth(1).locator('[data-draft-card]').click();
    await expect(page.locator('.draft-card').nth(1).locator('.age-badge')).toHaveText('✓ 2/2');
    await expect(page.locator('.draft-card').nth(1).locator('#confirmStarterDraft')).toBeVisible();
    await expect(page.locator('#hallActionBar')).toBeHidden();
    await page.locator('.draft-card').nth(1).locator('#confirmStarterDraft').click();
    await expect(page.locator('#revealStarterDraft')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false);
  });
}

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


for(const viewport of [
  {width:390,height:844},
  {width:932,height:430},
  {width:1366,height:768}
]){
  test('rival factory purchase prices and tappable sources at '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=game();
    s.developmentPlayer=1; // Rival of the owner of BR/FO
    await seed(page,s);
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/');
    const mobile=viewport.width<=640||(viewport.height<=500&&viewport.width<=960);
    await page.locator(mobile?'[data-mobile-action="delivery"]':'#actionDelivery').click();
    if(mobile)await page.locator('#deliveryShowSourceList').click();
    const brick=page.locator('[data-ds-plant="BR"]');
    await expect(brick).toBeVisible();
    await expect(brick).toContainText('Синий'); // Owned by P1 while P2 buys
    await expect(brick).toContainText('$1/Masonry');
    await expect(page.locator('[data-ds-plant="FO"]')).toContainText('$2/Steel');
    await expect(page.locator('[data-delivery-industry="BR"]')).toHaveCount(1);
    await brick.click();
    await page.locator('[data-hauler="standard"]').click();
    await page.locator('[data-load="Masonry"]').click();
    await page.locator('[data-load="Masonry"]').click();
    await expect(page.locator('.delivery-cost-preview')).toContainText('Материалы $2');
    await expect(page.locator('.cargo-box')).toContainText('2/3');
    expect(errors).toEqual([]);
  });
}

test('owner buying two bricks sees pair discount in delivery preview',async({page})=>{
  const s=game();await seed(page,s);await page.goto('/');
  await page.locator('#actionDelivery').click();
  await page.locator('[data-ds-plant="BR"]').click();
  await page.locator('[data-hauler="standard"]').click();
  await page.locator('[data-load="Masonry"]').click();
  await expect(page.locator('.delivery-cost-preview')).toContainText('Материалы $1');
  await expect(page.locator('[data-load="Masonry"]')).toContainText('$0','second brick has zero marginal cost in bundle');
  await page.locator('[data-load="Masonry"]').click();
  await expect(page.locator('.delivery-cost-preview')).toContainText('Материалы $1');
});
