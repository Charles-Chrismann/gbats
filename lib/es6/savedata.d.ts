export declare class MemoryView {
    buffer: any;
    view: DataView;
    mask: number;
    mask8: number;
    mask16: number;
    mask32: number;
    icache: any[];
    constructor(memory: any, offset?: any);
    resetMask(): void;
    load8(offset: any): number;
    load16(offset: any): number;
    loadU8(offset: any): number;
    loadU16(offset: any): number;
    load32(offset: any): number;
    store8(offset: any, value: any): void;
    store16(offset: any, value: any): void;
    store32(offset: any, value: any): void;
    invalidatePage(address: any): void;
    replaceData(memory: any, offset: any): void;
}
export declare class SRAMSavedata extends MemoryView {
    writePending: boolean;
    constructor(size: any);
    store8(offset: any, value: any): void;
    store16(offset: any, value: any): void;
    store32(offset: any, value: any): void;
}
export declare class FlashSavedata extends MemoryView {
    COMMAND_WIPE: number;
    COMMAND_ERASE_SECTOR: number;
    COMMAND_ERASE: number;
    COMMAND_ID: number;
    COMMAND_WRITE: number;
    COMMAND_SWITCH_BANK: number;
    COMMAND_TERMINATE_ID: number;
    ID_PANASONIC: number;
    ID_SANYO: number;
    bank0: DataView;
    id: number;
    bank1: DataView;
    bank: DataView;
    idMode: boolean;
    writePending: boolean;
    first: number;
    second: number;
    command: number;
    pendingCommand: number;
    constructor(size: any);
    load8(offset: any): number;
    load16(offset: any): number;
    load32(offset: any): number;
    loadU8(offset: any): number;
    loadU16(offset: any): number;
    store8(offset: any, value: any): void;
    store16(offset: any, value: any): void;
    store32(offset: any, value: any): void;
    replaceData(memory: any): void;
}
export declare class EEPROMSavedata extends MemoryView {
    writeAddress: number;
    readBitsRemaining: number;
    readAddress: number;
    command: number;
    commandBitsRemaining: number;
    realSize: number;
    addressBits: number;
    writePending: boolean;
    dma: any;
    COMMAND_NULL: number;
    COMMAND_PENDING: number;
    COMMAND_WRITE: number;
    COMMAND_READ_PENDING: number;
    COMMAND_READ: number;
    constructor(size: any, mmu: any);
    load8(offset: any): number;
    load16(offset: any): number;
    loadU8(offset: any): number;
    loadU16(offset: any): number;
    load32(offset: any): number;
    store8(offset: any, value: any): void;
    store16(offset: any, value: any): void;
    store32(offset: any, value: any): void;
    replaceData(memory: any): void;
}
