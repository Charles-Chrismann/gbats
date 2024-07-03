
import { GameBoyAdvance } from "./gba";
import { Pointer, Serializer, dataURItoBlob, encode } from "./util";
import * as fs from 'fs'

export default class Wrapper {
  emulator: GameBoyAdvance
  bios: Buffer | ArrayBuffer
  canvas: any
  rom: Buffer | ArrayBuffer
  screenImageFormat: 'webp' | 'jpeg' | 'png' | 'avif' = 'webp'
  constructor(
    {bios, canvas, rom}: {
      bios?: ArrayBuffer,
      canvas?: any
      rom: Buffer | ArrayBuffer
    }
  ) {
    this.bios = bios
    this.canvas = canvas
    this.rom = rom
    this.resetEmulator()
  }

  resetEmulator() {
    if(this.emulator) this.emulator.pause()
    this.emulator = new GameBoyAdvance(this.bios)
    if(this.canvas) this.emulator.setCanvas(this.canvas)
    this.emulator.loadRom(this.rom)
    this.emulator.runStable()
  }

  async createSaveState(file_path?: string) {
    this.emulator.pause()
    const freeze = this.emulator.freeze() as any

    const ser = Serializer.serialize(freeze)
    const data = 'data:application/octet-stream;base64,' + encode(new Uint8Array(await ser.arrayBuffer()))

    this.emulator.runStable()

    if(file_path) await fs.promises.writeFile(file_path, data)

    return data
  }

  async loadSaveState(backupOrFilePath: Buffer | string) {
    this.resetEmulator()
    
    let state: ArrayBuffer

    if(backupOrFilePath instanceof Buffer) {
      state = await dataURItoBlob(backupOrFilePath.toString()).arrayBuffer()
    } else {
      if(!backupOrFilePath.startsWith('data:application/octet-stream;base64')) {
        const buffer = await fs.promises.readFile(backupOrFilePath)
        state = await dataURItoBlob(buffer.toString()).arrayBuffer()
      } else state = await dataURItoBlob(backupOrFilePath.toString()).arrayBuffer()
    }

    const out = Serializer.deserealizeStream(new DataView(state), new Pointer())
    this.emulator.pause()
    this.emulator.defrost(out)
    this.emulator.runStable()

    return this
  }

  press(input: "A" | "B" | "SELECT" | "START" | "RIGHT" | "LEFT" | "UP" | "DOWN" | "L" | "R") {
    this.emulator.keypad.press(input)
  }

  screenSync(file_path?: string): Buffer {
    if(!this.canvas) throw new Error('Wrapper.canvas is null')
    if(!this.canvas.encodeSync) throw new Error('encodeSync methode not implemented, is the provided canvas an instance of @napi-rs/canvas canvas ?')
    const screenData: Buffer = this.canvas.encodeSync(this.screenImageFormat)
    if(file_path) fs.writeFileSync(file_path, screenData)
    return screenData
  }

  setScreen(canvas: any) {
    this.emulator.pause()
    this.canvas = canvas
    this.emulator.setCanvas(this.canvas)
    this.emulator.runStable()
  }

  removeScreen() {
    this.emulator.pause()
    this.canvas = null
    this.emulator.removeCanvas()
    this.emulator.runStable()
  }

  getPixels(x = 0, y = 0, w = this.canvas.width, h = this.canvas.height) {
    if(!this.canvas) throw new Error('No canvas provided')
    return Array.from(this.canvas.getContext('2d').getImageData(x, y, w, h).data) as number[]
  }
}