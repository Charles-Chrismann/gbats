# gbats

gbats is a TypeScript port of the [gbajs2](https://github.com/andychase/gbajs2) library, which itself is a port of the [gbajs](https://github.com/endrift/gbajs) library to a modern JavaScript version.

This port is motivated by the fact that I was unable to find an easy way to implement a Game Boy Advance emulator with Node.js.

**CAUTION: This package does not provide a ROM, and you will need to find it yourself. Remember, downloading and using a ROM is prohibited if you do not own the original game. The contributors of the base packages or this one cannot be held responsible for the use of this package under any circumstances. Using a ROM of a game that you do not own is solely your responsibility.**

**NOTE**: This package is simply a port of the original package. I do not claim to be able to resolve any issues regarding the functionality of the emulator, as I do not have a computer science degree. However, I can implement functionalities around the emulator itself.

## Usage

The package provides 2 ways to interact with the emulator, but both of them allows you to do the same things:

The first and the fastest is using the Wrapper class

```ts
import { Wrapper } from 'gbats'
const rom = fs.readFileSync("path_to_the_rom")

// the function is async only to allow save and load
async function main() {
  const wrapper = new Wrapper({rom})

  wrapper.press("A") // press A button

  const screenImageBuffer = await wrapper.screen() // webp image buffer

  const saveState = await wrapper.createSaveState() // save state can be saved safely in a file
  await wrapper.loadSaveState(saveState)
}

main()
```

**Note:** the GameBoyAdvance instance is accessible using the wrapper.emulator property

The second way is to use directly the GameBoyAdvance class.

Both ways are described in the /examples folder

## TODO

- [ ] Typing everything
- [ ] Replace every var by ES6 let/const
- [ ] Setup test (+ test rom)
- [x] Add a default bios
- [x] Create an interface for an easier usage
- [ ] Update the iterface to allow saving savestate by providing file path
- [ ] Fix workers for node
- [ ] Frame by frame advance
