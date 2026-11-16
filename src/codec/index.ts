import { PRIMITIVE_SIZES, type IProtocolField } from '../protocol/types.js';

export class StructCodecError extends Error {
  constructor(
    message: string,
    readonly path?: string,
  ) {
    super(path ? `${path}: ${message}` : message);
    this.name = 'StructCodecError';
  }
}

interface ICompiledField {
  name: string;
  offset: number;
  size: number;
  itemSize: number;
  type: string;
  kind: 'scalar' | 'struct';
  dimensions: number[];
  default: unknown;
}

interface ICompiledStruct {
  name: string;
  size: number;
  fields: ICompiledField[];
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const isPrimitive = (type: string): boolean => Object.prototype.hasOwnProperty.call(PRIMITIVE_SIZES, type);

const product = (values: number[]): number => values.reduce((acc, value) => acc * value, 1);

const emptyValue = (type: string, kind: 'scalar' | 'struct', dimensions: number[], compile: (name: string) => ICompiledStruct): unknown => {
  if (type === 'char' && kind === 'scalar' && dimensions.length) return '';
  if (dimensions.length) {
    return new Array(dimensions[0]).fill(null).map(() => emptyValue(type, kind, dimensions.slice(1), compile));
  }
  if (kind === 'struct') return createEmptyObject(compile(type));
  if (type === 'char') return '';
  if (type === 'bool') return false;
  return 0;
};

const createEmptyObject = (compiled: ICompiledStruct): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const field of compiled.fields) {
    result[field.name] = cloneValue(field.default);
  }
  return result;
};

const cloneValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value !== null && typeof value === 'object') return { ...(value as Record<string, unknown>) };
  return value;
};

export interface ICodecField {
  name: string;
  type: string;
  dimensions?: readonly number[];
}

export type ICodecStruct = readonly ICodecField[] | { readonly fields: readonly ICodecField[] };

export interface ICodecOptions {
  enums?: Record<string, Record<string, number>>;
  structs: Record<string, ICodecStruct>;
}

export class StructCodec {
  private enums: Record<string, Record<string, number>> = {};
  private keyToIndex = new Map<string, number>();
  private indexToKey = new Map<number, string>();
  private structs = new Map<string, ICompiledStruct>();
  private keyStructs = new Map<string, ICompiledStruct>();

  init(options: ICodecOptions): this {
    this.enums = options.enums ?? {};
    this.structs.clear();
    this.keyStructs.clear();
    this.keyToIndex.clear();
    this.indexToKey.clear();

    const keys = this.enums.KEY ?? {};
    const compiledByRawName = new Map<string, ICompiledStruct>();

    const compile = (name: string): ICompiledStruct => {
      const cached = compiledByRawName.get(name);
      if (cached) return cached;

      const raw = options.structs[name];
      if (!raw) throw new StructCodecError(`неизвестная структура "${name}"`);

      const rawFields = 'fields' in raw ? raw.fields : raw;
      const fields: ICompiledField[] = [];
      let offset = 0;

      for (const field of rawFields) {
        const itemSize = isPrimitive(field.type) ? PRIMITIVE_SIZES[field.type as keyof typeof PRIMITIVE_SIZES] : compile(field.type).size;
        const dimensions = [...(field.dimensions ?? [])];
        const size = itemSize * product(dimensions);
        const kind: 'scalar' | 'struct' = isPrimitive(field.type) ? 'scalar' : 'struct';

        fields.push({
          name: field.name,
          offset,
          size,
          itemSize,
          type: field.type,
          kind,
          dimensions,
          default: emptyValue(field.type, kind, dimensions, compile),
        });

        offset += size;
      }

      const compiled: ICompiledStruct = { name, size: offset, fields };
      compiledByRawName.set(name, compiled);
      return compiled;
    };

    for (const name of Object.keys(options.structs)) {
      this.structs.set(name, compile(name));
    }

    for (const [key, index] of Object.entries(keys)) {
      this.keyToIndex.set(key, index);
      this.indexToKey.set(index, key);

      const structName = [...this.structs.keys()].find((name) => name.toLowerCase() === key.toLowerCase());
      this.keyStructs.set(key, structName ? this.structs.get(structName)! : this.createKeyOnlyStruct());
    }

    return this;
  }

  get key(): Record<string, number> {
    return this.enums.KEY ?? {};
  }

  get cmd(): Record<string, number> {
    return this.enums.CMD ?? {};
  }

  sizeOf(key: string | number): number {
    return this.resolveStruct(key).size;
  }

  set(key: string | number, data?: Record<string, unknown>): ArrayBuffer {
    const { name, index } = this.resolveKey(key);

    if (data === undefined) {
      const buffer = new ArrayBuffer(1);
      new DataView(buffer).setUint8(0, index);
      return buffer;
    }

    const struct = this.keyStructs.get(name) ?? this.createKeyOnlyStruct();

    const buffer = new ArrayBuffer(struct.size);
    const view = new DataView(buffer);

    if (struct.size >= 1) view.setUint8(0, index);
    this.writeStruct(struct, data, view, 0, name);

    return buffer;
  }

  get(buffer: ArrayBuffer): { key: number; object: Record<string, unknown> } | null {
    if (!(buffer instanceof ArrayBuffer)) throw new StructCodecError('ожидался ArrayBuffer');
    if (buffer.byteLength < 1) throw new StructCodecError('пустое сообщение');

    const view = new DataView(buffer);
    const index = view.getUint8(0);
    const name = this.indexToKey.get(index);
    if (!name) throw new StructCodecError(`неизвестный ключ ${index}`);

    const struct = this.keyStructs.get(name) ?? this.createKeyOnlyStruct();
    if (buffer.byteLength < struct.size) {
      throw new StructCodecError(`сообщение ${name} короче ожидаемого (${buffer.byteLength} < ${struct.size})`);
    }

    return { key: index, object: this.readStruct(struct, view, 0) };
  }


  private writeStruct(struct: ICompiledStruct, data: Record<string, unknown>, view: DataView, base: number, path: string): void {
    for (const field of struct.fields) {
      if (field.name === 'key') continue;

      const value = data[field.name] ?? field.default;
      const fieldPath = `${path}.${field.name}`;

      if (field.type === 'char' && field.kind === 'scalar' && field.dimensions.length) {
        this.writeChar(value, view, base + field.offset, field.size, fieldPath);
        continue;
      }

      if (!field.dimensions.length) {
        this.writeValue(field, value, view, base + field.offset, fieldPath);
      } else {
        this.writeArray(field, field.dimensions, value, view, base + field.offset, fieldPath);
      }
    }
  }

  private writeArray(field: ICompiledField, dimensions: number[], value: unknown, view: DataView, offset: number, path: string): void {
    const length = dimensions[0];
    if (!Array.isArray(value) || value.length !== length) {
      throw new StructCodecError(`ожидался массив длиной ${length}`, path);
    }

    const rest = dimensions.slice(1);
    const stride = field.itemSize * product(rest);

    for (let i = 0; i < length; i += 1) {
      const itemPath = `${path}[${i}]`;
      if (rest.length) this.writeArray(field, rest, value[i], view, offset + i * stride, itemPath);
      else this.writeValue(field, value[i], view, offset + i * field.itemSize, itemPath);
    }
  }

  private writeValue(field: ICompiledField, value: unknown, view: DataView, offset: number, path: string): void {
    if (field.kind === 'struct') {
      if (value === null || typeof value !== 'object') throw new StructCodecError('ожидался объект', path);
      this.writeStruct(this.structs.get(field.type)!, value as Record<string, unknown>, view, offset, path);
      return;
    }

    switch (field.type) {
      case 'uint8_t':
        view.setUint8(offset, this.toNumber(value, path));
        return;
      case 'int8_t':
        view.setInt8(offset, this.toNumber(value, path));
        return;
      case 'bool':
        view.setUint8(offset, value ? 1 : 0);
        return;
      case 'char':
        this.writeChar(value, view, offset, field.itemSize, path);
        return;
      case 'uint16_t':
        view.setUint16(offset, this.toNumber(value, path), true);
        return;
      case 'int16_t':
        view.setInt16(offset, this.toNumber(value, path), true);
        return;
      case 'uint32_t':
        view.setUint32(offset, this.toNumber(value, path), true);
        return;
      case 'int32_t':
        view.setInt32(offset, this.toNumber(value, path), true);
        return;
      case 'float':
        view.setFloat32(offset, Number(value ?? 0), true);
        return;
      case 'uint64_t':
        view.setBigUint64(offset, BigInt(Math.trunc(Number(value ?? 0))), true);
        return;
      case 'int64_t':
        view.setBigInt64(offset, BigInt(Math.trunc(Number(value ?? 0))), true);
        return;
      case 'double':
        view.setFloat64(offset, Number(value ?? 0), true);
        return;
      default:
        throw new StructCodecError(`неизвестный тип "${field.type}"`, path);
    }
  }

  private writeChar(value: unknown, view: DataView, offset: number, length: number, path: string): void {
    if (typeof value !== 'string') throw new StructCodecError('ожидалась строка', path);

    const bytes = textEncoder.encode(value);
    if (bytes.length >= length) {
      throw new StructCodecError(`строка длиннее ${length - 1} байт`, path);
    }

    for (let i = 0; i < length; i += 1) view.setUint8(offset + i, i < bytes.length ? bytes[i] : 0);
  }


  private readStruct(struct: ICompiledStruct, view: DataView, base: number): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const field of struct.fields) {
      if (field.type === 'char' && field.kind === 'scalar' && field.dimensions.length) {
        result[field.name] = this.readChar(view, base + field.offset, field.size);
        continue;
      }

      if (!field.dimensions.length) {
        result[field.name] = this.readValue(field, view, base + field.offset);
      } else {
        result[field.name] = this.readArray(field, field.dimensions, view, base + field.offset);
      }
    }

    return result;
  }

  private readArray(field: ICompiledField, dimensions: number[], view: DataView, offset: number): unknown[] {
    const length = dimensions[0];
    const rest = dimensions.slice(1);
    const stride = field.itemSize * product(rest);
    const result: unknown[] = [];

    for (let i = 0; i < length; i += 1) {
      if (rest.length) result.push(this.readArray(field, rest, view, offset + i * stride));
      else result.push(this.readValue(field, view, offset + i * field.itemSize));
    }

    return result;
  }

  private readValue(field: ICompiledField, view: DataView, offset: number): unknown {
    if (field.kind === 'struct') return this.readStruct(this.structs.get(field.type)!, view, offset);

    switch (field.type) {
      case 'uint8_t':
        return view.getUint8(offset);
      case 'int8_t':
        return view.getInt8(offset);
      case 'bool':
        return view.getUint8(offset) !== 0;
      case 'char':
        return this.readChar(view, offset, field.itemSize);
      case 'uint16_t':
        return view.getUint16(offset, true);
      case 'int16_t':
        return view.getInt16(offset, true);
      case 'uint32_t':
        return view.getUint32(offset, true);
      case 'int32_t':
        return view.getInt32(offset, true);
      case 'float':
        return view.getFloat32(offset, true);
      case 'uint64_t':
        return Number(view.getBigUint64(offset, true));
      case 'int64_t':
        return Number(view.getBigInt64(offset, true));
      case 'double':
        return view.getFloat64(offset, true);
      default:
        throw new StructCodecError(`неизвестный тип "${field.type}"`, field.name);
    }
  }

  private readChar(view: DataView, offset: number, length: number): string {
    const bytes = new Uint8Array(length);
    let size = 0;

    for (let i = 0; i < length; i += 1) {
      const byte = view.getUint8(offset + i);
      if (byte === 0) break;
      bytes[size] = byte;
      size += 1;
    }

    return textDecoder.decode(bytes.subarray(0, size));
  }


  private resolveKey(key: string | number): { name: string; index: number } {
    if (typeof key === 'number') {
      const name = this.indexToKey.get(key);
      if (!name) throw new StructCodecError(`неизвестный ключ ${key}`);
      return { name, index: key };
    }

    const index = this.keyToIndex.get(key);
    if (index === undefined) throw new StructCodecError(`неизвестный ключ "${key}"`);
    return { name: key, index };
  }

  private resolveStruct(key: string | number): ICompiledStruct {
    const { name } = this.resolveKey(key);
    return this.keyStructs.get(name) ?? this.createKeyOnlyStruct();
  }

  private createKeyOnlyStruct(): ICompiledStruct {
    return {
      name: 'KeyOnly',
      size: 1,
      fields: [{ name: 'key', offset: 0, size: 1, itemSize: 1, type: 'uint8_t', kind: 'scalar', dimensions: [], default: 0 }],
    };
  }

  private toNumber(value: unknown, path: string): number {
    const number = typeof value === 'boolean' ? Number(value) : typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

    if (typeof number !== 'number' || !Number.isFinite(number)) {
      throw new StructCodecError('ожидалось число', path);
    }
    return Math.trunc(number);
  }
}

export type { IProtocolField };
