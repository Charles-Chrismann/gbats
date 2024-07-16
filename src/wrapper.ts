
import { GameBoyAdvance } from "./gba";
import { Pointer, Serializer, dataURItoBlob, encode } from "./util";
import * as fs from 'fs'

export default class Wrapper {
  emulator: GameBoyAdvance
  bios: Buffer | ArrayBuffer
  canvas: any
  restoreCanvas: any
  rom: Buffer | ArrayBuffer
  screenImageFormat: 'webp' | 'jpeg' | 'png' | 'avif' = 'webp'
  updateMethod: 'auto' | 'manual'
  constructor(
    {bios, canvas, rom, updateMethod = "auto"}: {
      bios?: ArrayBuffer,
      canvas?: any
      rom: Buffer | ArrayBuffer,
      updateMethod?: 'auto' | 'manual'
    }
  ) {
    this.bios = bios
    this.canvas = canvas
    this.restoreCanvas = canvas
    this.rom = rom
    this.resetEmulator(updateMethod)
  }

  run(paused: boolean = false) {
    if(paused) return
    if(this.emulator.updateMethod !== 'auto') return
    this.emulator.runStable()
  }

  pause() {
    if(this.updateMethod !== 'auto') return
    this.emulator.pause()
  }

  resetEmulator(updateMethod: 'auto' | 'manual' = 'auto') {
    if(this.emulator) this.emulator.pause()
    this.emulator = new GameBoyAdvance(this.bios, updateMethod)
    if(this.canvas) this.emulator.setCanvas(this.canvas)
    this.emulator.loadRom(this.rom)
    this.run()
  }

  async createSaveState(file_path?: string) {
    const paused = this.emulator.paused
    this.emulator.pause()
    const freeze = this.emulator.freeze() as any
    console.log(this.emulator.keypad.nextFramesInputs)
    console.log(freeze)

    const ser = Serializer.serialize(freeze)
    const data = 'data:application/octet-stream;base64,' + encode(new Uint8Array(await ser.arrayBuffer()))

    this.run(paused)

    if(file_path) await fs.promises.writeFile(file_path, data)

    return data
  }

  async loadSaveState(backupOrFilePath: Buffer | string) {
    this.resetEmulator()
    
    let state: ArrayBuffer

    if(!!window || backupOrFilePath instanceof Buffer) {
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
    this.run()


    return this
  }

  press(
    input: number,
    frames?: number
  ) {
    this.emulator.keypad.press(input, frames)
  }

  screenSync(file_path?: string): Buffer {
    if(!this.canvas) throw new Error('Wrapper.canvas is null')
    if(!this.canvas.encodeSync) throw new Error('encodeSync methode not implemented, is the provided canvas an instance of @napi-rs/canvas canvas ?')
    const screenData: Buffer = this.canvas.encodeSync(this.screenImageFormat)
    if(file_path) fs.writeFileSync(file_path, screenData)
    return screenData
  }

  setScreen(canvas?: any) {
    const paused = this.emulator.paused
    this.emulator.pause()
    this.canvas = canvas ?? this.restoreCanvas
    this.emulator.setCanvas(this.canvas)
    this.run(paused)
  }

  removeScreen() {
    const paused = this.emulator.paused
    this.emulator.pause()
    this.canvas = null
    this.emulator.removeCanvas()
    this.run(paused)
  }

  getPixels(x = 0, y = 0, w = this.canvas.width, h = this.canvas.height) {
    if(!this.canvas) throw new Error('No canvas provided')
    return Array.from(this.canvas.getContext('2d').getImageData(x, y, w, h).data) as number[]
  }

  frame() {
    if(this.emulator.updateMethod === 'auto') return

    this.emulator.advanceFrame()
    for(const nextInput of this.emulator.keypad.nextFramesInputs) {

      nextInput.frameCount = nextInput.frameCount - 1
      console.log(nextInput.frameCount)
      if(nextInput.frameCount !== 0) continue
      console.log('release', nextInput.frameCount)
      // remove pressed input
      let toggle: any= nextInput.key
      toggle = 1 << toggle
      this.emulator.keypad.currentDown |= toggle;
    }
    this.emulator.keypad.nextFramesInputs = this.emulator.keypad.nextFramesInputs.filter(a => a.frameCount > 0)
  }

  skipFrames(n: number) {
    if(n === 0) return
    else if(n === 1) this.frame()
    else {
      this.removeScreen()
      for(let i = 0; i < n - 1; i++) this.frame()
      this.setScreen()
      this.frame()
    }
  }

  switchUpdateMethod(updateMethod?: 'manual' | 'auto') {
    const paused = this.emulator.paused
    this.emulator.pause()
    this.updateMethod = updateMethod ?? (this.updateMethod === 'auto' ? 'manual' : 'auto')
    this.emulator.updateMethod = this.updateMethod
    if(this.emulator.updateMethod === 'auto') this.emulator.keypad.nextFramesInputs = []
    this.run(paused)
  }
}