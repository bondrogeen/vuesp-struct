import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import StructCodec from '../build/index.js';
import { parseProtocol, StructCodecError } from '../build/index.js';

const dir = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(join(dir, 'fixtures', name), 'utf8');
const protocol = () => parseProtocol(fixture('protocol.h'), { file: 'protocol.h' });

test('собирает и разбирает плоское сообщение', () => {
  const codec = new StructCodec().init(parseProtocol(fixture('struct.h'), { file: 'struct.h' }));

  const buffer = codec.set('PORT', {
    gpio: 14,
    value: 255,
    mode: 128,
    command: 2,
  });

  assert.equal(buffer.byteLength, 20);
  assert.deepEqual([...new Uint8Array(buffer).slice(0, 6)], [9, 14, 255, 0, 128, 0]);

  const message = codec.get(buffer);
  assert.equal(message.key, 9);
  assert.equal(message.object.gpio, 14);
  assert.equal(message.object.value, 255);
  assert.equal(message.object.mode, 128);
  assert.equal(message.object.command, 2);
  assert.equal(message.object.key, 9);
});

test('запрос без payload — только ключ, с payload — полная структура', () => {
  const codec = new StructCodec().init(protocol());

  const request = codec.set('PORT');
  assert.equal(request.byteLength, 1);
  assert.deepEqual([...new Uint8Array(request)], [9]);

  const write = codec.set('PORT', {});
  assert.equal(write.byteLength, codec.sizeOf('PORT'));
});

test('числовые строки и boolean приводятся к числу', () => {
  const codec = new StructCodec().init(protocol());

  const { object } = codec.get(codec.set('PORT', { value: '5', gpio: true, command: '2' }));
  assert.equal(object.value, 5);
  assert.equal(object.gpio, 1);
  assert.equal(object.command, 2);

  assert.throws(() => codec.set('PORT', { value: 'нет' }), /PORT\.value: ожидалось число/);
});

test('незаполненные поля получают значения по умолчанию', () => {
  const codec = new StructCodec().init(protocol());

  const buffer = codec.set('PORT', { value: 5 });
  const { object } = codec.get(buffer);

  assert.equal(object.key, 9);
  assert.equal(object.gpio, 0);
  assert.equal(object.value, 5);
  assert.deepEqual(object.position, { x: 0, y: 0 });
  assert.deepEqual(object.trace, [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);
  assert.deepEqual(object.grid, [
    [0, 0, 0],
    [0, 0, 0],
  ]);
  assert.equal(object.name, '');
  assert.equal(object.enabled, false);
  assert.equal(object.calibrate, 0);
});

test('вложенные структуры и многомерные массивы: round-trip', () => {
  const codec = new StructCodec().init(protocol());

  const payload = {
    gpio: 7,
    value: 100,
    command: 2,
    position: { x: 1, y: 2 },
    trace: [
      { x: 10, y: 11 },
      { x: 12, y: 13 },
      { x: 14, y: 15 },
      { x: 16, y: 17 },
    ],
    grid: [
      [1, 2, 3],
      [4, 5, 6],
    ],
    name: 'дом',
    enabled: true,
    calibrate: 1.5,
  };

  const buffer = codec.set('PORT', payload);
  assert.equal(buffer.byteLength, 54);

  const { object } = codec.get(buffer);
  assert.equal(object.key, 9);
  assert.equal(object.gpio, 7);
  assert.equal(object.value, 100);
  assert.equal(object.command, 2);
  assert.deepEqual(object.position, { x: 1, y: 2 });
  assert.deepEqual(object.trace, payload.trace);
  assert.deepEqual(object.grid, payload.grid);
  assert.equal(object.name, 'дом');
  assert.equal(object.enabled, true);
  assert.equal(object.calibrate, 1.5);
});

test('ключ можно передать числом', () => {
  const codec = new StructCodec().init(protocol());

  const buffer = codec.set(9, { value: 1 });
  assert.equal(codec.get(buffer).key, 9);
  assert.equal(codec.sizeOf(9), 54);
});

test('enum-константы доступны в кодеке', () => {
  const codec = new StructCodec().init(protocol());

  assert.equal(codec.cmd.SET, 2);
  assert.equal(codec.key.PORT, 9);
  });

test('ошибка: неизвестный ключ', () => {
  const codec = new StructCodec().init(protocol());

  assert.throws(() => codec.set('NOPE'), (error) => {
    assert.ok(error instanceof StructCodecError);
    assert.match(error.message, /неизвестный ключ "NOPE"/);
    return true;
  });
});

test('ошибка: неверная форма массива', () => {
  const codec = new StructCodec().init(protocol());

  assert.throws(
    () => codec.set('PORT', { grid: [[1, 2]] }),
    /PORT.grid: ожидался массив длиной 2/,
  );
});

test('ошибка: строка не помещается в char[N]', () => {
  const codec = new StructCodec().init(protocol());

  assert.throws(
    () => codec.set('PORT', { name: 'очень длинное имя' }),
    /PORT.name: строка длиннее 7 байт/,
  );
});

test('ошибка: короткий буфер', () => {
  const codec = new StructCodec().init(protocol());

  const buffer = new ArrayBuffer(3);
  new Uint8Array(buffer)[0] = codec.key.PORT;

  assert.throws(() => codec.get(buffer), /короче ожидаемого/);
});
