import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
const dialogMessages = [];
page.on('dialog', (d) => { dialogMessages.push(d.message()); d.dismiss().catch(() => {}); });

await page.goto('http://localhost:8791/index.html');
await page.waitForTimeout(300);

// Setup screen: fill names, start game
const inputs = await page.$$('#nameInputs input');
console.log('name inputs found:', inputs.length);
for (let i = 0; i < inputs.length; i++) await inputs[i].fill(`테스터${i + 1}`);
await page.click('text=게임 시작');
await page.waitForTimeout(300);

const brand = await page.textContent('.brand');
console.log('brand text:', brand);

const hexCount = await page.$$eval('.map-wrap svg polygon', (els) => els.length);
console.log('hex tile count:', hexCount);

// Click through each of the 5 action slots and try to exercise a control in each panel.
for (let slot = 0; slot < 5; slot++) {
  await page.click(`.action-slot >> nth=${slot}`);
  await page.waitForTimeout(120);
  const panelHeading = await page.textContent('#action-control-panel h3').catch(() => '(no heading found)');
  console.log(`slot ${slot} -> panel heading:`, panelHeading);

  // Try clicking an empty hex (for Build) — harmless no-op for other panels.
  const emptyHex = await page.$('.hex.empty');
  if (emptyHex) await emptyHex.click().catch(() => {});
  await page.waitForTimeout(80);

  // Try any primary button inside the action panel specifically.
  const primaryBtn = await page.$('#action-control-panel .btn:not(.secondary)');
  if (primaryBtn) await primaryBtn.click().catch(() => {});
  await page.waitForTimeout(150);
}
console.log('\nCONSOLE/PAGE ERRORS (after guard fix):', errors.length ? errors : 'none');

// Full happy-path build: click 건설(build) slot, pick the tile touching the
// starter enclosure specifically, and submit — should succeed with no alert.
errors.length = 0;
dialogMessages.length = 0;
const buildSlotIndex = await page.$$eval('.action-slot', (els) =>
  els.findIndex((e) => e.textContent.includes('건설')));
await page.click(`.action-slot >> nth=${buildSlotIndex}`);
await page.waitForTimeout(150);
// starter enclosure sits at map.starterEnclosure; click hexes near the
// center-left where it's placed until one accepts (building-enclosure class).
// Tile render order matches game.map.tiles (row-major r=-3..3); index 22 is
// (q=-3,r=0), the immediate right-neighbor of the starter enclosure at
// (q=-4,r=0) which is index 21 — computed once from board.js's own layout.
const headingBeforeClick = await page.textContent('#action-control-panel h3').catch(() => '(none)');
console.log('panel heading before hex click:', headingBeforeClick);
await page.click('.map-wrap svg polygon >> nth=22');
await page.waitForTimeout(100);
const selectedText = await page.textContent('#action-control-panel').catch(() => '(none)');
console.log('panel text after hex click includes selection line:', selectedText.includes('선택한 시작 칸'), '| snippet:', selectedText.match(/선택한 시작 칸:[^\n]*/)?.[0]);
await page.click('#action-control-panel .btn:not(.secondary)');
await page.waitForTimeout(200);
console.log('alert(s) during full build flow:', dialogMessages.length ? dialogMessages : 'none');
console.log('errors during full build flow:', errors.length ? errors : 'none');
const moneyText = await page.textContent('.stat-chip');
console.log('money chip after build attempt:', moneyText);

await browser.close();
process.exit(errors.length ? 1 : 0);
