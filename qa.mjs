export default async function run(page, ui) {
  const log = [];
  page.on('pageerror', e => log.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) log.push('console: ' + m.text()); });
  await page.goto('http://127.0.0.1:3000');
  await page.waitForSelector('.candy-app', { timeout: 30000 });
  await page.locator('.play-button').click({ force: true });
  await page.waitForTimeout(1200);
  const mapState = await page.evaluate(() => ({
    hasMap: !!document.querySelector('.map-page'),
    worlds: document.querySelectorAll('.world').length,
    text: document.body.innerText.slice(0, 250),
    brokenImgs: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')),
  }));
  await page.screenshot({ path: 'map.png' });
  const nodes = page.locator('.level-node.unlocked > button');
  const n = await nodes.count();
  if (n) {
    await nodes.first().click({ force: true });
    await page.waitForTimeout(900);
    await page.locator('button.primary').first().click({ force: true });
    await page.waitForTimeout(2600);
    const board = await page.evaluate(() => ({
      cells: document.querySelectorAll('.candy-cell').length,
      broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')),
      text: document.body.innerText.slice(0, 300),
    }));
    await page.screenshot({ path: 'game.png' });
    return { mapState, board, log };
  }
  return { mapState, log, note: 'no unlocked level node found' };
}
