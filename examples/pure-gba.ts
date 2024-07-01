import { createCanvas } from '@napi-rs/canvas'
import {
  GameBoyAdvance,
  Pointer,
  Serializer,
  encode,
  dataURItoBlob
} from '../src'
import fs from 'fs'
import {  } from '../src/util'

const BACKUP_PATH = "./examples/assets/backup.txt"
const SCREEN_PATH = "./examples/assets/frame.webp"

const rom = fs.readFileSync("./examples/assets/PS.gba")
let canvas = createCanvas(240, 160)

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
}, 200)

setTimeout(async () => {
  await createBackup(BACKUP_PATH)
  await loadBackup(BACKUP_PATH)
}, 5000)