import './style.css'
import { Wrapper } from '../../../src'

const canvas = document.querySelector('canvas')

async function main() {
  const rom = await (await fetch('/rom.gba')).arrayBuffer()
  const wrapper = new Wrapper({rom, canvas})
}

main()
