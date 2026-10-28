const assert = require('node:assert/strict');
const { sentenceEnds, readingImageWidth } = require('../assets/reading.js');
function split(text) {
  const boundaries = [0, ...sentenceEnds(text), text.length];
  return boundaries.slice(1).map((end, i) => text.slice(boundaries[i], end).trim());
}
assert.deepEqual(split('확인하였다. 다음 과정을 분석한다. 마지막이다.'), ['확인하였다.', '다음 과정을 분석한다.', '마지막이다.']);
assert.deepEqual(split('svchost.exe와 64to32.dll을 본다. 다음이다.'), ['svchost.exe와 64to32.dll을 본다.', '다음이다.']);
assert.deepEqual(split('2026.10.28에 3.5와 8.8.8.8을 확인하였다. 계속한다.'), ['2026.10.28에 3.5와 8.8.8.8을 확인하였다.', '계속한다.']);
assert.deepEqual(split('https://example.com/a.png 주소이다. 다음이다.'), ['https://example.com/a.png 주소이다.', '다음이다.']);
assert.deepEqual(split('“분석했다.” 다음을 본다.'), ['“분석했다.”', '다음을 본다.']);
assert.deepEqual(sentenceEnds('한 문장이다.'), []);
assert.deepEqual(sentenceEnds(''), []);
assert.equal(readingImageWidth(350), 560);
assert.equal(readingImageWidth(700), 960);
assert.equal(readingImageWidth(1200), 1200);
assert.equal(readingImageWidth(0), 0);
console.log('PASS: sentence breaks preserve filenames, dates, decimals, IPs, URLs and quotes; bounded image enlargement');
