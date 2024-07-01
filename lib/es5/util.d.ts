export declare function hex(number: any, leading: any, usePrefix?: any): string;
export declare class Pointer {
    index: number;
    top: number;
    stack: any[];
    constructor();
    advance(amount: any): number;
    mark(): number;
    push(): void;
    pop(): void;
    readString(view: any): string;
}
export declare class Serializer {
    static TAG_INT: number;
    static TAG_STRING: number;
    static TAG_STRUCT: number;
    static TAG_BLOB: number;
    static TAG_BOOLEAN: number;
    static TYPE: string;
    static pack(value: any): ArrayBuffer;
    static pack8(value: any): ArrayBuffer;
    static prefix(value: any): Blob;
    static serialize(stream: any): Blob;
    static deserialize(blob: any, callback: any): void;
    static deserealizeStream(view: any, pointer: any): {};
    static serializePNG(blob: any, base: any, callback: any): HTMLCanvasElement;
    static deserializePNG(blob: any, callback: any): void;
}
