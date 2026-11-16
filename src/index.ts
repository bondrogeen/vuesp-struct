import { StructCodec } from './codec/index.js';

export default StructCodec;

export { StructCodec, StructCodecError } from './codec/index.js';
export type { ICodecOptions } from './codec/index.js';

export { parseProtocol, ProtocolParseError, stripEnumPrefix } from './protocol/parser.js';
export type {
  IProtocol,
  IProtocolStruct,
  IProtocolField,
  IParseOptions,
  TPrimitive,
  TValueKind,
} from './protocol/types.js';
export { PRIMITIVE_SIZES } from './protocol/types.js';
