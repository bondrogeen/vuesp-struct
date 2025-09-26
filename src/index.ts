import Struct from 'c-struct-to-json';

type StructField = {
  type: string;
  name: string;
  length?: number;
  byteOffset?: number;
};

type StructsMap = Record<string, StructField[]>;

interface InitOptions {
  keys?: string[];
  structs?: StructsMap;
}

interface StructInstance {
  setObject(obj: Record<string, unknown>): StructInstance;
  getBuffer(): ArrayBuffer;
  setBuffer(buffer: ArrayBuffer): StructInstance;
  getObject(): Record<string, unknown>;
}

class VuespStructs {
  #keys: string[];
  #structs: Record<string, StructInstance>;
  #isOk: boolean;

  constructor() {
    this.#keys = [];
    this.#structs = {};
    this.#isOk = false;
  }

  init({ keys = [], structs = {} }: InitOptions): void {
    this.#keys = keys;
    for (const key in structs) {
      const name = key.toUpperCase();
      this.#structs[name] = new Struct(structs[key]);
      this.#isOk = true;
    }
  }

  set(name: string, data?: Record<string, unknown>): ArrayBuffer | null | false {
    // console.log(this.#isOk);
    if (!this.#isOk) {
      console.warn(`Struct not init`);
      return false;
    }

    const index = typeof name === 'string' ? this.#keys.findIndex(i => i === name) : name;
    const key = this.#keys[index];

    const struct = this.#structs[key];
    if (struct && data) {
      return struct.setObject({ ...data, key: index }).getBuffer();
    }
    if (typeof index !== 'undefined' && this.#structs['INIT']) {
      return this.#structs['INIT'].setObject({ key: index }).getBuffer();
    }
    console.warn(`No struct or key ${key}`, data);
    return null;
  }

  get(data: ArrayBuffer): { object: Record<string, unknown>; key: string } | null | false {
    if (!this.#isOk) {
      console.warn(`Struct not init`);
      return false;
    }
    if (data instanceof ArrayBuffer) {
      const [keyIndex] = new Uint8Array(data);
      const name = this.#keys[keyIndex];
      const struct = this.#structs[name];
      if (struct) {
        const object = struct.setBuffer(data).getObject();
        return { object, key: name };
      }
      console.warn(`No struct in data`);
      return null;
    }
    console.warn(`No data or data not ArrayBuffer`);
    return null;
  }

  static parseStruct(data: string): unknown {
    return Struct.parseStruct(data);
  }
}

export default VuespStructs;
