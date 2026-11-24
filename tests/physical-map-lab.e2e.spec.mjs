import {test,expect} from '@playwright/test';

test('physical map lab: all 79 slots, dimensions, drag, persistence, JSON round trip',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 await expect(page.locator('#regionLayer .region')).toHaveCount(21);
 const before=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(before.schema).toBe('sf1906-physical-slot-layout-v1');
 // Новое утверждённое исходное геометрическое состояние: авторская расстановка 110 см,
 // а не старый черновой автогрид 80 см.
 expect(before.boardWidthMm).toBe(1100);
 expect(before.districts.innersunset).toHaveLength(3);
 expect(before.districts.chinatown).toHaveLength(2);
 expect(before.districts.sunset).toHaveLength(6);
 expect(before.districts.civic).toHaveLength(5);
 expect(before.districts.marina).toHaveLength(2);
 expect(before.districts.bernal).toHaveLength(4);

 const tile=page.locator('[data-slot-id="innersunset-1"]');
 await tile.scrollIntoViewIfNeeded();
 const bounds=await tile.boundingBox();
 expect(bounds).not.toBeNull();
 await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);
 await page.mouse.down();
 await page.mouse.move(bounds.x+bounds.width*.5+33,bounds.y+bounds.height*.5+22,{steps:5});
 await page.mouse.up();
 const moved=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(Math.abs(moved.districts.innersunset[0].x-before.districts.innersunset[0].x)).toBeGreaterThan(10);
 expect(moved.districts.innersunset[0].x).not.toBe(before.districts.innersunset[0].x);

 await page.reload();
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 const persisted=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(persisted.districts.innersunset[0].x).toBe(moved.districts.innersunset[0].x);
 await page.locator('#boardWidth').selectOption('90');
 const scaled=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(scaled.boardWidthMm).toBe(900);
 expect(scaled.districts.innersunset[0].x).toBe(moved.districts.innersunset[0].x);

 const changed=structuredClone(scaled);
 changed.districts.civic[0].x+=12;
 await page.locator('#jsonArea').fill(JSON.stringify(changed));
 await page.locator('#applyJson').click();
 const imported=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(imported.districts.civic[0].x).toBe(changed.districts.civic[0].x);
 await expect(page.locator('#notice')).toContainText('Координаты загружены');
});

test('physical map lab: Civic Center selection, preview toggle and mobile-safe editor',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 await page.locator('#focusDistrict').selectOption('civic');
 await expect(page.locator('#selectedDistrictLabel')).toContainText('Civic Center');
 await expect(page.locator('#projectSelect option')).not.toHaveCount(0);
 await page.locator('#projectSelect').selectOption('polytechnic_campus');
 await page.locator('#markBuilding').click();
 await page.locator('#markComplete').click();
 const model=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(model.districts.civic.some(s=>s.status==='complete')).toBe(true);
 const htmlWidth=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
 expect(htmlWidth.content).toBeLessThanOrEqual(htmlWidth.viewport+2);
 await page.locator('#markEmpty').click();
 const empty=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(empty.districts.civic.every(s=>s.status==='empty')).toBe(true);
});
test('physical map lab: build real project on civic slot, supply, flip and persist without moving geometry',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 await expect(page.locator('#projectSelect option')).not.toHaveCount(0);
 const before=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(before.districts.civic[0].status).toBe('empty');
 await page.locator('#projectSelect').selectOption('polytechnic_campus');
 await page.locator('#ownerSelect').selectOption('1');
 await page.locator('#labMode').selectOption('build');
 await page.locator('[data-slot-id="civic-1"]').click();
 const mid=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(mid.districts.civic[0].projectId).toBe('polytechnic_campus');
 expect(mid.districts.civic[0].owner).toBe(1);
 expect(mid.districts.civic[0].status).toBe('under');
 expect(mid.districts.civic[0].x).toBe(before.districts.civic[0].x);
 expect(mid.districts.civic[0].y).toBe(before.districts.civic[0].y);
 await page.locator('#deliverOne').click();
 const partial=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(partial.districts.civic[0].delivered).toEqual(['Lumber']);
 expect(partial.districts.civic[0].status).toBe('under');
 await page.locator('#deliverAll').click();
 const completed=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(completed.districts.civic[0].status).toBe('complete');
 expect(completed.districts.civic[0].projectId).toBe('polytechnic_campus');
 expect(completed.districts.civic[0].delivered).toBeUndefined();
 await expect(page.locator('[data-slot-id="civic-1"]')).toHaveClass(/slot/);
 await page.reload();
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 const recovered=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(recovered.districts.civic[0].status).toBe('complete');
 expect(recovered.districts.civic[0].projectId).toBe('polytechnic_campus');
 expect(recovered.districts.civic[0].x).toBe(before.districts.civic[0].x);

 // Режим расстановки и тест строительства не должны смешиваться.
 await page.locator('#labMode').selectOption('build');
 await page.locator('[data-slot-id="civic-1"]').click();
 const afterClick=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(afterClick.districts.civic[0]).toEqual(recovered.districts.civic[0]);
 await page.locator('#projectSelect').selectOption('std_warehouse');
 await page.locator('#markBuilding').click();
 const notOverwritten=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(notOverwritten.districts.civic[0].projectId).toBe('polytechnic_campus');
});

test('physical map lab: JSON roundtrip retains project ID and materials, old v1 geometry imports',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 await expect(page.locator('#projectSelect option')).not.toHaveCount(0);
 await page.locator('#focusDistrict').selectOption('innersunset');
 await page.locator('#projectSelect').selectOption('std_warehouse');
 await page.locator('#markBuilding').click();
 await page.locator('#deliverOne').click();
 const withBuilding=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(withBuilding.districts.innersunset[0].projectId).toBe('std_warehouse');
 expect(withBuilding.districts.innersunset[0].delivered).toEqual(['Lumber']);
 await page.locator('#jsonArea').fill(JSON.stringify(withBuilding));
 await page.locator('#applyJson').click();
 const imported=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(imported.districts.innersunset[0].delivered).toEqual(['Lumber']);
 // Старый экспорт физической геометрии имеет status/owner, но не projectId.
 const oldGeometry=structuredClone(imported);
 for(const records of Object.values(oldGeometry.districts))for(const item of records){
  delete item.projectId;delete item.delivered;item.status='empty';
 }
 await page.locator('#jsonArea').fill(JSON.stringify(oldGeometry));
 await page.locator('#applyJson').click();
 const oldImported=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(oldImported.districts.innersunset[0].projectId).toBeUndefined();
 expect(oldImported.districts.innersunset[0].status).toBe('empty');
 expect(oldImported.districts.innersunset[0].x).toBe(withBuilding.districts.innersunset[0].x);
});

test('physical map lab: full tile stress test and restore author layout',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 await expect(page.locator('#projectSelect option')).not.toHaveCount(0);
 await page.locator('#projectSelect').selectOption('residential_quarter');
 await page.locator('#fillAll').click();
 const filled=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 const all=Object.values(filled.districts).flat();
 expect(all).toHaveLength(79);
 expect(all.every(t=>t.status==='complete'&&t.projectId==='residential_quarter')).toBe(true);
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#loadAuthorLayout').click();
 await expect(page.locator('#notice')).toContainText('восстановлена');
 const restored=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(restored.boardWidthMm).toBe(1100);
 expect(Object.values(restored.districts).flat().every(t=>t.status==='empty')).toBe(true);
 expect(restored.districts.civic).toHaveLength(5);
});
