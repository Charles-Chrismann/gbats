export declare class GameBoyAdvanceGPIO {
    core: any;
    rom: any;
    readWrite: any;
    direction: any;
    device: GameBoyAdvanceRTC;
    constructor(core: any, rom: any);
    store16(offset: any, value: any): void;
    outputPins(nybble: any): void;
}
export declare class GameBoyAdvanceRTC {
    gpio: any;
    pins: number;
    direction: number;
    totalBytes: number[];
    bytesRemaining: number;
    transferStep: number;
    reading: number;
    bitsRead: number;
    bits: number;
    command: number;
    time: number[];
    control: number;
    read: any;
    constructor(gpio: any);
    setPins(nybble: any): void;
    setDirection(direction: any): void;
    processByte(): void;
    sioOutputPin(): number;
    updateClock(): void;
    bcd(binary: any): number;
}
