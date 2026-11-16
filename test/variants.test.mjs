import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import StructCodec from '../build/index.js';
import { parseProtocol, StructCodecError } from '../build/index.js';

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, 'fixtures', 'variants.h'), 'utf8');
const protocol = () => parseProtocol(source, { file: 'variants.h' });

test('layout: пустая, простая, вложенная и большая структуры', () => {
  const parsed = protocol();

  assert.equal(parsed.structs.Empty.size, 1);
  assert.equal(parsed.structs.Inner.size, 3);
  assert.deepEqual(
    parsed.structs.Inner.fields.map((field) => [field.name, field.offset]),
    [
      ['a', 0],
      ['b', 1],
    ],
  );

  assert.equal(parsed.structs.Deep.size, 10);
  assert.deepEqual(
    parsed.structs.Deep.fields.map((field) => [field.name, field.offset]),
    [
      ['one', 0],
      ['many', 3],
      ['tail', 9],
    ],
  );

  assert.equal(parsed.structs.Full.size, 98);
  assert.deepEqual(
    parsed.structs.Full.fields.map((field) => [field.name, field.offset]),
    [
      ['key', 0],
      ['i8', 1],
      ['u8', 2],
      ['i16', 3],
      ['u16', 5],
      ['i32', 7],
      ['u32', 11],
      ['f32', 15],
      ['f64', 19],
      ['u64', 27],
      ['i64', 35],
      ['flag', 43],
      ['text', 44],
      ['bytes', 52],
      ['grid', 55],
      ['inner', 67],
      ['list', 70],
      ['deep', 76],
      ['matrix', 86],
    ],
  );

  const fields = Object.fromEntries(parsed.structs.Full.fields.map((field) => [field.name, field]));
  assert.equal(fields.grid.type, 'uint16_t');
  assert.deepEqual(fields.grid.dimensions, [2, 3]);
  assert.equal(fields.matrix.kind, 'struct');
  assert.equal(fields.matrix.type, 'Inner');
  assert.deepEqual(fields.matrix.dimensions, [2, 2]);
  assert.equal(fields.text.type, 'char');
  assert.deepEqual(fields.text.dimensions, [8]);
});

test('enum-выражения считаются корректно', () => {
  const parsed = protocol();

  assert.deepEqual(parsed.enums.MODE, { A: 1, B: 2, AB: 3, D: 7 });
});

const fullPayload = {
  i8: -128,
  u8: 255,
  i16: -32768,
  u16: 65535,
  i32: -2147483648,
  u32: 4294967295,
  f32: 1.5,
  f64: -2.25,
  u64: 9007199254740991,
  i64: -9007199254740991,
  flag: true,
  text: 'дом',
  bytes: [1, 2, 255],
  grid: [
    [1, 2, 3],
    [4, 5, 6],
  ],
  inner: { a: 7, b: 65000 },
  list: [
    { a: 1, b: 2 },
    { a: 3, b: 4 },
  ],
  deep: {
    one: { a: 5, b: 6 },
    many: [
      { a: 7, b: 8 },
      { a: 9, b: 10 },
    ],
    tail: 11,
  },
  matrix: [
    [
      { a: 1, b: 1 },
      { a: 2, b: 2 },
    ],
    [
      { a: 3, b: 3 },
      { a: 4, b: 4 },
    ],
  ],
};

test('round-trip: все типы, вложенность, массивы, двумерные массивы', () => {
  const codec = new StructCodec().init(protocol());

  const buffer = codec.set('FULL', fullPayload);
  assert.equal(buffer.byteLength, 98);

  const { key, object } = codec.get(buffer);
  assert.equal(key, 1);
  assert.equal(object.key, 1);

  for (const [field, value] of Object.entries(fullPayload)) {
    assert.deepEqual(object[field], value, `поле ${field}`);
  }
});

test('по умолчанию все поля нулевые, массивы нужной формы', () => {
  const codec = new StructCodec().init(protocol());

  const { object } = codec.get(codec.set('FULL', {}));

  assert.equal(object.key, 1);
  assert.equal(object.i8, 0);
  assert.equal(object.u64, 0);
  assert.equal(object.i64, 0);
  assert.equal(object.flag, false);
  assert.equal(object.text, '');
  assert.deepEqual(object.bytes, [0, 0, 0]);
  assert.deepEqual(object.grid, [
    [0, 0, 0],
    [0, 0, 0],
  ]);
  assert.deepEqual(object.inner, { a: 0, b: 0 });
  assert.deepEqual(object.list, [
    { a: 0, b: 0 },
    { a: 0, b: 0 },
  ]);
  assert.deepEqual(object.deep, {
    one: { a: 0, b: 0 },
    many: [
      { a: 0, b: 0 },
      { a: 0, b: 0 },
    ],
    tail: 0,
  });
  assert.deepEqual(object.matrix, [
    [
      { a: 0, b: 0 },
      { a: 0, b: 0 },
    ],
    [
      { a: 0, b: 0 },
      { a: 0, b: 0 },
    ],
  ]);
});

test('минимальная структура: set/get без полей', () => {
  const codec = new StructCodec().init(protocol());

  const buffer = codec.set('EMPTY');
  assert.equal(buffer.byteLength, 1);
  assert.deepEqual(codec.get(buffer), { key: 0, object: { key: 0 } });
});

test('ключ по номеру работает для большой структуры', () => {
  const codec = new StructCodec().init(protocol());

  const buffer = codec.set(1, {
    inner: { a: 1, b: 2 },
    list: [
      { a: 3, b: 4 },
      { a: 5, b: 6 },
    ],
    deep: { one: { a: 7, b: 8 }, many: [{ a: 9, b: 10 }, { a: 11, b: 12 }], tail: 13 },
  });

  assert.equal(codec.sizeOf(1), 98);
  const { object } = codec.get(buffer);
  assert.deepEqual(object.inner, { a: 1, b: 2 });
  assert.deepEqual(object.list, [
    { a: 3, b: 4 },
    { a: 5, b: 6 },
  ]);
  assert.deepEqual(object.deep, {
    one: { a: 7, b: 8 },
    many: [
      { a: 9, b: 10 },
      { a: 11, b: 12 },
    ],
    tail: 13,
  });
});

test('компактное описание без offset/size/kind', () => {
  const parsed = protocol();
  const compact = {
    enums: parsed.enums,
    structs: Object.fromEntries(
      Object.entries(parsed.structs).map(([name, def]) => [
        name,
        {
          fields: def.fields.map(({ name, type, dimensions }) => ({ name, type, ...(dimensions ? { dimensions } : {}) })),
        },
      ]),
    ),
  };

  const codec = new StructCodec().init(compact);
  const buffer = codec.set('FULL', fullPayload);

  assert.equal(buffer.byteLength, 98);
  assert.deepEqual(codec.get(buffer).object, { ...fullPayload, key: 1 });
  assert.equal(codec.sizeOf('FULL'), 98);
});

test('ошибки: формы многомерных массивов', () => {
  const codec = new StructCodec().init(protocol());

  assert.throws(
    () => codec.set('FULL', { grid: [[1, 2, 3]] }),
    (error) => error instanceof StructCodecError && /FULL\.grid: ожидался массив длиной 2/.test(error.message),
  );

  assert.throws(
    () => codec.set('FULL', { grid: [[1, 2, 3], [4, 5]] }),
    /FULL\.grid\[1\]: ожидался массив длиной 3/,
  );

  assert.throws(
    () => codec.set('FULL', { matrix: [[{ a: 1, b: 1 }]] }),
    /FULL\.matrix: ожидался массив длиной 2/,
  );

  assert.throws(
    () => codec.set('FULL', { deep: { many: [{ a: 1, b: 2 }], one: { a: 0, b: 0 }, tail: 0 } }),
    /FULL\.deep\.many: ожидался массив длиной 2/,
  );
});

test('ошибки: строка и тип значения', () => {
  const codec = new StructCodec().init(protocol());

  assert.throws(() => codec.set('FULL', { text: 'слишком длинная строка' }), /FULL\.text: строка длиннее 7 байт/);
  assert.throws(() => codec.set('FULL', { i8: 'нет' }), /FULL\.i8: ожидалось число/);
  assert.throws(() => codec.set('FULL', { inner: 42 }), /FULL\.inner: ожидался объект/);
});
