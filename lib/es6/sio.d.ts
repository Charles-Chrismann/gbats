import { GameBoyAdvance } from './gba';
export declare class GameBoyAdvanceSIO {
    core: GameBoyAdvance;
    SIO_NORMAL_8: number;
    SIO_NORMAL_32: number;
    SIO_MULTI: number;
    SIO_UART: number;
    SIO_GPIO: number;
    SIO_JOYBUS: number;
    BAUD: number[];
    mode: number;
    sd: boolean;
    irq: any;
    multiplayer: any;
    linkLayer: any;
    constructor();
    clear(): void;
    setMode(mode: any): void;
    writeRCNT(value: any): void;
    writeSIOCNT(value: any): void;
    readSIOCNT(): number;
    read(slot: any): any;
}
