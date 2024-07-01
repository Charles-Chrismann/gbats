import { GameBoyAdvance } from './gba';
import { hex } from './util'

export class GameBoyAdvanceSIO {
  core: GameBoyAdvance

  SIO_NORMAL_8: number
	SIO_NORMAL_32: number
	SIO_MULTI: number
	SIO_UART: number
	SIO_GPIO: number
	SIO_JOYBUS: number

	BAUD: number[]

  mode: number
  sd: boolean
  irq: any
  multiplayer: any
  linkLayer: any

	constructor() {
		this.SIO_NORMAL_8 = 0;
		this.SIO_NORMAL_32 = 1;
		this.SIO_MULTI = 2;
		this.SIO_UART = 3;
		this.SIO_GPIO = 8;
		this.SIO_JOYBUS = 12;

		this.BAUD = [9600, 38400, 57600, 115200];
	}
	clear() {
		this.mode = this.SIO_GPIO;
		this.sd = false;

		this.irq = false;
		this.multiplayer = {
			baud: 0,
			si: 0,
			id: 0,
			error: 0,
			busy: 0,

			states: [0xffff, 0xffff, 0xffff, 0xffff]
		};

		this.linkLayer = null;
	}
	setMode(mode) {
		if (mode & 0x8) {
			mode &= 0xc;
		} else {
			mode &= 0x3;
		}
		this.mode = mode;

		this.core.INFO("Setting SIO mode to " + hex(mode, 1));
	}
	writeRCNT(value) {
		if (this.mode != this.SIO_GPIO) {
			return;
		}

		this.core.STUB("General purpose serial not supported");
	}
	writeSIOCNT(value) {
		switch (this.mode) {
			case this.SIO_NORMAL_8:
				this.core.STUB("8-bit transfer unsupported");
				break;
			case this.SIO_NORMAL_32:
				this.core.STUB("32-bit transfer unsupported");
				break;
			case this.SIO_MULTI:
				this.multiplayer.baud = value & 0x0003;
				if (this.linkLayer) {
					this.linkLayer.setBaud(this.BAUD[this.multiplayer.baud]);
				}

				if (!this.multiplayer.si) {
					this.multiplayer.busy = value & 0x0080;
					if (this.linkLayer && this.multiplayer.busy) {
						this.linkLayer.startMultiplayerTransfer();
					}
				}
				this.irq = value & 0x4000;
				break;
			case this.SIO_UART:
				this.core.STUB("UART unsupported");
				break;
			case this.SIO_GPIO:
				// This register isn't used in general-purpose mode
				break;
			case this.SIO_JOYBUS:
				this.core.STUB("JOY BUS unsupported");
				break;
		}
	}
	readSIOCNT() {
		var value = (this.mode << 12) & 0xffff;
		switch (this.mode) {
			case this.SIO_NORMAL_8:
				this.core.STUB("8-bit transfer unsupported");
				break;
			case this.SIO_NORMAL_32:
				this.core.STUB("32-bit transfer unsupported");
				break;
			case this.SIO_MULTI:
				value |= this.multiplayer.baud;
				value |= this.multiplayer.si;
				value |= (!!this.sd) as unknown as number << 3;
				value |= this.multiplayer.id << 4;
				value |= this.multiplayer.error;
				value |= this.multiplayer.busy;
				value |= (!!this.multiplayer.irq) as unknown as number << 14;
				break;
			case this.SIO_UART:
				this.core.STUB("UART unsupported");
				break;
			case this.SIO_GPIO:
				// This register isn't used in general-purpose mode
				break;
			case this.SIO_JOYBUS:
				this.core.STUB("JOY BUS unsupported");
				break;
		}
		return value;
	}
	read(slot) {
		switch (this.mode) {
			case this.SIO_NORMAL_32:
				this.core.STUB("32-bit transfer unsupported");
				break;
			case this.SIO_MULTI:
				return this.multiplayer.states[slot];
			case this.SIO_UART:
				this.core.STUB("UART unsupported");
				break;
			default:
				this.core.WARN(
					"Reading from transfer register in unsupported mode"
				);
				break;
		}
		return 0;
	}
}
