import { Wrapper } from '../src'
import fs from 'fs'

const BACKUP_PATH = "./assets/backup.txt"
const rom = fs.readFileSync("./assets/PS.gba")

const wrapper = new Wrapper({rom})

setInterval(async () => {

  // Create and save the current frame
  const screenImageBuffer = await wrapper.screen()
  fs.writeFileSync("./assets/frame.webp", screenImageBuffer)

  // Press the A button
  wrapper.press('A')

}, 200)

setTimeout(async () => {

  // Create and save savestate
  const saveState = await wrapper.createSaveState()
  fs.writeFileSync(BACKUP_PATH, saveState)

  // Get saved savestate and load it into the emulator
  const savedSaveState = fs.readFileSync(BACKUP_PATH)
  await wrapper.loadSaveState(savedSaveState)

}, 5000)