import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
function seed(page,state){
  return page.addInitScript(({key,value})=>localStorage.setItem(key,value),
    {key:KEY,value:JSON.stringify(state)});
}
function building(id,playerId,projectId,districtId){
  return {id,playerId,projectId,districtId,status:'complete',materialsDelivered:[],
    warehouseInventory:[],startedRound:1,completedRound:1};
}
for(const viewport of [{width:390,height:844},{width:932,height:430},{width:1366,height:768}]){
  test('four new cards show materials, risks and single-slot large skyscraper at '+viewport.width+'×'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=createInitialState({rng:()=>0.1});
    const ids=['wholesale_market','commission_house','pub','skyscraper'];
    ids.forEach((id,i)=>s.market[i].id=id);
    s.phase='declare';s.view='hall';s.declarationIndex=0; // Market cards are expanded after the private draft.
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await seed(page,s);await page.goto('/');
    const cards=page.locator('#projectMarket .project-card');
    const named=['Городской оптовый рынок','Комиссионный торговый дом','Городская пивная','Стальной деловой небоскрёб'];
    for(let i=0;i<4;i++)await expect(cards.filter({hasText:named[i]}).first()).toBeVisible();
    const sky=cards.filter({hasText:named[3]}).first();
    await expect(sky.locator('.card-resource-row .resource-pip')).toHaveCount(6);
    await expect(sky.locator('.card-resource-row .resource-pip.steel')).toHaveCount(3);
    await expect(sky).toContainText('КРУПНОЕ ЗДАНИЕ');
    await expect(sky).toContainText('Доход +$7');
    const pub=cards.filter({hasText:named[2]}).first();
    await expect(pub).toContainText('Принимает');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
    expect(errors).toEqual([]);
  });

  test('commission-house sale is playable from office at '+viewport.width+'×'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=createInitialState({rng:()=>0.1});
    s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
    s.activeWorkerId=s.players[0].workers[0].id;s.activationMainActionUsed=false;
    s.players[0].capital=60;
    s.players[0].portfolio=['tenement','school'];
    s.constructions=[building('C1',1,'commission_house','civic')];
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await seed(page,s);await page.goto('/');
    await page.locator('#officeBtn').click();
    const sell=page.locator('[data-sell-project-index="0"]');
    await expect(sell).toBeEnabled();
    await sell.click();
    const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    expect(saved.players[0].capital).toBe(64);
    expect(saved.players[0].portfolio).toEqual(['school']);
    expect(saved.players[0].workers[0].used).toBe(true);
    expect(saved.activationMainActionUsed).toBe(true);
    expect(saved.actionSpaceOccupancy.C1).toBe(0);
    expect(errors).toEqual([]);
  });

  test('VP copy is consistent in market cards at '+viewport.width+'×'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=createInitialState({rng:()=>0.1});
    s.phase='declare';s.view='hall';s.declarationIndex=0;
    for(const [i,id] of ['luxury','orphanage','school','bakery'].entries())s.market[i].id=id;
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await seed(page,s);await page.goto('/');
    const cards=page.locator('#projectMarket .project-card');
    const luxury=cards.filter({hasText:'Роскошные апартаменты'}).first();
    await expect(luxury).toBeVisible();
    await expect(luxury.locator('.prestige-chip')).toHaveText('VP 3');
    await expect(luxury.locator('.card-rule.benefit')).not.toContainText('VP');
    await expect(luxury).not.toContainText('Престиж');
    const orphanage=cards.filter({hasText:'Сиротский приют'}).first();
    await expect(orphanage.locator('.prestige-chip')).toHaveText('VP 3');
    await expect(orphanage.locator('.card-rule.benefit')).toContainText('+1 Влияние');
    await expect(orphanage.locator('.card-rule.benefit')).toContainText('ещё 4 VP');
    const school=cards.filter({hasText:'Муниципальная начальная школа'}).first();
    await expect(school.locator('.prestige-chip')).toHaveText('VP 2');
    await expect(school.locator('.card-rule.benefit')).toContainText('До +2 дополнительных VP');
    const bakery=cards.filter({hasText:'Семейная пекарная артель'}).first();
    await expect(bakery.locator('.card-rule.benefit')).toContainText('+1 VP');
    await expect(page.locator('#contextPanel')).not.toContainText('Престиж');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
    expect(errors).toEqual([]);
  });

  test('completed project displays construction VP once at '+viewport.width+'×'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=createInitialState({rng:()=>0.1});
    s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
    s.activeWorkerId=s.players[0].workers[0].id;
    s.constructions=[building('VP-1',0,'luxury','civic')];
    const expectedInfluence=s.players[0].influence;
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await seed(page,s);await page.goto('/');
    await page.locator('#officeBtn').click();
    const completed=page.locator('.construction-card.completed').filter({hasText:'Роскошные апартаменты'}).first();
    await expect(completed).toBeVisible();
    const copy=await completed.locator('.completed-effect').innerText();
    expect(copy).toContain('+3 VP');
    expect(copy.match(/VP/g)).toHaveLength(1);
    expect(copy).not.toContain('Престиж');
    await expect(page.locator('.office-summary .office-stat').nth(1)).toContainText('VP');
    await expect(page.locator('.office-summary .office-stat').nth(1)).not.toContainText('Престиж');
    const saved=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));
    expect(saved.players[0].influence).toBe(expectedInfluence);
    expect(errors).toEqual([]);
  });

}
