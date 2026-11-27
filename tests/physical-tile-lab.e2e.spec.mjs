import {test,expect} from '@playwright/test';
for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:932,height:430}]){
 test('reviewed catalog real sizes, occupancy, filters and print '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/physical-tile-lab.html');
  await expect(page.locator('.building')).toHaveCount(4);
  await expect(page.locator('[data-reviewed-layout]')).toHaveCount(8);
  await page.locator('#building').selectOption('wholesale_market');
  await page.locator('#side').selectOption('back');
  await expect(page.locator('[data-component-slot="goods"]')).toHaveCount(3);
  await expect(page.locator('[data-action-frame]')).toHaveCount(0);
  await page.locator('#minus').click();await expect(page.locator('[data-preview-side]')).toHaveAttribute('data-size-mm','49');
  await page.locator('#filled').check();await expect(page.locator('[data-placed="cube"]')).toHaveCount(3);
  await page.locator('#compare').check();await expect(page.locator('[data-preview-side]')).toHaveCount(4);
  for(const d of [40,45,50,55])await expect(page.locator('[data-size-mm="'+d+'"] [data-component-slot="goods"]')).toHaveCount(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('#compare').uncheck();await page.locator('#zoom').selectOption('1');
  await page.locator('#calibration').evaluate(el=>{el.value='120';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const screen=await page.locator('[data-preview-side]').boundingBox();expect(screen.width).toBeCloseTo(49*96/25.4*1.2,0);
  await page.emulateMedia({media:'print'});
  const printed=await page.locator('[data-preview-side]').boundingBox();expect(printed.width).toBeCloseTo(49*96/25.4,0);
  await expect(page.locator('.owner-seat').first()).toBeHidden();
 });
}
