export class MemoryView {
  buffer: any
  view: DataView
  mask: number
  mask8: number
  mask16: number
  mask32: number
  icache: any[]
  
	constructor(memory, offset?) {
		// this.inherit();
		this.buffer = memory;
		this.view = new DataView(
			this.buffer,
			typeof offset === "number" ? offset : 0
		);
		this.mask = memory.byteLength - 1;
		this.resetMask();
	}
	resetMask() {
		this.mask8 = this.mask & 0xffffffff;
		this.mask16 = this.mask & 0xfffffffe;
		this.mask32 = this.mask & 0xfffffffc;
	}
	load8(offset) {
		return this.view.getInt8(offset & this.mask8);
	}
	load16(offset) {
		// Unaligned 16-bit loads are unpredictable...let's just pretend they work
		return this.view.getInt16(offset & this.mask, true);
	}
	loadU8(offset) {
		return this.view.getUint8(offset & this.mask8);
	}
	loadU16(offset) {
		// Unaligned 16-bit loads are unpredictable...let's just pretend they work
		return this.view.getUint16(offset & this.mask, true);
	}
	load32(offset) {
		// Unaligned 32-bit loads are "rotated" so they make some semblance of sense
		var rotate = (offset & 3) << 3;
		var mem = this.view.getInt32(offset & this.mask32, true);
		return (mem >>> rotate) | (mem << (32 - rotate));
	}
	store8(offset, value) {
		this.view.setInt8(offset & this.mask8, value);
	}
	store16(offset, value) {
		this.view.setInt16(offset & this.mask16, value, true);
	}
	store32(offset, value) {
		this.view.setInt32(offset & this.mask32, value, true);
	}
	invalidatePage(address) {}
	replaceData(memory, offset) {
		this.buffer = memory;
		this.view = new DataView(
			this.buffer,
			typeof offset === "number" ? offset : 0
		);
		if (this.icache) {
			this.icache = new Array(this.icache.length);
		}
	}
}

export class SRAMSavedata extends MemoryView {
  writePending: boolean
	constructor(size) {
		super(new ArrayBuffer(size), 0);

		this.writePending = false;
	}
	store8(offset, value) {
		this.view.setInt8(offset, value);
		this.writePending = true;
	}
	store16(offset, value) {
		this.view.setInt16(offset, value, true);
		this.writePending = true;
	}
	store32(offset, value) {
		this.view.setInt32(offset, value, true);
		this.writePending = true;
	}
}

export class FlashSavedata extends MemoryView {
  COMMAND_WIPE: number
  COMMAND_ERASE_SECTOR: number
  COMMAND_ERASE: number
  COMMAND_ID: number
  COMMAND_WRITE: number
  COMMAND_SWITCH_BANK: number
  COMMAND_TERMINATE_ID: number
  ID_PANASONIC: number
  ID_SANYO: number
  bank0: DataView
  id: number
  bank1: DataView
  bank: DataView
  idMode: boolean
  writePending: boolean
  first: number
	second: number
	command: number
	pendingCommand: number

	constructor(size) {
		super(new ArrayBuffer(size), 0);

		this.COMMAND_WIPE = 0x10;
		this.COMMAND_ERASE_SECTOR = 0x30;
		this.COMMAND_ERASE = 0x80;
		this.COMMAND_ID = 0x90;
		this.COMMAND_WRITE = 0xa0;
		this.COMMAND_SWITCH_BANK = 0xb0;
		this.COMMAND_TERMINATE_ID = 0xf0;

		this.ID_PANASONIC = 0x1b32;
		this.ID_SANYO = 0x1362;

		this.bank0 = new DataView(this.buffer, 0, 0x00010000);
		if (size > 0x00010000) {
			this.id = this.ID_SANYO;
			this.bank1 = new DataView(this.buffer, 0x00010000);
		} else {
			this.id = this.ID_PANASONIC;
			this.bank1 = null;
		}
		this.bank = this.bank0;

		this.idMode = false;
		this.writePending = false;

		this.first = 0;
		this.second = 0;
		this.command = 0;
		this.pendingCommand = 0;
	}
	load8(offset) {
		if (this.idMode && offset < 2) {
			return (this.id >> (offset << 3)) & 0xff;
		} else if (offset < 0x10000) {
			return this.bank.getInt8(offset);
		} else {
			return 0;
		}
	}
	load16(offset) {
		return (this.load8(offset) & 0xff) | (this.load8(offset + 1) << 8);
	}
	load32(offset) {
		return (
			(this.load8(offset) & 0xff) |
			(this.load8(offset + 1) << 8) |
			(this.load8(offset + 2) << 16) |
			(this.load8(offset + 3) << 24)
		);
	}
	loadU8(offset) {
		return this.load8(offset) & 0xff;
	}
	loadU16(offset) {
		return (this.loadU8(offset) & 0xff) | (this.loadU8(offset + 1) << 8);
	}
	store8(offset, value) {
		switch (this.command) {
			case 0:
				if (offset == 0x5555) {
					if (this.second == 0x55) {
						switch (value) {
							case this.COMMAND_ERASE:
								this.pendingCommand = value;
								break;
							case this.COMMAND_ID:
								this.idMode = true;
								break;
							case this.COMMAND_TERMINATE_ID:
								this.idMode = false;
								break;
							default:
								this.command = value;
								break;
						}
						this.second = 0;
						this.first = 0;
					} else {
						this.command = 0;
						this.first = value;
						this.idMode = false;
					}
				} else if (offset == 0x2aaa && this.first == 0xaa) {
					this.first = 0;
					if (this.pendingCommand) {
						this.command = this.pendingCommand;
					} else {
						this.second = value;
					}
				}
				break;
			case this.COMMAND_ERASE:
				switch (value) {
					case this.COMMAND_WIPE:
						if (offset == 0x5555) {
							for (var i = 0; i < this.view.byteLength; i += 4) {
								this.view.setInt32(i, -1);
							}
						}
						break;
					case this.COMMAND_ERASE_SECTOR:
						if ((offset & 0x0fff) == 0) {
							for (let i = offset; i < offset + 0x1000; i += 4) {
								this.bank.setInt32(i, -1);
							}
						}
						break;
				}
				this.pendingCommand = 0;
				this.command = 0;
				break;
			case this.COMMAND_WRITE:
				this.bank.setInt8(offset, value);
				this.command = 0;

				this.writePending = true;
				break;
			case this.COMMAND_SWITCH_BANK:
				if (this.bank1 && offset == 0) {
					if (value == 1) {
						this.bank = this.bank1;
					} else {
						this.bank = this.bank0;
					}
				}
				this.command = 0;
				break;
		}
	}
	store16(offset, value) {
		throw new Error('Unaligned save to flash!');
	}
	store32(offset, value) {
		throw new Error('Unaligned save to flash!');
	}
	replaceData(memory) {
		var bank = this.view === this.bank1;
		MemoryView.prototype.replaceData.call(this, memory, 0);

		this.bank0 = new DataView(this.buffer, 0, 0x00010000);
		if (memory.byteLength > 0x00010000) {
			this.bank1 = new DataView(this.buffer, 0x00010000);
		} else {
			this.bank1 = null;
		}
		this.bank = bank ? this.bank1 : this.bank0;
	}
}

export class EEPROMSavedata extends MemoryView {
  writeAddress: number
	readBitsRemaining: number
	readAddress: number

	command: number
	commandBitsRemaining: number

	realSize: number
	addressBits: number
	writePending: boolean

	dma: any

	COMMAND_NULL: number
	COMMAND_PENDING: number
	COMMAND_WRITE: number
	COMMAND_READ_PENDING: number
	COMMAND_READ: number

	constructor(size, mmu) {
		super(new ArrayBuffer(size), 0);

		this.writeAddress = 0;
		this.readBitsRemaining = 0;
		this.readAddress = 0;

		this.command = 0;
		this.commandBitsRemaining = 0;

		this.realSize = 0;
		this.addressBits = 0;
		this.writePending = false;

		this.dma = mmu.core.irq.dma[3];

		this.COMMAND_NULL = 0;
		this.COMMAND_PENDING = 1;
		this.COMMAND_WRITE = 2;
		this.COMMAND_READ_PENDING = 3;
		this.COMMAND_READ = 4;
	}
	load8(offset): number {
		throw new Error('Unsupported 8-bit access!');
	}
	load16(offset) {
		return this.loadU16(offset);
	}
	loadU8(offset): number {
		throw new Error('Unsupported 8-bit access!');
	}
	loadU16(offset) {
		if (this.command != this.COMMAND_READ || !this.dma.enable) {
			return 1;
		}
		--this.readBitsRemaining;
		if (this.readBitsRemaining < 64) {
			var step = 63 - this.readBitsRemaining;
			var data =
				this.view.getUint8((this.readAddress + step) >> 3) >>
				(0x7 - (step & 0x7));
        // this.view.getUint8((this.readAddress + step) >> 3, false) >>
				// (0x7 - (step & 0x7));
			if (!this.readBitsRemaining) {
				this.command = this.COMMAND_NULL;
			}
			return data & 0x1;
		}
		return 0;
	}
	load32(offset): number {
		throw new Error('Unsupported 32-bit access!');
	}
	store8(offset, value) {
		throw new Error('Unsupported 8-bit access!');
	}
	store16(offset, value) {
		switch (this.command) {
			// Read header
			case this.COMMAND_NULL:
			default:
				this.command = value & 0x1;
				break;
			case this.COMMAND_PENDING:
				this.command <<= 1;
				this.command |= value & 0x1;
				if (this.command == this.COMMAND_WRITE) {
					if (!this.realSize) {
						var bits = this.dma.count - 67;
						this.realSize = 8 << bits;
						this.addressBits = bits;
					}
					this.commandBitsRemaining = this.addressBits + 64 + 1;
					this.writeAddress = 0;
				} else {
					if (!this.realSize) {
						var bits = this.dma.count - 3;
						this.realSize = 8 << bits;
						this.addressBits = bits;
					}
					this.commandBitsRemaining = this.addressBits + 1;
					this.readAddress = 0;
				}
				break;
			// Do commands
			case this.COMMAND_WRITE:
				// Write
				if (--this.commandBitsRemaining > 64) {
					this.writeAddress <<= 1;
					this.writeAddress |= (value & 0x1) << 6;
				} else if (this.commandBitsRemaining <= 0) {
					this.command = this.COMMAND_NULL;
					this.writePending = true;
				} else {
					var current = this.view.getUint8(this.writeAddress >> 3);
					current &= ~(1 << (0x7 - (this.writeAddress & 0x7)));
					current |=
						(value & 0x1) << (0x7 - (this.writeAddress & 0x7));
					this.view.setUint8(this.writeAddress >> 3, current);
					++this.writeAddress;
				}
				break;
			case this.COMMAND_READ_PENDING:
				// Read
				if (--this.commandBitsRemaining > 0) {
					this.readAddress <<= 1;
					if (value & 0x1) {
						this.readAddress |= 0x40;
					}
				} else {
					this.readBitsRemaining = 68;
					this.command = this.COMMAND_READ;
				}
				break;
		}
	}
	store32(offset, value) {
		throw new Error('Unsupported 32-bit access!');
	}
	replaceData(memory) {
		MemoryView.prototype.replaceData.call(this, memory, 0);
	}
}
