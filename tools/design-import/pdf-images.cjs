// Design import (root CLAUDE.md §3a): saves the page pictures of a design PDF (PDFs exported
// from a browser hold each page as one picture) so they can be looked at and compared.
//   node tools/design-import/pdf-images.cjs <design.pdf> <out-folder>
// JPEG pictures are saved as .jpg, others as .png. No extra packages.
const fs = require('fs');
const zlib = require('zlib');
const [inp, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const buf = fs.readFileSync(inp);
const s = buf.toString('latin1');
const objRe = /(\d+)\s+0\s+obj\s*<<([\s\S]*?)>>\s*stream\r?\n/g;
let m,
  n = 0;
function crc32(b) {
  let c,
    crc = 0xffffffff;
  for (let i = 0; i < b.length; i++) {
    c = (crc ^ b[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, c]);
}
while ((m = objRe.exec(s))) {
  const dict = m[2];
  if (!/\/Subtype\s*\/Image/.test(dict)) continue;
  const lenM = /\/Length\s+(\d+)(\s+0\s+R)?/.exec(dict);
  let len;
  if (lenM[2]) {
    const ref = new RegExp(lenM[1] + '\\s+0\\s+obj\\s*(\\d+)').exec(s);
    len = +ref[1];
  } else len = +lenM[1];
  const start = m.index + m[0].length;
  const data = buf.subarray(start, start + len);
  const w = +/\/Width\s+(\d+)/.exec(dict)[1],
    h = +/\/Height\s+(\d+)/.exec(dict)[1];
  n++;
  if (/DCTDecode/.test(dict)) {
    fs.writeFileSync(`${out}/img${n}.jpg`, data);
    console.log(n, 'jpg', w, h);
    continue;
  }
  let raw = zlib.inflateSync(data);
  const gray = /DeviceGray/.test(dict);
  const ch = gray ? 1 : 3;
  const rows = [];
  for (let y = 0; y < h; y++)
    rows.push(Buffer.from([0]), raw.subarray(y * w * ch, (y + 1) * w * ch));
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = gray ? 0 : 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(`${out}/img${n}.png`, png);
  console.log(n, 'png', w, h, gray ? 'gray' : 'rgb');
}
