export type TPrimitive = 'uint8_t' | 'uint16_t' | 'uint32_t' | 'uint64_t' | 'int8_t' | 'int16_t' | 'int32_t' | 'int64_t' | 'float' | 'double' | 'bool' | 'char';
export declare const PRIMITIVE_SIZES: Record<TPrimitive, number>;
export type TValueKind = 'scalar' | 'struct';
export interface IProtocolField {
    name: string;
    kind: TValueKind;
    type: string;
    offset: number;
    dimensions?: number[];
    description?: string;
}
export interface IProtocolStruct {
    size: number;
    fields: IProtocolField[];
}
export interface IProtocol {
    protocol: 2;
    enums: Record<string, Record<string, number>>;
    flagGroups: string[];
    structs: Record<string, IProtocolStruct>;
    descriptions: Record<string, string>;
}
export interface IParseOptions {
    file?: string;
    maxStructSize?: number;
}
