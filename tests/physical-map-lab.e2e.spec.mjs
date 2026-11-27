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
 await page.locator('#focusDistrict').selectOption('civic');
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
 // Clicking schedules an async fetch; assert the completed import, not an intermediate state.
 await expect(page.locator('#notice')).toContainText('восстановлена');
 const restored=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(restored.tileShape).toBe('oct');
 expect(restored.districts.innersunset[0].rotation).toBe(0);
 expect(restored.boardWidthMm).toBe(1100);
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 const htmlWidth=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
 expect(htmlWidth.content).toBeLessThanOrEqual(htmlWidth.viewport+2);
});

test('physical map lab: size control changes each shape independently in 1 mm steps without moving 79 centers',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 await expect(page.locator('#tileSize')).toHaveValue('40');
 const before=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 const coords=m=>Object.entries(m.districts).flatMap(([district,items])=>items.map(t=>[district,t.slot,t.x,t.y]));
 const centerOf=()=>page.locator('[data-slot-id="civic-1"]').evaluate(el=>{
  const size=Number(el.querySelector('polygon')?.getAttribute('points')?.split(' ')[0]?.split(',')[1]);
  const g=el.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);
  const poly=el.querySelector('polygon');
  const bb=poly?.getBBox();
  return bb?{x:Number(g[1])+bb.x+bb.width/2,y:Number(g[2])+bb.y+bb.height/2}:null;
 });
 await page.locator('#tileShape').selectOption('hex');
 const mid=centerOf();
 const beforeCenter=await mid;
 await page.locator('#tileSizeUp').click();
 await expect(page.locator('#tileSize')).toHaveValue('41');
 await page.locator('#tileSizeDown').click();
 await expect(page.locator('#tileSize')).toHaveValue('40');
 await page.locator('#tileSizeRange').evaluate(el=>{el.value='52';el.dispatchEvent(new Event('input',{bubbles:true}))});
 await expect(page.locator('#tileSize')).toHaveValue('52');
 await page.locator('#tileSize').fill('55');
 await page.locator('#tileSize').press('Tab');
 await expect(page.locator('#tileSize')).toHaveValue('55');
 const afterCenter=await centerOf();
 expect(afterCenter.x).toBeCloseTo(beforeCenter.x,2);
 expect(afterCenter.y).toBeCloseTo(beforeCenter.y,2);
 const hex=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(hex.tileSizesMm).toEqual({square:40,hex:55,oct:40});
 expect(coords(hex)).toEqual(coords(before));
 expect(hex.districts.civic[0].rotation).toBe(before.districts.civic[0].rotation);
 await page.locator('#tileShape').selectOption('oct');
 await expect(page.locator('#tileSize')).toHaveValue('40');
 await page.locator('#tileSizeUp').click();
 await expect(page.locator('#tileSize')).toHaveValue('41');
 await page.locator('#tileShape').selectOption('square');
 await expect(page.locator('#tileSize')).toHaveValue('40');
 await page.locator('#tileShape').selectOption('hex');
 await expect(page.locator('#tileSize')).toHaveValue('55');
 await page.reload();
 await expect(page.locator('#tileShape')).toHaveValue('hex');
 await expect(page.locator('#tileSize')).toHaveValue('55');
 const restored=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(restored.tileSizesMm).toEqual({square:40,hex:55,oct:41});
 expect(coords(restored)).toEqual(coords(before));
});

test('physical map lab: resized polygons use actual contour for gap and keep old JSON import compatible',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 const initial=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 const crafted=structuredClone(initial);
 const a=crafted.districts.civic[0],b=crafted.districts.civic[1];
 b.x=a.x+1536*43/crafted.boardWidthMm;
 b.y=a.y;
 await page.locator('#jsonArea').fill(JSON.stringify(crafted));
 await page.locator('#applyJson').click();
 await page.locator('#tileShape').selectOption('hex');
 expect((await page.evaluate(()=>window.__physicalMapLab.validation())).pairIds).not.toContain('civic-1|civic-2');
 await page.locator('#tileSize').fill('50');
 await page.locator('#tileSize').press('Tab');
 expect((await page.evaluate(()=>window.__physicalMapLab.validation())).pairIds).toContain('civic-1|civic-2');
 // Reverting restores the previous no-overlap state without moving the original coordinates.
 await page.locator('#tileSizeDown').click();
 await page.locator('#tileSize').fill('40');
 await page.locator('#tileSize').press('Tab');
 expect((await page.evaluate(()=>window.__physicalMapLab.validation())).pairIds).not.toContain('civic-1|civic-2');
 const exported=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 const old=structuredClone(exported);
 delete old.tileSizesMm;
 await page.locator('#jsonArea').fill(JSON.stringify(old));
 await page.locator('#applyJson').click();
 expect((await page.evaluate(()=>window.__physicalMapLab.snapshot())).tileSizesMm).toEqual({square:40,hex:40,oct:40});
 const malformed=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 malformed.tileSizesMm.hex=71;
 await page.locator('#jsonArea').fill(JSON.stringify(malformed));
 await page.locator('#applyJson').click();
 await expect(page.locator('#notice')).toContainText('Некорректный размер тайла');
 expect((await page.evaluate(()=>window.__physicalMapLab.snapshot())).tileSizesMm.hex).toBe(40);
});

test('physical map lab: size persists on author-layout reset and mobile controls stay accessible',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 await page.locator('#tileShape').selectOption('oct');
 await page.locator('#tileSize').fill('60');
 await page.locator('#tileSize').press('Tab');
 await expect(page.locator('#dimensions')).toContainText('60 мм');
 await page.locator('#focusDistrict').selectOption('civic');
 await page.locator('#rotateRight').click();
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#loadAuthorLayout').click();
 await expect(page.locator('#notice')).toContainText('восстановлена');
 const restored=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(restored.tileShape).toBe('oct');
 expect(restored.tileSizesMm.oct).toBe(60);
 expect(restored.districts.civic[0].rotation).toBe(0);
 expect(restored.boardWidthMm).toBe(1100);
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 const fullWidth=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
 expect(fullWidth.content).toBeLessThanOrEqual(fullWidth.viewport+2);
});

test('physical board editor: independent physical dimensions, scale, crop warnings and legacy JSON',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 const snap=()=>page.evaluate(()=>window.__physicalMapLab.snapshot());
 const original=await snap();
 await page.locator('#presetScythe').click();
 const sized=await snap();
 expect(sized.boardWidthMm).toBe(800);
 expect(sized.boardFrame.heightMm).toBe(600);
 expect(sized.districts).toEqual(original.districts);
 const board=await page.evaluate(()=>window.__physicalMapLab.board());
 expect(board.viewport.w/board.viewport.h).toBeCloseTo(4/3,6);
 await page.locator('#boardWidthExact').fill('83');
 await page.locator('#boardWidthExact').press('Tab');
 expect((await snap()).boardWidthMm).toBe(830);
 expect((await snap()).boardFrame.heightMm).toBe(600);
 await page.locator('#mapMagnification').fill('120');
 await page.locator('#mapMagnification').press('Tab');
 const scale=await page.evaluate(()=>window.__physicalMapLab.board());
 expect(scale.unitsPerMm).toBeCloseTo(1536/830/1.2,6);
 await page.locator('#frameX').fill('500');
 await page.locator('#frameX').press('Tab');
 expect((await page.evaluate(()=>window.__physicalMapLab.validation())).edge.length).toBeGreaterThan(0);
 await page.reload();
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 expect((await snap()).boardFrame.xMm).toBe(500);
 const old=structuredClone(original);delete old.boardFrame;
 await page.locator('#jsonArea').fill(JSON.stringify(old));
 await page.locator('#applyJson').click();
 expect((await snap()).boardFrame.heightMm).toBeNull();
 expect((await snap()).boardFrame.magnification).toBe(100);
 expect((await snap()).districts).toEqual(original.districts);
 const invalid=await snap();invalid.boardFrame.magnification=0;
 await page.locator('#jsonArea').fill(JSON.stringify(invalid));
 await page.locator('#applyJson').click();
 await expect(page.locator('#notice')).toContainText('Некорректная композиция');
 expect((await snap()).boardFrame.magnification).toBe(100);
});

test('physical board editor: move district and slots, edit closed districts, export/import',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 const snap=()=>page.evaluate(()=>window.__physicalMapLab.snapshot());
 const initial=await snap();
 await page.locator('#mapBackground').selectOption('schematic');
 await expect(page.locator('#originalMapImage')).toBeHidden();
 await expect(page.locator('#districtLabels text')).toHaveCount(21);
 await page.locator('#editDistrict').selectOption('civic');
 await page.locator('#districtRight').click();
 const moved=await snap();
 expect(moved.districts.civic[0].x).toBeCloseTo(initial.districts.civic[0].x+1536*5/1100,2);
 expect(moved.districts.mission).toEqual(initial.districts.mission);
 expect(moved.boardFrame.contours.civic.length).toBeGreaterThan(3);
 await page.locator('#moveDistrictSlots').uncheck();
 await page.locator('#districtNarrow').click();
 expect((await snap()).districts.civic).toEqual(moved.districts.civic);
 await page.locator('#editDistrict').selectOption('presidio');
 await page.locator('#editVertices').check();
 const vertex=page.locator('#vertexLayer [data-vertex="0"]');
 await vertex.scrollIntoViewIfNeeded();
 const b=await vertex.boundingBox();
 expect(b).not.toBeNull();
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);
 await page.mouse.down();
 await page.mouse.move(b.x+b.width/2+20,b.y+b.height/2+12,{steps:3});
 await page.mouse.up();
 const changed=await snap();
 expect(changed.boardFrame.contours.presidio.length).toBeGreaterThan(3);
 expect(changed.districts).toEqual(moved.districts);
 await page.locator('#jsonArea').fill(JSON.stringify(changed));
 await page.locator('#applyJson').click();
 expect((await snap()).boardFrame).toEqual(changed.boardFrame);
 await page.locator('#resetDistrict').click();
 expect((await snap()).boardFrame.contours.presidio).toBeUndefined();
 expect((await snap()).boardFrame.contours.civic).toBeDefined();
});

test('physical board editor: hex reference, fit frame, zones and corner window on mobile',async({page})=>{
 for(const size of [{width:390,height:844},{width:932,height:430}]){
  await page.setViewportSize(size);
  await page.goto('/physical-map-lab.html');
  await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
  page.once('dialog',d=>d.accept());
  await page.locator('#loadHexLayout').click();
  await expect(page.locator('#notice')).toContainText('HEX 50 мм восстановлена');
  await expect(page.locator('#tileSize')).toHaveValue('50');
  await page.locator('#zoneTop').fill('25');
  await page.locator('#zoneTop').press('Tab');
  await page.locator('#fitBuildings').click();
  const v=await page.evaluate(()=>window.__physicalMapLab.validation());
  expect(v.edge).toEqual([]);
  expect(v.reserved).toEqual([]);
  await page.locator('#ownershipCut').selectOption('corner');
  await page.locator('#focusDistrict').selectOption('civic');
  await page.locator('#projectSelect').selectOption('polytechnic_campus');
  await page.locator('#markBuilding').click();
  const tile=page.locator('[data-slot-id="civic-1"]');
  await expect(tile.locator('circle.owner-seat')).toHaveCount(6);
  const path=await tile.locator('path.tile').getAttribute('d');
  expect((path.match(/ L /g)||[]).length).toBe(6);
  await page.locator('#cornerCutMm').fill('5');
  await page.locator('#cornerCutMm').press('Tab');
  expect(await tile.locator('path.tile').getAttribute('d')).not.toBe(path);
  const htmlWidth=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(htmlWidth.content).toBeLessThanOrEqual(htmlWidth.viewport+2);
 }
});

test('physical board editor: logistics footprints use current catalog, are editable and validated',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 await page.locator('#mapBackground').selectOption('schematic');
 await expect(page.locator('#nodeLayer [data-node-id]')).toHaveCount(8);
 await page.locator('#editNode').selectOption('broadway');
 await page.locator('#nodeW').fill('45');await page.locator('#nodeW').press('Tab');
 await page.locator('#nodeH').fill('24');await page.locator('#nodeH').press('Tab');
 await page.locator('#nodeX').fill('1300');await page.locator('#nodeX').press('Tab');
 const snap=()=>page.evaluate(()=>window.__physicalMapLab.snapshot());
 const edited=await snap();
 expect(edited.boardFrame.nodes.broadway.w).toBe(45);
 expect(edited.boardFrame.nodes.broadway.h).toBe(24);
 expect((await page.evaluate(()=>window.__physicalMapLab.validation())).nodes.edge).toContain('broadway');
 await page.reload();
 await expect(page.locator('#nodeLayer [data-node-id]')).toHaveCount(8);
 expect((await snap()).boardFrame.nodes.broadway).toEqual(edited.boardFrame.nodes.broadway);
 await page.locator('#editNode').selectOption('broadway');
 await page.locator('#resetNode').click();
 expect((await snap()).boardFrame.nodes.broadway).toBeUndefined();
 await page.locator('#showNodes').uncheck();
 await expect(page.locator('#nodeLayer [data-node-id]')).toHaveCount(0);
});

test('physical board editor: external dimension rulers show physical cm independently of zoom',async({page})=>{
 for(const size of [{width:390,height:844},{width:932,height:430}]){
  await page.setViewportSize(size);
  await page.goto('/physical-map-lab.html');
  await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
  await page.locator('#presetScythe').click();
  await expect(page.locator('#boardSizeBadge')).toHaveText('80 × 60 см');
  await expect(page.locator('#boardWidthRuler')).toHaveText('80 см');
  await expect(page.locator('#boardHeightRuler')).toHaveText('60 см');
  await page.locator('#boardHeightExact').fill('57');
  await page.locator('#boardHeightExact').press('Tab');
  await expect(page.locator('#boardSizeBadge')).toHaveText('80 × 57 см');
  await page.locator('#zoom').evaluate(el=>{el.value='150';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await expect(page.locator('#boardSizeBadge')).toHaveText('80 × 57 см');
  const aligned=await page.evaluate(()=>{
   const svg=document.querySelector('#mapSvg').getBoundingClientRect();
   const w=document.querySelector('.measure-width').getBoundingClientRect();
   const h=document.querySelector('.measure-height').getBoundingClientRect();
   return Math.abs(w.left-svg.left)<1&&Math.abs(w.width-svg.width)<1&&Math.abs(h.top-svg.top)<1&&Math.abs(h.height-svg.height)<1;
  });
  expect(aligned).toBe(true);
  await page.reload();
  await expect(page.locator('#boardSizeBadge')).toHaveText('80 × 57 см');
  const viewport=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  expect(viewport.scroll).toBeLessThanOrEqual(viewport.width+2);
 }
});

test('hex seating openings: exact clearance, independent contours and unchanged author coordinates',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 const reference=await page.evaluate(async()=>await (await fetch('./docs/PHYSICAL_MAP_LAYOUT_110CM_HEX50_USER_2026-11-24.json')).json());
 page.once('dialog',d=>d.accept());
 await page.locator('#loadHexLayout').click();
 await expect(page.locator('#notice')).toContainText('HEX 50 мм восстановлена');
 const snap=()=>page.evaluate(()=>window.__physicalMapLab.snapshot());
 const geometry=()=>page.evaluate(()=>window.__physicalMapLab.geometry('civic-1'));
 const initial=await snap();
 const coords=m=>Object.entries(m.districts).flatMap(([id,a])=>a.map(t=>[id,t.slot,t.x,t.y,t.rotation||0]));
 expect(coords(initial)).toEqual(coords(reference));
 await expect(page.locator('#slotLayer [data-hole]')).toHaveCount(79);
 await expect(page.locator('#holeClearance')).toHaveValue('0.5');
 const first=await geometry();
 expect(first.holeMm).toBeCloseTo(50+2/Math.sqrt(3),8);
 expect(first.tile).toHaveLength(6);
 expect(first.hole).toHaveLength(6);
 const v=await page.evaluate(()=>window.__physicalMapLab.validation().holes);
 expect(v.minimumMm).toBeCloseTo(1.2234043,5);
 expect(v.pairs).toEqual([]);
 await page.locator('#holeClearance').fill('1');
 await page.locator('#holeClearance').press('Tab');
 const bigger=await geometry();
 expect(bigger.center).toEqual(first.center);
 expect(bigger.tile).toEqual(first.tile);
 expect(bigger.holeMm).toBeCloseTo(50+4/Math.sqrt(3),8);
 expect(coords(await snap())).toEqual(coords(initial));
 await page.locator('#focusDistrict').selectOption('civic');
 await page.locator('#projectSelect').selectOption('std_warehouse');
 await page.locator('#markBuilding').click();
 await page.locator('#deliverOne').click();
 const built=await snap();
 const tile=page.locator('[data-slot-id="civic-1"]');
 await expect(tile.locator('polygon[data-hole]')).toHaveCount(1);
 await expect(tile.locator('path.tile-under')).toHaveCount(1);
 await page.locator('#rotateRight').click();
 const rotated=await geometry();
 expect(rotated.center).toEqual(first.center);
 expect(rotated.hole).not.toEqual(bigger.hole);
 await page.reload();
 await expect(page.locator('#holeClearance')).toHaveValue('1');
 expect((await snap()).districts.civic[0].delivered).toEqual(built.districts.civic[0].delivered);
 expect((await geometry()).hole).toEqual(rotated.hole);
 const malformed=await snap();malformed.boardFrame.clearanceMm=1.1;
 await page.locator('#jsonArea').fill(JSON.stringify(malformed));
 await page.locator('#applyJson').click();
 await expect(page.locator('#notice')).toContainText('clearanceMm');
 expect((await snap()).boardFrame.clearanceMm).toBe(1);
 const old=structuredClone(initial);delete old.boardFrame;
 await page.locator('#jsonArea').fill(JSON.stringify(old));
 await page.locator('#applyJson').click();
 expect((await snap()).boardFrame.clearanceMm).toBe(.5);
 expect(coords(await snap())).toEqual(coords(initial));
});

test('hex seating openings: touching and overlapping holes, mobile controls and zoom',async({page})=>{
 for(const viewport of [{width:390,height:844},{width:932,height:430}]){
  await page.setViewportSize(viewport);
  await page.goto('/physical-map-lab.html');
  await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
  await page.locator('#tileShape').selectOption('hex');
  await page.locator('#tileSize').fill('50');await page.locator('#tileSize').press('Tab');
  await page.locator('#holeClearance').fill('0.5');await page.locator('#holeClearance').press('Tab');
  const snap=()=>page.evaluate(()=>window.__physicalMapLab.snapshot());
  const draft=await snap();
  const a=draft.districts.civic[0],b=draft.districts.civic[1];
  const u=1536/draft.boardWidthMm*100/draft.boardFrame.magnification;
  a.rotation=0;b.rotation=0;b.x=a.x+(50*Math.sqrt(3)/2+.5)*u;b.y=a.y;
  await page.locator('#jsonArea').fill(JSON.stringify(draft));
  await page.locator('#applyJson').click();
  const holes=await page.evaluate(()=>window.__physicalMapLab.validation().holes);
  expect(holes.pairs.some(p=>p.ids.includes('civic-1')&&p.ids.includes('civic-2')&&p.overlap)).toBe(true);
  await expect(page.locator('[data-slot-id="civic-1"] [data-hole]')).toHaveClass(/slot-hole-conflict/);
  const before=await page.evaluate(()=>window.__physicalMapLab.geometry('civic-1'));
  await page.locator('#zoom').evaluate(el=>{el.value='150';el.dispatchEvent(new Event('input',{bubbles:true}))});
  expect(await page.evaluate(()=>window.__physicalMapLab.geometry('civic-1'))).toEqual(before);
  await page.locator('#holeClearance').fill('0');await page.locator('#holeClearance').press('Tab');
  const without=await page.evaluate(()=>window.__physicalMapLab.validation().holes);
  expect(without.pairs.some(p=>p.ids.includes('civic-1')&&p.ids.includes('civic-2'))).toBe(false);
  const w=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(w.content).toBeLessThanOrEqual(w.viewport+2);
 }
});

test('corner ownership: every owner, physical flip, unchanged hole and restored demo on mobile',async({page})=>{
 for(const viewport of [{width:390,height:844},{width:932,height:430}]){
  await page.setViewportSize(viewport);
  await page.goto('/physical-map-lab.html');
  await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
  await page.locator('#tileShape').selectOption('hex');
  await page.locator('#tileSize').fill('50');await page.locator('#tileSize').press('Tab');
  await page.locator('#holeClearance').fill('0.5');await page.locator('#holeClearance').press('Tab');
  await page.locator('#ownershipCut').selectOption('corner');
  await page.locator('#cornerCutMm').fill('8');await page.locator('#cornerCutMm').press('Tab');
  await page.locator('#focusDistrict').selectOption('civic');
  await page.locator('#markEmpty').click();
  await page.locator('#projectSelect').selectOption('std_warehouse');
  await page.locator('#rotateReset').click();
  await page.locator('#rotateRight').click();
  const tile=page.locator('[data-slot-id="civic-1"]');
  const hole=await tile.locator('[data-hole]').getAttribute('points');
  const geometry=()=>page.evaluate(()=>window.__physicalMapLab.ownership('civic-1'));
  for(let owner=0;owner<6;owner++){
   await page.locator('#ownerSelect').selectOption(String(owner));
   await page.locator('#markBuilding').click();
   const face=tile.locator('[data-notch-owner="'+owner+'"]');
   await expect(face).toHaveAttribute('data-face','front');
   await expect(tile.locator('circle.owner-seat')).toHaveCount(6);
   expect(await face.getAttribute('transform')).toMatch(new RegExp('^rotate\\('+(5+owner*60)+' '));
   const g=await geometry();expect(g.safe).toBe(true);
   const path=await face.locator('path.tile').getAttribute('d');
   expect((path.match(/ L /g)||[]).length).toBe(6);
   await page.locator('#deliverAll').click();
   await expect(face).toHaveAttribute('data-face','back');
   expect(await face.locator('path.tile').getAttribute('d')).toBe(path);
   expect(await tile.locator('[data-hole]').getAttribute('points')).toBe(hole);
   expect(await geometry()).toEqual(g);
   if(owner!==5)await page.locator('#markEmpty').click();
  }
  await page.locator('#ownerSelect').selectOption('2');
  await page.locator('#changeDemoOwner').click();
  await expect(tile.locator('[data-notch-owner="2"]')).toHaveAttribute('data-face','back');
  expect(await tile.locator('[data-hole]').getAttribute('points')).toBe(hole);
  await page.reload();
  await expect(tile.locator('[data-notch-owner="2"]')).toHaveAttribute('data-face','back');
  await expect(page.locator('#ownershipPreview [data-preview-side]')).toHaveCount(2);
  await page.locator('#cornerCutMm').fill('3');await page.locator('#cornerCutMm').press('Tab');
  await page.locator('#holeClearance').fill('1');await page.locator('#holeClearance').press('Tab');
  await expect(page.locator('#ownerGeometryStatus')).toHaveClass(/warning/);
  expect((await geometry()).safe).toBe(false);
  const w=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(w.content).toBeLessThanOrEqual(w.viewport+2);
 }
});

test('corner mode defaults for old geometry but explicit archived notch remains importable',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 const initial=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 initial.tileShape='hex';delete initial.boardFrame.cut;
 await page.locator('#jsonArea').fill(JSON.stringify(initial));
 await page.locator('#applyJson').click();
 await expect(page.locator('#ownershipCut')).toHaveValue('corner');
 initial.boardFrame.cut='notch';
 await page.locator('#jsonArea').fill(JSON.stringify(initial));
 await page.locator('#applyJson').click();
 await expect(page.locator('#ownershipCut')).toHaveValue('notch');
 await page.reload();
 await expect(page.locator('#ownershipCut')).toHaveValue('notch');
});

test('fold editor: reference conflicts, nominal six-panel stack and legacy import',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 page.once('dialog',d=>d.accept());
 await page.locator('#loadHexLayout').click();
 await expect(page.locator('#notice')).toContainText('HEX 50 мм восстановлена');
 const snap=()=>page.evaluate(()=>window.__physicalMapLab.snapshot());
 const folds=()=>page.evaluate(()=>window.__physicalMapLab.folds());
 const original=await snap();
 await page.locator('#foldEnabled').check();
 await expect(page.locator('#foldLayer [data-panel]')).toHaveCount(6);
 await expect(page.locator('#foldLayer .fold-hinge')).toHaveCount(5);
 await expect(page.locator('#foldLayer .fold-cut')).toHaveCount(2);
 expect((await folds()).conflicts.filter(c=>c.kind==='slot')).toHaveLength(13);
 await expect(page.locator('#slotLayer [data-hole].fold-conflict')).toHaveCount(13);
 expect((await snap()).districts).toEqual(original.districts);
 await page.locator('#presetFold84').click();
 await expect(page.locator('#boardSizeBadge')).toHaveText('84 × 56 см');
 expect((await folds()).layout.stack).toEqual({w:280,h:280,depth:15});
 expect((await snap()).districts).toEqual(original.districts);
 await page.locator('#foldBoxW').fill('279');await page.locator('#foldBoxW').press('Tab');
 expect((await folds()).layout.fitsNominal).toBe(false);
 await page.locator('#foldTop').fill('0.8');await page.locator('#foldTop').press('Tab');
 expect((await folds()).layout.stack.depth).toBeCloseTo(13.8,8);
 await page.locator('#foldEnabled').uncheck();
 await expect(page.locator('#foldLayer [data-panel]')).toHaveCount(0);
 expect((await folds()).conflicts).toEqual([]);
 const old=await snap();delete old.boardFrame.fold;
 await page.locator('#jsonArea').fill(JSON.stringify(old));
 await page.locator('#applyJson').click();
 expect((await snap()).boardFrame.fold.enabled).toBe(false);
 expect((await snap()).districts).toEqual(original.districts);
});

test('fold editor: adjustable seam and spine, zoom, roundtrip and mobile',async({page})=>{
 for(const viewport of [{width:390,height:844},{width:932,height:430}]){
  await page.setViewportSize(viewport);
  await page.goto('/physical-map-lab.html');
  await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
  const snap=()=>page.evaluate(()=>window.__physicalMapLab.snapshot());
  const folds=()=>page.evaluate(()=>window.__physicalMapLab.folds());
  await page.locator('#presetFold84').click();
  await page.locator('#foldPreset').selectOption('4x3');
  await expect(page.locator('#foldLayer [data-panel]')).toHaveCount(12);
  await expect(page.locator('#foldLayer .fold-hinge')).toHaveCount(11);
  await expect(page.locator('#foldLayer .fold-cut')).toHaveCount(6);
  await page.locator('#foldLine-x-0').fill('180');await page.locator('#foldLine-x-0').press('Tab');
  expect((await folds()).layout.regular).toBe(false);
  expect((await folds()).layout.seams.find(s=>s.id==='v1-1').at).toBeCloseTo(180,6);
  await page.locator('#foldSpine').selectOption('3');
  expect((await folds()).layout.seams.find(s=>s.id==='h1-4').kind).toBe('hinge');
  const before=await folds(),state=await snap();
  await page.locator('#zoom').evaluate(el=>{el.value='150';el.dispatchEvent(new Event('input',{bubbles:true}))});
  expect(await folds()).toEqual(before);
  await page.reload();
  await expect(page.locator('#foldLayer [data-panel]')).toHaveCount(12);
  expect((await snap()).boardFrame.fold).toEqual(state.boardFrame.fold);
  expect(await folds()).toEqual(before);
  const invalid=await snap();invalid.boardFrame.fold.x=[.6,.3,.8];
  await page.locator('#jsonArea').fill(JSON.stringify(invalid));
  await page.locator('#applyJson').click();
  await expect(page.locator('#notice')).toContainText('Панели должны');
  expect((await snap()).boardFrame.fold).toEqual(state.boardFrame.fold);
  await page.locator('#resetFoldLines').click();
  expect((await folds()).layout.regular).toBe(true);
  const w=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(w.content).toBeLessThanOrEqual(w.viewport+2);
 }
});

test('manufacturing diagnostics: actual opening pairs, independent thresholds and material estimates',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 page.once('dialog',d=>d.accept());
 await page.locator('#loadHexLayout').click();
 await expect(page.locator('#notice')).toContainText('HEX 50 мм восстановлена');
 const snap=()=>page.evaluate(()=>window.__physicalMapLab.snapshot());
 const mfg=()=>page.evaluate(()=>window.__physicalMapLab.manufacturing());
 const original=await snap(),first=await mfg();
 expect(first.pairs).toHaveLength(46);
 expect(first.minimumWebMm).toBeCloseTo(1.2234042899447672,6);
 expect(first.boardMaterial.netG).toBeCloseTo(1505.9145901793581,5);
 expect(first.tiles.perSheet).toBe(25);
 expect(first.tiles.sheets).toBe(5);
 expect(first.tiles.netG).toBeCloseTo(280.9109281747508,5);
 await expect(page.locator('#manufacturingSummary')).toContainText('46 пар');
 await page.locator('#manufacturingEditor details summary').click();
 await expect(page.locator('#manufacturingDetails')).toContainText(first.pairs[0].ids.join(' ↔ '));
 await page.locator('#manufacturingHighlight').check();
 await expect(page.locator('#slotLayer [data-hole].manufacturing-warning')).toHaveCount(first.badSlots.length);
 await page.locator('#mfgWeb').fill('2');await page.locator('#mfgWeb').press('Tab');
 const changed=await mfg();
 expect(changed.pairs.length).toBeLessThan(46);
 expect(changed.minimumWebMm).toBeCloseTo(first.minimumWebMm,7);
 expect(changed.tiles).toEqual(first.tiles);
 expect(changed.boardMaterial).toEqual(first.boardMaterial);
 await page.locator('#mfgTileCount').fill('126');await page.locator('#mfgTileCount').press('Tab');
 expect((await mfg()).tiles.sheets).toBe(6);
 expect((await mfg()).boardMaterial).toEqual(first.boardMaterial);
 await page.locator('#foldEnabled').check();
 const folded=await mfg();
 expect(folded.boardMaterial.panelCount).toBe(6);
 expect(folded.boardMaterial.grossTopMm2).toBeCloseTo(766112,4);
 expect(folded.panelEdges).toHaveLength(18);
 expect(folded.foldConflicts.filter(c=>c.kind==='slot')).toHaveLength(13);
 expect((await snap()).districts).toEqual(original.districts);
 await page.locator('#manufacturingHighlight').uncheck();
 await expect(page.locator('#slotLayer [data-hole].manufacturing-warning')).toHaveCount(0);
 expect(await mfg()).toEqual(folded);
});

test('manufacturing settings roundtrip, invalid imports, screen zoom and mobile overflow',async({page})=>{
 for(const viewport of [{width:390,height:844},{width:932,height:430}]){
  await page.setViewportSize(viewport);
  await page.goto('/physical-map-lab.html');
  await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
  const snap=()=>page.evaluate(()=>window.__physicalMapLab.snapshot());
  const mfg=()=>page.evaluate(()=>window.__physicalMapLab.manufacturing());
  await page.locator('#mfgDensity').fill('900');await page.locator('#mfgDensity').press('Tab');
  await page.locator('#mfgSheetWeb').fill('8');await page.locator('#mfgSheetWeb').press('Tab');
  await page.locator('#manufacturingHighlight').check();
  const state=await snap(),report=await mfg();
  expect(state.boardFrame.manufacturing.density).toBe(900);
  expect(state.boardFrame.manufacturing.sheetWebMm).toBe(8);
  await page.locator('#zoom').evaluate(el=>{el.value='150';el.dispatchEvent(new Event('input',{bubbles:true}))});
  expect(await mfg()).toEqual(report);
  await page.reload();
  await expect(page.locator('#mfgDensity')).toHaveValue('900');
  expect((await snap()).boardFrame.manufacturing).toEqual(state.boardFrame.manufacturing);
  expect(await mfg()).toEqual(report);
  const invalid=await snap();invalid.boardFrame.manufacturing.tileCount=1.5;
  await page.locator('#jsonArea').fill(JSON.stringify(invalid));await page.locator('#applyJson').click();
  await expect(page.locator('#notice')).toContainText('tileCount');
  expect((await snap()).boardFrame.manufacturing).toEqual(state.boardFrame.manufacturing);
  const legacy=await snap();delete legacy.boardFrame.manufacturing;
  await page.locator('#jsonArea').fill(JSON.stringify(legacy));await page.locator('#applyJson').click();
  await expect(page.locator('#mfgDensity')).toHaveValue('800');
  await expect(page.locator('#mfgWeb')).toHaveValue('6');
  expect((await snap()).districts).toEqual(state.districts);
  const w=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(w.content).toBeLessThanOrEqual(w.viewport+2);
 }
});

test('shared tile renderer: separate demo state survives geometry changes and all 79 slots fill and clear on mobile',async({page})=>{
 for(const viewport of [{width:390,height:844},{width:932,height:430}]){
  await page.setViewportSize(viewport);
  await page.goto('/physical-map-lab.html');
  await expect(page.locator('#slotLayer [data-tile-renderer="shared"]')).toHaveCount(79);
  const slots=()=>page.evaluate(()=>window.__physicalMapLab.slotRecords());
  const view=()=>page.evaluate(()=>window.__physicalMapLab.tileView('civic-1'));
  const initial=await slots();
  expect(initial.every(s=>!Object.hasOwn(s,'status')&&!Object.hasOwn(s,'projectId')&&!Object.hasOwn(s,'delivered')&&!Object.hasOwn(s,'owner'))).toBe(true);
  await page.locator('#focusDistrict').selectOption('civic');
  await page.locator('#markEmpty').click();
  await page.locator('#projectSelect').selectOption('std_warehouse');
  await page.locator('#ownerSelect').selectOption('4');
  await page.locator('#markBuilding').click();
  await page.locator('#deliverOne').click();
  const partial=await view();
  expect(partial.side).toBe('front');expect(partial.delivered).toEqual(['Lumber']);
  expect(partial.constructionId).toBeNull();expect(partial.live.income).toBeNull();
  expect(await slots()).toEqual(initial);
  const tile=page.locator('[data-slot-id="civic-1"]');
  for(const shape of ['hex','oct','square']){
   await page.locator('#tileShape').selectOption(shape);
   await page.locator('#tileSize').fill('45');await page.locator('#tileSize').press('Tab');
   await expect(tile.locator('[data-material="Lumber"]')).toHaveCount(1);
   expect(await view()).toEqual(partial);expect(await slots()).toEqual(initial);
  }
  await page.locator('#tileShape').selectOption('hex');
  await page.locator('#rotateRight').click();
  const moved=await slots();
  expect(moved.find(s=>s.id==='civic-1').rotation).not.toBe(initial.find(s=>s.id==='civic-1').rotation);
  expect(await view()).toEqual(partial);
  await page.reload();
  expect(await slots()).toEqual(moved);expect(await view()).toEqual(partial);
  await page.locator('#focusDistrict').selectOption('civic');
  await page.locator('#deliverAll').click();
  await expect(tile.locator('[data-face="back"][data-notch-owner="4"]')).toHaveCount(1);
  expect((await view()).side).toBe('back');expect(await slots()).toEqual(moved);
  await page.locator('#fillAll').click();
  await expect(page.locator('#slotLayer [data-tile-status="complete"]')).toHaveCount(79);
  expect(await slots()).toEqual(moved);
  await page.locator('#emptyAll').click();
  await expect(page.locator('#slotLayer [data-tile-status="empty"]')).toHaveCount(79);
  expect(await slots()).toEqual(moved);
  const w=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(w.content).toBeLessThanOrEqual(w.viewport+2);
 }
});

test('shared renderer works outside lab state for all catalog projects, shapes and sides',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 const result=await page.evaluate(async()=>{
  const [{PROJECTS,STANDARD_PROJECTS},{createTileView},{renderPhysicalTile},{slotGeometry}]=await Promise.all([import('/game-core.js'),import('/physical-tile-view.js'),import('/physical-tile-renderer.js'),import('/physical-map-geometry.js')]);
  const catalog=[...PROJECTS,...STANDARD_PROJECTS],slot={id:'test-1',districtId:'civic',n:1,x:0,y:0},issues=[];
  let count=0;
  for(const project of catalog)for(const shape of ['square','hex','oct'])for(const status of ['under','complete']){
   const building={status,projectId:project.id,owner:2,constructionId:'C-test',delivered:status==='under'?project.materials.slice(0,1):[]};
   const view=createTileView({slot,building,project});
   const geometry=slotGeometry({record:slot,shape,sizeMm:42,unitsPerMm:1});
   const g=renderPhysicalTile(document,{view,geometry,shape,sizeMm:42,unitsPerMm:1,namespace:'external'});
   if(!g.querySelector('.tile-title')||g.dataset.constructionId!=='C-test'||g.dataset.tileStatus!==status||g.querySelectorAll('[data-hole]').length!==1)issues.push(project.id+':'+shape+':'+status);
   if(shape!=='square'&&!g.querySelector('[data-face="'+view.side+'"]'))issues.push('face:'+project.id);
   count++;
  }
  return {count,expected:catalog.length*6,issues};
 });
 expect(result.count).toBe(result.expected);expect(result.count).toBeGreaterThan(240);expect(result.issues).toEqual([]);
 await expect(page.locator('#slotLayer [data-tile-renderer="shared"]')).toHaveCount(79);
});

test('semantic icon legend: all IDs, accessible labels, size and contrast preview on mobile',async({page})=>{
 for(const viewport of [{width:390,height:844},{width:932,height:430}]){
  await page.setViewportSize(viewport);
  await page.goto('/physical-map-lab.html');
  await expect(page.locator('#slotLayer [data-tile-renderer="shared"]')).toHaveCount(79);
  await page.locator('#iconLegendDetails summary').click();
  const definitions=await page.evaluate(async()=>{const m=await import('/physical-tile-icons.js');return m.TILE_ICONS.map(i=>({id:i.id,label:i.label}))});
  await expect(page.locator('#iconLegend [data-icon-id]')).toHaveCount(definitions.length);
  for(const {id,label} of definitions){
   const row=page.locator('#iconLegend [data-icon-id="'+id+'"]');
   await expect(row.locator('svg')).toHaveAttribute('aria-label',label);
   expect(await row.locator('svg path, svg text, svg rect, svg circle').count()).toBeGreaterThan(0);
  }
  const sample=page.locator('#iconLegend [data-icon-id="lumber"] svg');
  const small=await sample.boundingBox();
  await page.locator('#iconSampleSize').selectOption('8');
  expect((await sample.boundingBox()).width).toBeGreaterThan(small.width);
  await page.locator('#iconPaper').selectOption('dark');
  await expect(page.locator('#iconLegend')).toHaveAttribute('data-paper','dark');
  await expect(sample.locator('path').first()).toHaveAttribute('fill','#A66B35');
  await expect(page.locator('#iconLegend [data-icon-id="fire"] svg text')).toHaveAttribute('fill','#22323c');
  await page.locator('#iconPaper').selectOption('white');
  await expect(sample.locator('path').first()).toHaveAttribute('fill','#A66B35');
  await expect(page.locator('#iconLegend [data-icon-id="fire"] svg text')).toHaveAttribute('fill','#FFFFFF');
  const w=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(w.content).toBeLessThanOrEqual(w.viewport+2);
 }
});
test('shared tile icons: materials match actual demo delivery and categories on both faces',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 await page.locator('#focusDistrict').selectOption('civic');
 await page.locator('#markEmpty').click();
 await page.locator('#tileShape').selectOption('hex');
 await page.locator('#projectSelect').selectOption('std_warehouse');
 await page.locator('#markBuilding').click();
 const tile=page.locator('[data-slot-id="civic-1"]');
 await expect(tile.locator('[data-icon="trade"]')).toHaveCount(1);
 await expect(tile.locator('[data-icon="lumber"]')).toHaveCount(0);
 await page.locator('#deliverOne').click();
 await expect(tile.locator('[data-icon="lumber"]')).toHaveCount(1);
 await page.locator('#deliverOne').click();
 await expect(tile.locator('[data-icon="masonry"]')).toHaveCount(1);
 const snapshot=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(snapshot.districts.civic[0].delivered).toEqual(['Lumber','Masonry']);
 await page.reload();
 await expect(tile.locator('[data-icon="masonry"]')).toHaveCount(1);
 await expect(tile.locator('[data-icon="lumber"]')).toHaveCount(1);
 await page.locator('#focusDistrict').selectOption('civic');
 await page.locator('#deliverAll').click();
 await expect(tile.locator('[data-face="back"]')).toHaveCount(1);
 await expect(tile.locator('[data-icon="trade"]')).toHaveCount(1);
 await expect(tile.locator('[data-icon="lumber"]')).toHaveCount(0);
 await expect(tile.locator('[data-icon="worker"]')).toHaveCount(0);
});

test('category palette paints both faces and survives delivery/reload on both mobile viewports',async({page})=>{
 for(const viewport of [{width:390,height:844},{width:932,height:430}]){
  await page.setViewportSize(viewport);
  await page.goto('/physical-map-lab.html');
  await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
  await page.locator('#focusDistrict').selectOption('civic');
  await page.locator('#markEmpty').click();
  await page.locator('#tileShape').selectOption('hex');
  await page.locator('#projectSelect').selectOption('bank');
  await page.locator('#markBuilding').click();
  const tile=page.locator('[data-slot-id="civic-1"]');
  const face=tile.locator('[data-category-fill="single"]');
  await expect(face).toHaveCSS('fill','rgb(98, 77, 115)');
  await page.locator('#deliverAll').click();
  await expect(tile.locator('[data-face="back"]')).toHaveCount(1);
  await expect(face).toHaveCSS('fill','rgb(98, 77, 115)');
  await page.locator('#markEmpty').click();
  await page.locator('#projectSelect').selectOption('polytechnic_campus');
  await page.locator('#markBuilding').click();
  const mixed=tile.locator('[data-category-fill="split"]');
  await expect(mixed).toHaveAttribute('data-category-colors','#466B50,#3C607C');
  expect(await tile.locator('linearGradient stop').evaluateAll(els=>els.map(el=>el.getAttribute('stop-color')))).toEqual(['#466B50','#466B50','#3C607C','#3C607C']);
  await page.locator('#deliverOne').click();
  await page.reload();
  await expect(mixed).toHaveAttribute('data-category-colors','#466B50,#3C607C');
  await expect(tile.locator('[data-material="Lumber"]')).toHaveCount(1);
  await page.locator('#focusDistrict').selectOption('civic');
  await page.locator('#deliverAll').click();
  await expect(tile.locator('[data-face="back"]')).toHaveCount(1);
  await expect(mixed).toHaveAttribute('data-category-colors','#466B50,#3C607C');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
 }
});
