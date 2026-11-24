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

test('physical map lab: changing square/hex/oct preserves all 79 coordinates and angles across reload',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 const before=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(before.tileShape).toBe('square');
 const coordinates=model=>Object.entries(model.districts).flatMap(([district,items])=>
  items.map(item=>[district,item.slot,item.x,item.y]));
 await page.locator('#tileShape').selectOption('hex');
 expect((await page.evaluate(()=>window.__physicalMapLab.snapshot())).tileShape).toBe('hex');
 await expect(page.locator('#slotLayer [data-shape="hex"]')).toHaveCount(79);
 await page.locator('#focusDistrict').selectOption('civic');
 await page.locator('#rotateRight').click();
 await expect(page.locator('#angleValue')).toHaveText('5°');
 await page.locator('#slotRotation').evaluate(el=>{el.value='23';el.dispatchEvent(new Event('input',{bubbles:true}))});
 await expect(page.locator('#angleValue')).toHaveText('23°');
 const hex=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(hex.districts.civic[0].rotation).toBe(23);
 expect(coordinates(hex)).toEqual(coordinates(before));
 await page.locator('#tileShape').selectOption('oct');
 await expect(page.locator('#slotLayer [data-shape="oct"]')).toHaveCount(79);
 await expect(page.locator('[data-slot-id="civic-1"] circle.owner-seat')).toHaveCount(8);
 const oct=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(oct.districts.civic[0].rotation).toBe(23);
 expect(coordinates(oct)).toEqual(coordinates(before));
 await page.reload();
 await expect(page.locator('#tileShape')).toHaveValue('oct');
 await expect(page.locator('#angleValue')).toHaveText('23°');
 expect(coordinates(await page.evaluate(()=>window.__physicalMapLab.snapshot()))).toEqual(coordinates(before));
 await page.locator('#tileShape').selectOption('square');
 await expect(page.locator('#slotLayer [data-shape="square"]')).toHaveCount(79);
 await expect(page.locator('#slotRotation')).toBeDisabled();
 const square=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(square.districts.civic[0].rotation).toBe(23);
 expect(coordinates(square)).toEqual(coordinates(before));
 await page.locator('#tileShape').selectOption('hex');
 await page.locator('#rotateReset').click();
 expect((await page.evaluate(()=>window.__physicalMapLab.snapshot())).districts.civic[0].rotation).toBe(0);
});

test('physical map lab: polygons have exactly one ownership window for all five players and neutral',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 await page.locator('#focusDistrict').selectOption('civic');
 await page.locator('#tileShape').selectOption('hex');
 await page.locator('#projectSelect').selectOption('polytechnic_campus');
 await page.locator('#ownerSelect').selectOption('4');
 await page.locator('#markBuilding').click();
 const tile=page.locator('[data-slot-id="civic-1"]');
 await expect(tile.locator('circle.owner-seat')).toHaveCount(6);
 await expect(tile.locator('[data-notch-owner="4"]')).toHaveCount(1);
 await expect(tile.locator('rect.owner-mark')).toHaveCount(0);
 const hexAngle=await tile.locator('[data-notch-owner]').getAttribute('transform');
 expect(hexAngle).toMatch(/^rotate\(240 /);
 await page.locator('#tileShape').selectOption('oct');
 await expect(tile.locator('circle.owner-seat')).toHaveCount(8);
 await expect(tile.locator('[data-notch-owner="4"]')).toHaveCount(1);
 expect(await tile.locator('[data-notch-owner]').getAttribute('transform')).toMatch(/^rotate\(180 /);
 const after=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(after.districts.civic[0].owner).toBe(4);
 expect(after.districts.civic[0].projectId).toBe('polytechnic_campus');
 await page.locator('#markEmpty').click();
 await page.locator('#ownerSelect').selectOption('5');
 await page.locator('#markBuilding').click();
 await expect(tile.locator('[data-notch-owner="5"]')).toHaveCount(1);
 await expect(tile.locator('circle.owner-seat')).toHaveCount(8);
 await page.locator('#deliverAll').click();
 await expect(tile.locator('.tile-done')).toHaveCount(1);
 await expect(tile.locator('[data-notch-owner="5"]')).toHaveCount(1);
});

test('physical map lab: shape-aware gap validation and old JSON without shape/angle',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 const old=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 delete old.tileShape;
 for(const items of Object.values(old.districts))for(const item of items)delete item.rotation;
 await page.locator('#tileShape').selectOption('oct');
 await page.locator('#jsonArea').fill(JSON.stringify(old));
 await page.locator('#applyJson').click();
 const imported=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(imported.tileShape).toBe('square');
 expect(imported.districts.civic[0].rotation).toBe(0);
 expect(imported.districts.civic[0].x).toBe(old.districts.civic[0].x);
 const customized=structuredClone(imported);
 const a=customized.districts.civic[0],b=customized.districts.civic[1];
 const s=1536*40/customized.boardWidthMm;
 // Bounding squares overlap strongly, but their circumradius-20-mm polygons at this diagonal separation do not.
 b.x=a.x+s*.9;b.y=a.y+s*.9;
 await page.locator('#jsonArea').fill(JSON.stringify(customized));
 await page.locator('#applyJson').click();
 const squares=await page.evaluate(()=>window.__physicalMapLab.validation());
 expect(squares.pairIds).toContain('civic-1|civic-2');
 await page.locator('#tileShape').selectOption('hex');
 const polygon=await page.evaluate(()=>window.__physicalMapLab.validation());
 expect(polygon.pairIds).not.toContain('civic-1|civic-2');
 // Identical coordinates must be rejected by the polygon intersection calculation.
 const stacked=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 stacked.districts.civic[1].x=stacked.districts.civic[0].x;
 stacked.districts.civic[1].y=stacked.districts.civic[0].y;
 await page.locator('#jsonArea').fill(JSON.stringify(stacked));
 await page.locator('#applyJson').click();
 expect((await page.evaluate(()=>window.__physicalMapLab.validation())).pairIds).toContain('civic-1|civic-2');
});

test('physical map lab: geometry reset preserves chosen polygon shape, and rotation works on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 await page.locator('#tileShape').selectOption('oct');
 await page.locator('#focusDistrict').selectOption('innersunset');
 await page.locator('#rotateRight').click();
 expect((await page.evaluate(()=>window.__physicalMapLab.snapshot())).districts.innersunset[0].rotation).toBe(5);
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#loadAuthorLayout').click();
 const restored=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(restored.tileShape).toBe('oct');
 expect(restored.districts.innersunset[0].rotation).toBe(0);
 expect(restored.boardWidthMm).toBe(1100);
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 const htmlWidth=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
 expect(htmlWidth.content).toBeLessThanOrEqual(htmlWidth.viewport+2);
});
