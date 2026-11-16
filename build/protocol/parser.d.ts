import { type IParseOptions, type IProtocol } from './types.js';
export declare class ProtocolParseError extends Error {
    readonly line: number;
    readonly column: number;
    readonly file?: string | undefined;
    constructor(message: string, line?: number, column?: number, file?: string | undefined);
}
export declare const stripEnumPrefix: (name: string) => string;
export declare const parseProtocol: (source: string, options?: IParseOptions) => IProtocol;
