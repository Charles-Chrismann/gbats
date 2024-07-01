import { createCanvas } from '@napi-rs/canvas'
import { GameBoyAdvance } from '../src'
import fs from 'fs'
import { Pointer, Serializer } from '../src/util'

const ROM_PATH = "./examples/assets/PS.gba"
const BIOS_PATH = "./examples/assets/bios.bin"
const BACKUP_PATH = "./examples/assets/backup.txt"
const SCREEN_PATH = "./examples/assets/frame.webp"

const rom = fs.readFileSync(ROM_PATH)
const bios = fs.readFileSync(BIOS_PATH)
let canvas = createCanvas(240, 160)

function toArrayBuffer(buffer: Buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return arrayBuffer;
}

function resetGba() {
  gba = new GameBoyAdvance()
  gba.logLevel = gba.LOG_ERROR;

  gba.setCanvas(canvas)

  gba.loadRom(rom)
  gba.runStable()
}

async function render(screen_path: string) {
  const pngData = await canvas.encode('webp')
  fs.writeFileSync(screen_path, pngData)
  return pngData
}

function encode (input: Uint8Array) {
  var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var output = "";
  var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
  var i = 0;

  while (i < input.length) {
      chr1 = input[i++];
      chr2 = i < input.length ? input[i++] : Number.NaN; // Not sure if the index 
      chr3 = i < input.length ? input[i++] : Number.NaN; // checks are needed here

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
          enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
          enc4 = 64;
      }
      output += keyStr.charAt(enc1) + keyStr.charAt(enc2) +
                keyStr.charAt(enc3) + keyStr.charAt(enc4);
  }
  return output;
}

function dataURItoBlob(dataURI: string) {
  let byteString;
  if (dataURI.split(',')[0].indexOf('base64') >= 0)
    byteString = atob(dataURI.split(',')[1]);
  else
    byteString = unescape(dataURI.split(',')[1]);

  let mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  let ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ia], {type:mimeString});
}

async function createBackup(backup_path: string) {
  gba.pause()
  const freeze = gba.freeze() as any

  const ser = Serializer.serialize(freeze)
  const data = 'data:application/octet-stream;base64,' + encode(new Uint8Array(await ser.arrayBuffer()))
  fs.writeFileSync(backup_path, data)

  gba.runStable()
}

async function loadBackup(backup_path: string) {
  canvas = createCanvas(240, 160)
  resetGba()

  const state = await dataURItoBlob(fs.readFileSync(backup_path).toString()).arrayBuffer()
  const out = Serializer.deserealizeStream(new DataView(state), new Pointer())
  gba.pause()
  gba.defrost(out)
  gba.runStable()
}

let gba: GameBoyAdvance
resetGba()
render(SCREEN_PATH)

setInterval(() => {
  gba.keypad.press(gba.keypad['A'])
  render(SCREEN_PATH)
}, 1000)

setTimeout(async () => {
  await createBackup(BACKUP_PATH)
  await loadBackup(BACKUP_PATH)
}, 5000)