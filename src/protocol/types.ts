export type TPrimitive =
  | 'uint8_t'
  | 'uint16_t'
  | 'uint32_t'
  | 'uint64_t'
  | 'int8_t'
  | 'int16_t'
  | 'int32_t'
  | 'int64_t'
  | 'float'
  | 'double'
  | 'bool'
  | 'char';

export const PRIMITIVE_SIZES: Record<TPrimitive, number> = {
  uint8_t: 1,
  int8_t: 1,
  bool: 1,
  char: 1,
  uint16_t: 2,
  int16_t: 2,
  uint32_t: 4,
  int32_t: 4,
  float: 4,
  uint64_t: 8,
  int64_t: 8,
  double: 8,
};

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
