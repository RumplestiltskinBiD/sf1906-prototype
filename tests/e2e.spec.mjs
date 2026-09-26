import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const STORAGE_KEY='sf1906_phase1_ui_v028';

test.beforeEach(async({page})=>{
  page.on('pageerror',error=>{throw error;});
  page.on('console',msg=>{if(msg.type()==='error')throw new Error('Browser console error: '+msg.text());});
});

function makeDevState(){
  const s=createInitialState({rng:()=>0.1});
  s.phase='development';
  s.view='city';
  s.developmentPlayer=0;
  s.developmentComplete=false;
  s.activationMainActionUsed=false;
  s.activeWorkerId=null;
  s.pendingWorkerAction=null;
  s.players.forEach(p=>{p.capital=50;});
  s.logisticsSupply={
    broadway:['Lumber','Lumber','Masonry'],
    pacificmail:['Masonry','Steel','Lumber','Masonry'],
    southernpacific:['Lumber','Masonry','Steel','Lumber'],
    chinabasin:['Lumber','Masonry','Steel','Lumber'],
    unioniron:['Steel','Masonry']
  };
  s.haulersUsed=[];
  s.constructions=[];
  return s;
}
function con(id,playerId,projectId,districtId,status='under-construction',materialsDelivered=[],warehouseInventory=[]){
  return {id,playerId,projectId,districtId,status,materialsDelivered:[...materialsDelivered],warehouseInventory:[...warehouseInventory],startedRound:1,completedRound:status==='complete'?1:null};
}
async function seed(page,state){
  await page.addInitScript(({key,value})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,value);
  },{key:STORAGE_KEY,value:JSON.stringify(state)});
}
async function stored(page){
  return JSON.parse(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY));
}

test('fresh game UI can complete draft handoff and reach Development without dead controls',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.version-badge')).toHaveText('v0.28.6');
  for(let i=0;i<3;i++){
    await page.locator('#revealStarterDraft').click();
    const cards=page.locator('[data-draft-card]');
    await expect(cards).toHaveCount(5);
    await cards.nth(0).click();
    await cards.nth(1).click();
    await page.locator('#confirmStarterDraft').click();
  }
  await expect(page.locator('#passTender')).toBeVisible();
  await page.locator('#passTender').click();
  await page.locator('#passTender').click();
  await page.locator('#passTender').click();
  await page.locator('#nextTenderStage').click();
  await expect(page.locator('#resolveTender')).toBeVisible();
  await page.locator('#resolveTender').click();
  await expect(page.locator('#cityView')).toHaveClass(/active/);
  await expect(page.locator('#actionDelivery')).toBeEnabled();
});

test('same-district Delivery works end-to-end with $0 road cost and live unload buttons',async({page})=>{
  const s=makeDevState();
  s.selectedDistrictId='soma';
  s.constructions=[con('C1',0,'insurance','soma')];
  await seed(page,s);
  await page.goto('/');

  await page.locator('#actionDelivery').click();
  await expect(page.locator('#deliveryPanel')).toHaveClass(/active/);
  await page.locator('[data-ds-node="pacificmail"]').click();
  await page.locator('[data-hauler="dray2a"]').click();
  await page.locator('[data-load="Masonry"]').click();
  await page.locator('[data-load="Steel"]').click();
  await page.locator('#deliveryBeginRoute').click();

  await expect(page.locator('#deliveryTargets')).toBeVisible();
  await expect(page.locator('[data-drop-id="C1"][data-drop-type="Masonry"]')).toBeVisible();
  await expect(page.locator('.delivery-total')).toContainText('Границы $0');
  await page.locator('[data-drop-id="C1"][data-drop-type="Masonry"]').click();
  await expect(page.locator('.delivery-cargo-status')).toContainText('M 0');
  await expect(page.locator('.delivery-cargo-status')).toContainText('S 1');
  await page.locator('[data-drop-id="C1"][data-drop-type="Steel"]').click();
  await expect(page.locator('.delivery-cargo-status')).toContainText('S 0');
  await expect(page.locator('#deliveryConfirm')).toBeEnabled();
  await page.locator('#deliveryConfirm').click();

  const saved=await stored(page);
  assertDelivery(saved,'C1',['Masonry','Steel']);
  expect(saved.players[0].capital).toBe(47);
  expect(saved.haulersUsed).toContain('dray2a');
});

test('multi-drop route keeps controls wired after each re-render',async({page})=>{
  const s=makeDevState();
  s.selectedDistrictId='northbeach';
  s.constructions=[
    con('C1',0,'tenement','pacific'),
    con('C2',0,'tenement','western')
  ];
  await seed(page,s);
  await page.goto('/');

  await page.locator('#actionDelivery').click();
  await page.locator('[data-ds-node="broadway"]').click();
  await page.locator('[data-hauler="dray2a"]').click();
  await page.locator('[data-load="Lumber"]').click();
  await page.locator('[data-load="Lumber"]').click();
  await page.locator('#deliveryBeginRoute').click();

  await page.locator('[data-route-next="pacific"]').click();
  await page.locator('[data-drop-id="C1"][data-drop-type="Lumber"]').click();
  await expect(page.locator('[data-route-next="western"]')).toBeVisible();
  await page.locator('[data-route-next="western"]').click();
  await page.locator('[data-drop-id="C2"][data-drop-type="Lumber"]').click();

  await expect(page.locator('.delivery-total')).toContainText('Границы $2');
  await expect(page.locator('#deliveryConfirm')).toBeEnabled();
  await page.locator('#deliveryConfirm').click();

  const saved=await stored(page);
  assertDelivery(saved,'C1',['Lumber']);
  assertDelivery(saved,'C2',['Lumber']);
});

test('one-use hauler becomes unavailable while Standard Hauler remains reusable',async({page})=>{
  const s=makeDevState();
  s.constructions=[con('C1',0,'tenement','northbeach')];
  await seed(page,s);
  await page.goto('/');

  async function deliverWith(hauler){
    await page.locator('#actionDelivery').click();
    await page.locator('[data-ds-node="broadway"]').click();
    await page.locator(`[data-hauler="${hauler}"]`).click();
    await page.locator('[data-load="Lumber"]').click();
    await page.locator('#deliveryBeginRoute').click();
    await page.locator('[data-drop-id="C1"][data-drop-type="Lumber"]').click();
    await page.locator('#deliveryConfirm').click();
  }
  await deliverWith('dray2a');
  await page.locator('#actionDelivery').click();
  await page.locator('[data-ds-node="broadway"]').click();
  await expect(page.locator('[data-hauler="dray2a"]')).toBeDisabled();
  await expect(page.locator('[data-hauler="standard"]')).toBeEnabled();
  await page.locator('#cancelDelivery').click();
});

test('Office Begin Construction button works and creates a construction through the map flow',async({page})=>{
  const s=makeDevState();
  s.players[0].portfolio=['tenement'];
  const w=s.players[0].workers[0];
  w.districtId='civic';
  s.activeWorkerId=w.id;
  await seed(page,s);
  await page.goto('/');

  await page.locator('#officeBtn').click();
  await expect(page.locator('[data-start-project="tenement"]')).toBeEnabled();
  await page.locator('[data-start-project="tenement"]').click();
  await expect(page.locator('#constructionMode')).toHaveClass(/active/);
  await page.locator('[data-district="civic"]').click();
  await expect(page.locator('#confirmConstruction')).toBeVisible();
  await page.locator('#confirmConstruction').click();

  const saved=await stored(page);
  expect(saved.constructions.some(c=>c.playerId===0&&c.projectId==='tenement'&&c.districtId==='civic')).toBe(true);
  expect(saved.activationMainActionUsed).toBe(true);
});

test('mobile Delivery controls have usable touch targets',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const s=makeDevState();
  s.constructions=[con('C1',0,'insurance','soma')];
  await seed(page,s);
  await page.goto('/');
  await page.locator('#actionDelivery').click();
  await page.locator('[data-ds-node="pacificmail"]').click();

  for(const selector of ['#cancelDelivery','[data-hauler="dray2a"]']){
    const box=await page.locator(selector).boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(40);
  }
});

function assertDelivery(saved,id,materials){
  const c=saved.constructions.find(x=>x.id===id);
  expect(c).toBeTruthy();
  for(const m of materials)expect(c.materialsDelivered).toContain(m);
}


test('Warehouse can be the Delivery source and stored materials are not charged again',async({page})=>{
  const s=makeDevState();
  s.selectedDistrictId='northbeach';
  s.constructions=[
    con('W1',0,'warehouse','northbeach','complete',['Lumber','Masonry','Steel'],['Lumber']),
    con('C1',0,'tenement','northbeach')
  ];
  await seed(page,s);
  await page.goto('/');

  await page.locator('#actionDelivery').click();
  await page.locator('[data-ds-wh="W1"]').click();
  await page.locator('[data-hauler="standard"]').click();
  await page.locator('[data-load="Lumber"]').click();
  await page.locator('#deliveryBeginRoute').click();
  await page.locator('[data-drop-id="C1"][data-drop-type="Lumber"]').click();
  await expect(page.locator('.delivery-total')).toContainText('Материалы $0');
  await expect(page.locator('.delivery-total')).toContainText('Границы $0');
  await expect(page.locator('.delivery-total')).toContainText('ИТОГО $3');
  await page.locator('#deliveryConfirm').click();

  const saved=await stored(page);
  expect(saved.constructions.find(c=>c.id==='W1').warehouseInventory).toEqual([]);
  expect(saved.constructions.find(c=>c.id==='C1').materialsDelivered).toEqual(['Lumber']);
});

test('a complete Development round uses all 9 workers and advances cleanly to round 2',async({page})=>{
  const s=makeDevState();
  await seed(page,s);
  await page.goto('/');

  for(let i=0;i<9;i++){
    const worker=page.locator('[data-select-worker]:not([disabled])').first();
    await expect(worker).toBeVisible();
    await worker.click();
    await page.locator('#actionRaiseCapital').click();
    await page.locator('[data-district="civic"]').click();
    await expect(page.locator('#actionEndActivation')).toBeVisible();
    await page.locator('#actionEndActivation').click();
  }

  await expect(page.locator('#endRoundBtn')).toBeEnabled();
  await page.locator('#endRoundBtn').click();
  const saved=await stored(page);
  expect(saved.round).toBe(2);
  expect(saved.phase).toBe('declare');
  expect(saved.firstPlayer).toBe(1);
  expect(saved.players.every(p=>p.workersLeft===3)).toBe(true);
});

test('state survives a browser reload after Delivery',async({page})=>{
  const s=makeDevState();
  s.constructions=[con('C1',0,'insurance','soma')];
  await seed(page,s);
  await page.goto('/');

  await page.locator('#actionDelivery').click();
  await page.locator('[data-ds-node="pacificmail"]').click();
  await page.locator('[data-hauler="dray2a"]').click();
  await page.locator('[data-load="Masonry"]').click();
  await page.locator('#deliveryBeginRoute').click();
  await page.locator('[data-drop-id="C1"][data-drop-type="Masonry"]').click();
  await page.locator('#deliveryConfirm').click();

  await page.reload();
  const saved=await stored(page);
  expect(saved.constructions.find(c=>c.id==='C1').materialsDelivered).toEqual(['Masonry']);
  expect(saved.haulersUsed).toContain('dray2a');
});


test('unload targets are presented before optional route continuation',async({page})=>{
  const s=makeDevState();
  s.constructions=[con('C1',0,'insurance','soma')];
  await seed(page,s);
  await page.goto('/');
  await page.locator('#actionDelivery').click();
  await page.locator('[data-ds-node="pacificmail"]').click();
  await page.locator('[data-hauler="dray2a"]').click();
  await page.locator('[data-load="Masonry"]').click();
  await page.locator('#deliveryBeginRoute').click();
  const targets=page.locator('#deliveryTargets');
  const onward=page.locator('.route-continue-label');
  await expect(targets).toBeVisible();
  await expect(onward).toBeVisible();
  const order=await page.evaluate(()=>{
    const a=document.querySelector('#deliveryTargets');
    const b=document.querySelector('.route-continue-label');
    return !!(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(order).toBe(true);
});
