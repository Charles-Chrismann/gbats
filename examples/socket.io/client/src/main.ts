import './style.css'
import { io } from 'socket.io-client'
import { Wrapper } from '../../../../src'

const socket = io('http://localhost:3000')
const canvas = document.querySelector('canvas')
const runBtn = document.querySelector('#run')!
const pauseBtn = document.querySelector('#pause')!
const toggleBtn = document.querySelector('#toggle')!
const advanceBtn = document.querySelector('#advance')!
const createBackupBtn = document.querySelector('#createBackup')!
const loadBackupBtn = document.querySelector('#loadBackup')!
const resetBtn = document.querySelector('#reset')!
const press120DownBtn = document.querySelector('#press120Down')!
const advanceFrameFastBtn = document.querySelector('#advanceFrameFast')!
const advance60FrameBtn = document.querySelector('#advance60Frame')!
let wrapper: Wrapper
let rom: ArrayBuffer
let fastAdvanceTimeoutId: NodeJS.Timeout

async function main() {
  rom = await (await fetch('/rom.gba')).arrayBuffer()
  wrapper = new Wrapper({rom, canvas, updateMethod: 'manual'})
  console.log(wrapper.emulator.updateMethod)
}

main()

runBtn.addEventListener('click', () => {
  wrapper.run()
})

pauseBtn.addEventListener('click', () => {
  wrapper.pause()
})

toggleBtn.addEventListener('click', () => {
  wrapper.switchUpdateMethod()
  console.log(wrapper.updateMethod)
})

advanceBtn.addEventListener('click', () => {
  wrapper.frame()
})

window.addEventListener('keypress', (e) => {
  const keyMap = new Map<string, number>([
    ["z", 6],
    ["q", 5],
    ["s", 7],
    ["d", 4],
    ["Enter", 3],
    [" ", 2],
    ["l", 0],
    ["m", 1],
    ["O", 9],
    ["P", 8],
  ])
  if(!keyMap.has(e.key)) return
  if(wrapper.emulator.updateMethod === 'auto') wrapper.press(keyMap.get(e.key)!)
  else socket.emit('input', keyMap.get(e.key)!)
})

createBackupBtn.addEventListener('click', async () => {
  localStorage.setItem('backup', await wrapper.createSaveState())
})

loadBackupBtn.addEventListener('click', async () => {
  if(!localStorage.getItem('backup')) return
  socket.emit('backup', localStorage.getItem('backup')!)
})

resetBtn.addEventListener('click', () => {
  wrapper.resetEmulator()
})

press120DownBtn.addEventListener('click', () => {
  wrapper.press(7, 60)
})

window.addEventListener('mousedown', (e) => {
  if(e.target !== advanceFrameFastBtn) return
  fastAdvanceTimeoutId = setInterval(() => {
    wrapper.frame()
  }, 1)
})

window.addEventListener('mouseup', (e) => {
  if(fastAdvanceTimeoutId) clearInterval(fastAdvanceTimeoutId)
})

socket.on('input', (data) => {
  console.log('received input')
  wrapper.press(data)
})

socket.on('backup', (data) => {
  console.log('received backup')
  wrapper.loadSaveState(data)
  console.log(wrapper.emulator.keypad.nextFramesInputs)
})

socket.on('advance', (data) => {
  console.log('advance', data)
  const tick = performance.now()
  wrapper.skipFrames(data)
  console.log('tack', performance.now() - tick)
})

advance60FrameBtn.addEventListener('click', () => {
  socket.emit('advance', 60)
})