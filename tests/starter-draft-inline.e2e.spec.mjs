import {test,expect} from '@playwright/test';

for(const viewport of [{width:390,height:844},{width:932,height:430},{width:1440,height:900}]){
  test('draft cards handle 1/2 and 2/2 inline, no sticky action bar '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('#starterDraft')).toHaveClass(/active/);
    await expect(page.locator('#hallActionBar')).toBeHidden();
    await page.locator('#revealStarterDraft').click();
    const cards=page.locator('.draft-card');
    await expect(cards).toHaveCount(5);
    await expect(page.locator('#hallActionBar')).toBeHidden();
    await expect(page.locator('#cityGoalMarket')).toBeHidden();
    await expect(page.locator('#projectMarket')).toBeHidden();
    await expect(page.locator('.draft-market-ref')).toBeVisible();
    await expect(page.locator('#confirmStarterDraft')).toHaveCount(0);
    // Whole card is the hit target; no fixed CTA and no keep-button row.
    await cards.nth(0).locator('[data-draft-card]').click();
    await expect(cards.nth(0).locator('.age-badge')).toHaveText('✓ 1/2');
    await expect(cards.nth(0).locator('[data-draft-card]')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#confirmStarterDraft')).toHaveCount(0);
    await cards.nth(1).locator('[data-draft-card]').click();
    await expect(cards.nth(1).locator('.age-badge')).toHaveText('✓ 2/2');
    await expect(cards.nth(1).locator('#confirmStarterDraft')).toBeVisible();
    // Tapping selected card again deselects it and retracts confirmation.
    await cards.nth(1).locator('[data-draft-card]').click();
    await expect(cards.nth(1).locator('.age-badge')).toHaveText('ВЫБРАТЬ');
    await expect(page.locator('#confirmStarterDraft')).toHaveCount(0);
    await cards.nth(2).locator('[data-draft-card]').click();
    await expect(cards.nth(2).locator('.age-badge')).toHaveText('✓ 2/2');
    await cards.nth(2).locator('#confirmStarterDraft').click();
    await expect(page.locator('#revealStarterDraft')).toBeVisible();
    await expect(page.locator('#hallActionBar')).toBeHidden();
    const metrics=await page.evaluate(()=>({
      width:document.documentElement.scrollWidth,
      viewport:innerWidth,
      hiddenBar:getComputedStyle(document.querySelector('#hallActionBar')).display==='none',
      draftCards:document.querySelectorAll('.draft-card').length
    }));
    expect(metrics.width).toBeLessThanOrEqual(metrics.viewport+2);
    expect(metrics.hiddenBar).toBe(true);
    expect(metrics.draftCards).toBe(0);
  });
}
test('mobile horizontal draft carousel remains on tapped card after selection and changing selection',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.locator('#revealStarterDraft').click();
  await page.locator('.draft-card').nth(3).locator('[data-draft-card]').scrollIntoViewIfNeeded();
  const before=await page.locator('.starter-draft-cards').evaluate(el=>el.scrollLeft);
  expect(before).toBeGreaterThan(0);
  await page.locator('.draft-card').nth(3).locator('[data-draft-card]').click();
  const after=await page.locator('.starter-draft-cards').evaluate(el=>el.scrollLeft);
  expect(Math.abs(after-before)).toBeLessThanOrEqual(35);
  await expect(page.locator('.draft-card').nth(3).locator('.age-badge')).toHaveText('✓ 1/2');
  await page.locator('.draft-card').nth(4).locator('[data-draft-card]').click();
  await expect(page.locator('.draft-card').nth(4).locator('.age-badge')).toHaveText('✓ 2/2');
  await expect(page.locator('.draft-card').nth(4).locator('#confirmStarterDraft')).toBeVisible();
});
test('complete three private starter hands, then ordinary City Hall action bar resumes',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  for(let i=0;i<3;i++){
    await page.locator('#revealStarterDraft').click();
    await page.locator('.draft-card').nth(0).locator('[data-draft-card]').click();
    await page.locator('.draft-card').nth(1).locator('[data-draft-card]').click();
    await page.locator('#confirmStarterDraft').click();
    if(i<2)await expect(page.locator('#hallActionBar')).toBeHidden();
  }
  await expect(page.locator('#passTender')).toBeVisible();
  await expect(page.locator('#hallActionBar')).toBeVisible();
  await expect(page.locator('#cityGoalMarket')).toBeVisible();
});
