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

function assertDelivery(saved,id,materials){
  const con=saved.constructions.find(x=>x.id===id);
  expect(con).toBeTruthy();
  for(const material of materials)expect(con.materialsDelivered).toContain(material);
}

test('fresh game UI can complete draft handoff and reach Development without dead controls',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.version-badge')).toHaveText('v0.29.1');
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
  await expect(page.locator('.delivery-cargo-status')).toContainText('К 0');
  await expect(page.locator('.delivery-cargo-status')).toContainText('С 1');
  await page.locator('[data-drop-id="C1"][data-drop-type="Steel"]').click();
  await expect(page.locator('.delivery-cargo-status')).toContainText('С 0');
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

test('mobile Delivery starts map-first and source list is only an optional fallback',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const s=makeDevState();
  s.constructions=[con('C1',0,'insurance','soma')];
  await seed(page,s);
  await page.goto('/');

  await page.locator('#actionDelivery').click();
  await expect(page.locator('#deliveryPanel')).toHaveClass(/mobile-map-source/);
  await expect(page.locator('#deliveryShowSourceList')).toBeVisible();
  await expect(page.locator('[data-ds-node="pacificmail"]')).toHaveCount(0);
  await expect(page.locator('[data-delivery-node="pacificmail"]')).toHaveClass(/source-available/);

  const promptBox=await page.locator('#deliveryPanel').boundingBox();
  expect(promptBox).not.toBeNull();
  expect(promptBox.height).toBeLessThan(150);

  await page.locator('#deliveryShowSourceList').click();
  await expect(page.locator('[data-ds-node="pacificmail"]')).toBeVisible();
  await page.locator('#deliveryHideSourceList').click();
  await expect(page.locator('[data-ds-node="pacificmail"]')).toHaveCount(0);

  await page.locator('[data-delivery-node="pacificmail"]').click();
  for(const selector of ['#cancelDelivery','[data-hauler="dray2a"]']){
    const box=await page.locator(selector).boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(40);
  }
});

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


test('logistics markers show Russian types and centers remain inside their gameplay districts',async({page})=>{
  const s=makeDevState();
  await seed(page,s);
  await page.goto('/');
  const expected=[
    ['broadway','northbeach','Порт'],
    ['pacificmail','soma','Порт + ж/д'],
    ['southernpacific','soma','Ж/д станция'],
    ['chinabasin','missionbay','Порт + ж/д'],
    ['unioniron','potrero','Порт + ж/д · промышленный']
  ];
  for(const [nodeId,districtId,label] of expected){
    const node=page.locator('[data-delivery-node="'+nodeId+'"]');
    await expect(node).toBeVisible();
    await expect(node.locator('.node-type')).toHaveText(label);
    const inside=await page.evaluate(({nodeId,districtId})=>{
      const node=document.querySelector('[data-delivery-node="'+nodeId+'"]');
      const path=document.querySelector('[data-district="'+districtId+'"] path');
      if(!node||!path||typeof path.isPointInFill!=='function')return false;
      const root=document.querySelector('.city-board');
      const p=root.createSVGPoint();
      const m=node.getCTM();
      p.x=m.e;p.y=m.f;
      const local=p.matrixTransform(path.getCTM().inverse());
      return path.isPointInFill(local);
    },{nodeId,districtId});
    expect(inside,nodeId+' center must stay inside '+districtId).toBe(true);
  }
});

test('Delivery source cards expose Russian node type and profile without losing names',async({page})=>{
  const s=makeDevState();
  await seed(page,s);
  await page.goto('/');
  await page.locator('#actionDelivery').click();
  const pacific=page.locator('[data-ds-node="pacificmail"]');
  await expect(pacific).toContainText('Pacific Mail');
  await expect(pacific).toContainText('Порт + ж/д');
  await expect(pacific).toContainText('Д 40% · К 40% · С 20%');
  const union=page.locator('[data-ds-node="unioniron"]');
  await expect(union).toContainText('Union Iron Works');
  await expect(union).toContainText('Порт + ж/д · промышленный');
  await expect(union).toContainText('Д 20% · К 25% · С 55%');
});

test('persistent object overview keeps active objects visible and player pills open Office',async({page})=>{
  const s=makeDevState();
  s.constructions=[
    con('C1',0,'insurance','soma','under-construction',['Masonry']),
    con('W1',0,'warehouse','soma','complete',['Lumber','Masonry','Steel'],['Lumber','Steel']),
    con('C2',1,'tenement','northbeach','under-construction',['Lumber'])
  ];
  await seed(page,s);
  await page.goto('/');

  const overview=page.locator('#cityOverviewPanel');
  await expect(overview).toHaveClass(/active/);
  await expect(overview).toContainText('Объекты: Синий');
  await expect(overview).toContainText('Страховая компания');
  await expect(overview).toContainText('Склад');

  await page.locator('.player-pill[data-office="1"]').click();
  await expect(page.locator('#officeDrawer')).toHaveClass(/open/);
  await expect(page.locator('#officeTitle')).toContainText('Красный');
  await expect(page.locator('#showOfficeObjectsMap')).toBeVisible();
  await page.locator('#showOfficeObjectsMap').click();

  await expect(page.locator('#officeDrawer')).not.toHaveClass(/open/);
  await expect(overview).toContainText('Просмотр: Красный');
  await expect(overview).toContainText('Рабочий доходный дом');
  await page.locator('#overviewBackActive').click();
  await expect(overview).toContainText('Объекты: Синий');
});

test('clicking overview construction focuses its district and map token',async({page})=>{
  const s=makeDevState();
  s.selectedDistrictId='civic';
  s.constructions=[con('C1',0,'insurance','soma','under-construction',['Masonry'])];
  await seed(page,s);
  await page.goto('/');

  await page.locator('[data-overview-construction="C1"]').click();
  await expect(page.locator('[data-construction-token="C1"]')).toHaveClass(/focus-pulse/);
  await expect(page.locator('#contextPanel')).toContainText('SoMa');
  await expect(page.locator('.focused-object-detail')).toContainText('Страховая компания');
  await expect(page.locator('.focused-object-detail')).toContainText('Нужно: Камень ×1, Сталь ×1');
  const saved=await stored(page);
  expect(saved.selectedDistrictId).toBe('soma');
});

test('project cards surface requirements before starting construction',async({page})=>{
  const s=makeDevState();
  s.players[0].portfolio=['luxury'];
  await seed(page,s);
  await page.goto('/');
  await page.locator('#officeBtn').click();

  const card=page.locator('.hand-card').filter({hasText:'Роскошные апартаменты'});
  await expect(card.locator('.card-requirement-band')).toBeVisible();
  await expect(card.locator('.card-requirement-band')).toContainText('Стоимость земли 3+');
  await expect(card.locator('.card-requirement-band')).toContainText('Пожарная защита');
});

test('construction choice marks reachable legal green, reachable illegal red and unreachable dim',async({page})=>{
  const s=makeDevState();
  s.players[0].portfolio=['luxury'];
  const w=s.players[0].workers[0];
  w.districtId='civic';
  s.activeWorkerId=w.id;
  s.constructions=[
    con('FIRE',0,'firehouse','civic','complete',['Lumber','Masonry','Steel']),
    con('WH-PAC',0,'warehouse','pacific','complete',['Lumber','Masonry','Steel'],[])
  ];
  await seed(page,s);
  await page.goto('/');

  await page.locator('#officeBtn').click();
  await page.locator('[data-start-project="luxury"]').click();

  await expect(page.locator('[data-district="pacific"]')).toHaveClass(/build-ok/);
  await expect(page.locator('[data-district="western"]')).toHaveClass(/build-blocked/);
  await expect(page.locator('[data-district="outerrichmond"]')).toHaveClass(/build-dim/);
});

test('available main and building actions are visibly highlighted including Shopping Row',async({page})=>{
  const s=makeDevState();
  const w=s.players[0].workers[0];
  w.districtId='soma';
  s.activeWorkerId=w.id;
  s.players[0].portfolio=['tenement'];
  s.constructions=[
    con('SHOP',1,'shops','soma','complete',['Lumber','Masonry','Masonry']),
    con('C1',0,'insurance','soma','under-construction',['Masonry'])
  ];
  await seed(page,s);
  await page.goto('/');

  await expect(page.locator('#actionBuild')).toHaveClass(/action-available/);
  await expect(page.locator('#actionRaiseCapital')).toHaveClass(/action-available/);
  await expect(page.locator('.shops-card')).toHaveClass(/action-available/);
  await expect(page.locator('[data-shops-action="SHOP"]')).toHaveClass(/available-action/);

  await page.locator('[data-shops-action="SHOP"]').click();
  await expect(page.locator('#cityOverviewPanel')).toContainText('Закупка активна: 2');
  const saved=await stored(page);
  expect(saved.procurementRemaining).toBe(2);
});

test('warehouse map marker always shows compact inventory without enlarging the token',async({page})=>{
  const s=makeDevState();
  s.constructions=[con('W1',0,'warehouse','soma','complete',['Lumber','Masonry','Steel'],['Lumber','Masonry','Steel'])];
  await seed(page,s);
  await page.goto('/');

  const marker=page.locator('[data-construction-token="W1"]');
  await expect(marker.locator('.warehouse-token-title')).toHaveText('СКЛ 3/5');
  await expect(marker.locator('.warehouse-token-stock')).toHaveText('Д1 К1 С1');
  const rect=await marker.locator('rect').evaluate(el=>({w:+el.getAttribute('width'),h:+el.getAttribute('height')}));
  expect(rect.w).toBeLessThanOrEqual(62);
  expect(rect.h).toBeLessThanOrEqual(38);
});

test('portrait mobile keeps objects in the top HUD and player taps still open Office',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const s=makeDevState();
  s.constructions=[
    con('C1',0,'insurance','soma','under-construction',['Masonry']),
    con('W1',0,'warehouse','soma','complete',['Lumber','Masonry','Steel'],['Lumber','Steel']),
    con('C2',1,'tenement','northbeach','under-construction',['Lumber'])
  ];
  await seed(page,s);
  await page.goto('/');

  await expect(page.locator('#cityOverviewPanel')).toBeHidden();
  const strip=page.locator('#mobileObjectStrip');
  await expect(strip).toBeVisible();
  await expect(strip).toContainText('Объекты: Синий');
  await expect(strip).toContainText('Страховая компания');
  await expect(strip).toContainText('Склад · SoMa');

  const layout=await page.evaluate(()=>{
    const strip=document.querySelector('#mobileObjectStrip').getBoundingClientRect();
    const help=document.querySelector('#helpBtn').getBoundingClientRect();
    const players=[...document.querySelectorAll('.player-pill')].map(x=>x.getBoundingClientRect());
    return {
      pageWidth:document.documentElement.scrollWidth,
      viewport:window.innerWidth,
      aligned:Math.abs(strip.top-help.top)<=2&&Math.abs(strip.bottom-help.bottom)<=2,
      playersInside:players.every(r=>r.left>=-1&&r.right<=window.innerWidth+1)
    };
  });
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport+1);
  expect(layout.aligned).toBe(true);
  expect(layout.playersInside).toBe(true);

  await page.locator('.player-pill[data-office="1"]').click();
  await expect(page.locator('#officeDrawer')).toHaveClass(/open/);
  await expect(page.locator('#officeTitle')).toContainText('Красный');
  await page.locator('#showOfficeObjectsMap').click();
  await expect(strip).toContainText('Просмотр: Красный');
  await expect(strip).toContainText('Рабочий доходный дом');
  await page.locator('#mobileObjectsBack').click();
  await expect(strip).toContainText('Объекты: Синий');

  await page.locator('[data-mobile-object="C1"]').click();
  await expect(page.locator('#cityBoardScroll')).toHaveClass(/detail/);
  await expect(page.locator('#contextPanel')).toHaveClass(/mobile-open/);
  await expect(page.locator('.focused-object-detail')).toContainText('Страховая компания');
});



test('landscape mobile keeps HUD compact and Delivery map-first',async({page})=>{
  await page.setViewportSize({width:844,height:390});
  const s=makeDevState();
  s.constructions=[
    con('C1',0,'tenement','pacific','under-construction',[]),
    con('W1',0,'warehouse','soma','complete',['Lumber','Masonry','Steel'],['Steel'])
  ];
  await seed(page,s);
  await page.goto('/');

  const strip=page.locator('#mobileObjectStrip');
  await expect(strip).toBeVisible();
  const before=await page.evaluate(()=>{
    const nav=document.querySelector('.nav-rail').getBoundingClientRect();
    const top=document.querySelector('.topbar').getBoundingClientRect();
    const players=document.querySelector('#playersBar').getBoundingClientRect();
    return {
      pageWidth:document.documentElement.scrollWidth,
      viewport:window.innerWidth,
      navPosition:getComputedStyle(document.querySelector('.nav-rail')).position,
      topHeight:top.height,
      playersHeight:players.height,
      navTop:nav.top
    };
  });
  expect(before.pageWidth).toBeLessThanOrEqual(before.viewport+1);
  expect(before.navPosition).toBe('fixed');
  expect(before.topHeight+before.playersHeight).toBeLessThan(150);
  expect(before.navTop).toBeGreaterThan(300);

  await page.locator('#actionDelivery').click();
  await expect(page.locator('#deliveryShowSourceList')).toBeVisible();
  await expect(page.locator('[data-ds-node="broadway"]')).toHaveCount(0);
  const sourcePanel=await page.locator('#deliveryPanel').boundingBox();
  expect(sourcePanel.height).toBeLessThan(135);

  await page.locator('[data-delivery-node="broadway"]').click();
  await page.locator('[data-hauler="dray2a"]').click();
  await page.locator('[data-load="Lumber"]').click();
  await page.locator('#deliveryBeginRoute').click();

  await expect(page.locator('#deliveryPanel')).toHaveClass(/mobile-map-route/);
  await expect(page.locator('[data-route-next="pacific"]')).toHaveCount(0);
  await expect(page.locator('[data-district="pacific"]')).toHaveClass(/delivery-next/);
  await page.locator('[data-district="pacific"]').click();
  await expect(page.locator('.delivery-route-strip')).toContainText('Pacific');
});

test('wide landscape phone remains mobile at 932x430 without page overflow',async({page})=>{
  await page.setViewportSize({width:932,height:430});
  const s=makeDevState();
  s.constructions=[con('C1',0,'insurance','soma','under-construction',['Masonry'])];
  await seed(page,s);
  await page.goto('/');

  await expect(page.locator('#mobileObjectStrip')).toBeVisible();
  const layout=await page.evaluate(()=>({
    pageWidth:document.documentElement.scrollWidth,
    viewport:window.innerWidth,
    nav:getComputedStyle(document.querySelector('.nav-rail')).position,
    strip:getComputedStyle(document.querySelector('#mobileObjectStrip')).display
  }));
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport+1);
  expect(layout.nav).toBe('fixed');
  expect(layout.strip).not.toBe('none');
});

test('exhaustive worker adjacency highlighting matches the locked graph',async({page})=>{
  const adjacency={
    presidio:['outerrichmond','innerrichmond','western','pacific','marina'],
    marina:['presidio','pacific','northbeach'],
    northbeach:['marina','pacific','chinatown','financial'],
    chinatown:['northbeach','financial','pacific'],
    pacific:['presidio','marina','northbeach','chinatown','financial','civic','western'],
    financial:['northbeach','chinatown','pacific','civic','soma'],
    soma:['financial','civic','mission','missionbay'],
    civic:['pacific','western','financial','soma','haight','mission'],
    western:['presidio','innerrichmond','pacific','civic','haight','park'],
    innerrichmond:['presidio','outerrichmond','western','park'],
    outerrichmond:['presidio','innerrichmond','park'],
    haight:['park','western','civic','innersunset','mission'],
    innersunset:['park','sunset','haight','mission','noe','twinpeaks'],
    sunset:['park','innersunset','twinpeaks'],
    mission:['soma','civic','haight','innersunset','noe','bernal','missionbay','potrero'],
    missionbay:['soma','mission','potrero'],
    potrero:['missionbay','mission','bernal'],
    noe:['innersunset','mission','bernal','twinpeaks'],
    bernal:['mission','noe','potrero'],
    park:['outerrichmond','innerrichmond','western','haight','innersunset','sunset'],
    twinpeaks:['innersunset','sunset','noe']
  };
  const closed=new Set(['presidio','twinpeaks']);
  await page.goto('/');
  for(const [from,neighbors] of Object.entries(adjacency)){
    if(closed.has(from))continue;
    const s=makeDevState();
    const w=s.players[0].workers[0];
    w.districtId=from;
    s.activeWorkerId=w.id;
    await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:STORAGE_KEY,value:JSON.stringify(s)});
    await page.reload();
    await page.locator('#actionRaiseCapital').click();
    const expected=new Set([from,...neighbors.filter(x=>!closed.has(x))]);
    for(const id of Object.keys(adjacency)){
      const district=page.locator('[data-district="'+id+'"]');
      if(expected.has(id)){
        await expect(district,from+' -> '+id).toHaveClass(/move-target/);
        const visual=await district.locator('path').evaluate(el=>{
          const s=getComputedStyle(el);
          return {stroke:s.stroke,strokeWidth:parseFloat(s.strokeWidth),fill:s.fill};
        });
        expect(visual.strokeWidth,from+' -> '+id+' visible stroke').toBeGreaterThanOrEqual(6);
      }else{
        await expect(district,from+' x '+id).not.toHaveClass(/move-target/);
      }
    }
  }
});
