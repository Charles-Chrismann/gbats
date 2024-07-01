import { Canvas, createCanvas } from "@napi-rs/canvas";
import { GameBoyAdvance } from "./gba";
import { Pointer, Serializer, dataURItoBlob, encode } from "./util";

export default class Wrapper {
  emulator: GameBoyAdvance
  bios: Buffer
  canvas: Canvas
  rom: Buffer
  constructor(
    {bios, canvas = createCanvas(240, 160), rom}: {
      bios?: Buffer,
      canvas?: Canvas
      rom: Buffer
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
    this.emulator.setCanvas(this.canvas)
    this.emulator.loadRom(this.rom)
    this.emulator.runStable()
  }

  async createSaveState() {
    this.emulator.pause()
    const freeze = this.emulator.freeze() as any

    const ser = Serializer.serialize(freeze)
    const data = 'data:application/octet-stream;base64,' + encode(new Uint8Array(await ser.arrayBuffer()))

    this.emulator.runStable()

    return data
  }

  async loadSaveState(backup: Buffer) {
    this.resetEmulator()
  
    const state = await dataURItoBlob(backup.toString()).arrayBuffer()
    const out = Serializer.deserealizeStream(new DataView(state), new Pointer())
    this.emulator.pause()
    this.emulator.defrost(out)
    this.emulator.runStable()

    return this
  }

  press(input: "A" | "B" | "SELECT" | "START" | "RIGHT" | "LEFT" | "UP" | "DOWN" | "L" | "R") {
    this.emulator.keypad.press(input)
  }

  screen() {
    return this.canvas.encode('webp')
  }
}