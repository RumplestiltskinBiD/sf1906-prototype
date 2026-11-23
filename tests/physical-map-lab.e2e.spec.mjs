import {test,expect} from '@playwright/test';

test('physical map lab: all 79 slots, dimensions, drag, persistence, JSON round trip',async({page})=>{
 await page.goto('/physical-map-lab.html');
 await expect(page.locator('#slotLayer .slot')).toHaveCount(79);
 await expect(page.locator('#regionLayer .region')).toHaveCount(21);
 const before=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(before.schema).toBe('sf1906-physical-slot-layout-v1');
 expect(before.boardWidthMm).toBe(800);
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
 await page.locator('#markComplete').click();
 const model=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(model.districts.civic.some(s=>s.status==='complete')).toBe(true);
 const htmlWidth=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
 expect(htmlWidth.content).toBeLessThanOrEqual(htmlWidth.viewport+2);
 await page.locator('#markEmpty').click();
 const empty=await page.evaluate(()=>window.__physicalMapLab.snapshot());
 expect(empty.districts.civic.every(s=>s.status==='empty')).toBe(true);
});