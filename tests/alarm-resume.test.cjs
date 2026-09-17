const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const alarm = read('alarm.js');
const common = read('multi-common.js');
const app = read('app.js');

test('alarm evaluation is serialized across overlapping room refreshes', () => {
  assert.match(alarm, /async function processRoomAlarmsNow\(/);
  assert.match(alarm, /let roomAlarmQueue=Promise\.resolve\(\);/);
  assert.match(alarm, /roomAlarmQueue\.then\(\(\)=>processRoomAlarmsNow/);
  assert.match(alarm, /let singleRoomAlarmQueue=Promise\.resolve\(\);/);
  assert.match(alarm, /singleRoomAlarmQueue\.then\(\(\)=>processSingleRoomAlarmNow/);
});

test('single-room watcher preserves resume signals and pauses hidden polling', () => {
  assert.match(common, /if\(wakeBusy\)\{wakeQueued=true;return;\}/);
  assert.match(common, /if\(!document\.hidden\)void wake\(\)/);
  assert.match(common, /window\.addEventListener\('resume',wake\)/);
  assert.match(common, /window\.addEventListener\('pagehide',onPageHide\)/);
  assert.match(common, /window\.addEventListener\('pageshow',onPageShow\)/);
});

test('home and room lists refresh immediately after returning to the page', () => {
  assert.match(app, /const wakeHome=\(\)=>\{if\(!document\.hidden\)void loadHomeActiveGames\(\)\}/);
  assert.match(app, /const wakeRooms=\(\)=>\{if\(!document\.hidden\)void loadRooms\(\)\}/);
  assert.match(app, /window\.addEventListener\('resume',wakeHome\)/);
  assert.match(app, /window\.addEventListener\('resume',wakeRooms\)/);
  assert.match(app, /let homeLoadBusy=false,homeLoadQueued=false/);
  assert.match(app, /let roomsLoadBusy=false,roomsLoadQueued=false/);
});

test('release cache bust points every alarm entry at v11.4.79', () => {
  assert.match(app, /import\('\.\/alarm\.js\?v=11\.4\.79'\)/);
  assert.match(app, /register\('\.\/sw\.js\?v=11\.4\.79'/);
  assert.match(common, /import \{processSingleRoomAlarm\} from '\.\/alarm\.js\?v=11\.4\.79'/);
  assert.match(read('sw.js'), /boardmate-shell-v11\.4\.79/);
  assert.equal(read('HANDOFF_VERSION.txt').trim(), '11.4.79');
});
