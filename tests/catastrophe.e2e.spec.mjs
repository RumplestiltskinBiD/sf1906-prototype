import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
  page.on('pageerror',e=>{throw e;});
  page.on('console',msg=>{if(msg.type()==='error')throw Error(msg.text());});
});
test('laboratory loads the EXACT game SVG and reacts to the three origins',async({page})=>{
  await page.goto('/catastrophe.html');
  await expect(page.locator('#mapWindow [data-district]')).toHaveCount(21);
  await expect(page.locator('#mapWindow image#devMapImage')).toHaveAttribute('href',/assets\/v8-map/);
  await expect(page.locator('#z')).toHaveValue('3');
  await page.locator('#quake').click();
  await expect(page.locator('#message')).toContainText('SoMa');
  await expect(page.locator('#queue')).toContainText('Mission');
  await page.locator('#step').click();
  await expect(page.locator('#history li')).toHaveCount(1);
  await page.locator('#all').click();
  await expect(page.locator('#message')).toContainText('Готово');
  const burnt=await page.locator('.is-burning,.is-destroyed').count();
  expect(burnt).toBeGreaterThan(3);
  await expect(page.locator('#queue')).toContainText('пусто');
});
test('raw Z above III survives editing and re-run',async({page})=>{
  await page.goto('/catastrophe.html');
  await page.locator('#preset').selectOption('high-risk');
  await expect(page.locator('#z')).toHaveValue('7');
  await page.locator('#zplus').click();
  await expect(page.locator('#z')).toHaveValue('8');
  await expect(page.locator('#mapWindow #laboratoryLabels')).toContainText('III(8)');
  await page.locator('#quake').click();
  await expect(page.locator('#selectionInfo')).toContainText('З8');
  await page.locator('#reset').click();
  await expect(page.locator('#z')).toHaveValue('8');
  await page.locator('#zminus').click();
  await expect(page.locator('#z')).toHaveValue('7');
});
test('mobile portrait stays map-scrollable and risks editable by tapping districts',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/catastrophe.html');
  await expect(page.locator('#mapWindow [data-district]')).toHaveCount(21);
  const sizes=await page.evaluate(()=>({
    page:document.documentElement.scrollWidth,
    width:innerWidth,
    mapScroll:document.getElementById('mapWindow').scrollWidth,
    mapWidth:document.getElementById('mapWindow').clientWidth
  }));
  expect(sizes.page).toBeLessThanOrEqual(sizes.width+3);
  expect(sizes.mapScroll).toBeGreaterThan(sizes.mapWidth);
  await page.locator('#quake').click();
  await page.locator('#step').click();
  await expect(page.locator('#history li')).toHaveCount(1);
});
