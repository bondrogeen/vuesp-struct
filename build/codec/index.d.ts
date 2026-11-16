import { type IProtocolField } from '../protocol/types.js';
export declare class StructCodecError extends Error {
    readonly path?: string | undefined;
    constructor(message: string, path?: string | undefined);
}
export interface ICodecField {
    name: string;
    type: string;
    dimensions?: readonly number[];
}
export type ICodecStruct = readonly ICodecField[] | {
    readonly fields: readonly ICodecField[];
};
export interface ICodecOptions {
    enums?: Record<string, Record<string, number>>;
    structs: Record<string, ICodecStruct>;
}
export declare class StructCodec {
    private enums;
    private keyToIndex;
    private indexToKey;
    private structs;
    private keyStructs;
    init(options: ICodecOptions): this;
    get key(): Record<string, number>;
    get cmd(): Record<string, number>;
    sizeOf(key: string | number): number;
    set(key: string | number, data?: Record<string, unknown>): ArrayBuffer;
    get(buffer: ArrayBuffer): {
        key: number;
        object: Record<string, unknown>;
    } | null;
    private writeStruct;
    private writeArray;
    private writeValue;
    private writeChar;
    private readStruct;
    private readArray;
    private readValue;
    private readChar;
    private resolveKey;
    private resolveStruct;
    private createKeyOnlyStruct;
    private toNumber;
}
export type { IProtocolField };
