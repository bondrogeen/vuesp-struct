import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { parseProtocol, ProtocolParseError } from '../build/index.js';

const dir = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(join(dir, 'fixtures', name), 'utf8');

test('разбирает реальный struct.h', () => {
  const protocol = parseProtocol(fixture('struct.h'), { file: 'struct.h' });

  assert.equal(protocol.protocol, 2);

  assert.equal(protocol.enums.KEY.INIT, 0);
  assert.equal(protocol.enums.KEY.PORT, 9);
  assert.equal(protocol.enums.KEY.DISCOVERY, 14);
  assert.equal(Object.keys(protocol.enums.KEY).length, 15);

  assert.equal(protocol.structs.Init.size, 1);
  assert.equal(protocol.structs.Settings.size, 116);
  assert.equal(protocol.structs.Info.size, 48);
  assert.equal(protocol.structs.Scan.size, 44);
  assert.equal(protocol.structs.Progress.size, 12);
  assert.equal(protocol.structs.Files.size, 40);
  assert.equal(protocol.structs.Event.size, 44);
  assert.equal(protocol.structs.Port.size, 20);
  assert.equal(protocol.structs.Message.size, 268);
  assert.equal(protocol.structs.Dallas.size, 16);
  assert.equal(protocol.structs.Buffer.size, 264);
  assert.equal(protocol.structs.Discovery.size, 16);
  assert.equal(protocol.structs.Device.size, 44);

  const port = protocol.structs.Port.fields;
  assert.deepEqual(
    port.map((field) => [field.name, field.offset]),
    [
      ['key', 0],
      ['gpio', 1],
      ['value', 2],
      ['mode', 4],
      ['interrupt', 5],
      ['list', 6],
      ['disabled', 8],
      ['isButton', 9],
      ['command', 10],
      ['isPressed', 11],
      ['count', 12],
      ['empty', 13],
      ['valueOld', 14],
      ['pressStart', 16],
    ],
  );

  assert.equal(protocol.structs.Settings.fields.find((field) => field.name === 'wifiSsid').dimensions[0], 32);
});

test('разбирает enum-выражения, вложенность и многомерные массивы', () => {
  const protocol = parseProtocol(fixture('protocol.h'), { file: 'protocol.h' });

  assert.deepEqual(protocol.enums.PORT, { INPUT: 1, OUTPUT: 4, PWM: 16 });
  assert.equal(protocol.enums.CMD.SAVE, 254);

  assert.equal(protocol.structs.Point.size, 4);

  assert.equal(protocol.structs.Port.size, 54);

  const fields = Object.fromEntries(protocol.structs.Port.fields.map((field) => [field.name, field]));

  assert.equal(fields.key.offset, 0);
  assert.equal(fields.gpio.offset, 1);
  assert.equal(fields.value.offset, 2);
  assert.equal(fields.command.offset, 4);
  assert.equal(fields.position.offset, 5);
  assert.equal(fields.position.kind, 'struct');
  assert.equal(fields.position.type, 'Point');
  assert.equal(fields.trace.offset, 9);
  assert.deepEqual(fields.trace.dimensions, [4]);
  assert.equal(fields.grid.offset, 25);
  assert.deepEqual(fields.grid.dimensions, [2, 3]);
  assert.equal(fields.name.offset, 37);
  assert.equal(fields.name.type, 'char');
  assert.deepEqual(fields.name.dimensions, [8]);
  assert.equal(fields.enabled.offset, 45);
  assert.equal(fields.enabled.type, 'bool');
  assert.equal(fields.calibrate.offset, 46);
  assert.equal(fields.calibrate.type, 'double');

  assert.equal(protocol.descriptions['Port.value'], 'текущее значение');
  assert.equal(protocol.descriptions['Port.command'], 'COMMANDS.SET и т.д.');
  assert.equal(protocol.descriptions['CMD.NONE'], 'нет команды');
});

test('ошибка: неизвестный тип', () => {
  const source = `
    enum keys : uint8_t { KEY_A = 0 };
    struct A { uint8_t key; Unknown value; };
  `;

  assert.throws(() => parseProtocol(source, { file: 'x.h' }), (error) => {
    assert.ok(error instanceof ProtocolParseError);
    assert.match(error.message, /неизвестный тип "Unknown"/);
    assert.match(error.message, /x\.h/);
    return true;
  });
});

test('ошибка: рекурсивная структура', () => {
  const source = `
    enum keys : uint8_t { KEY_A = 0 };
    struct A { uint8_t key; B b; };
    struct B { A a; };
  `;

  assert.throws(() => parseProtocol(source), /рекурсивная структура: A → B → A/);
});

test('ошибка: дубликат значения enum', () => {
  const source = `
    enum keys : uint8_t { KEY_A = 0, KEY_B = 0 };
  `;

  assert.throws(() => parseProtocol(source), /значение 0 уже занято \(A\), значения должны быть уникальны/);
});

test('ошибка: нет поля key', () => {
  const source = `
    enum keys : uint8_t { KEY_A = 0 };
    struct A { uint32_t id; };
  `;

  assert.throws(() => parseProtocol(source), /первое поле структуры A должно быть "uint8_t key"/);
});

test('ошибка: размер массива', () => {
  const source = `
    enum keys : uint8_t { KEY_A = 0 };
    struct A { uint8_t key; char name[0]; };
  `;

  assert.throws(() => parseProtocol(source), /размер массива name должен быть положительным целым/);
});

test('ошибка: значение не влезает в базовый тип', () => {
  const source = `
    enum keys : uint8_t { KEY_A = 0, KEY_B = 300 };
  `;

  assert.throws(() => parseProtocol(source), /не помещается в uint8_t/);
});

test('ошибка: член enum без общего префикса', () => {
  assert.throws(() => parseProtocol('enum key : uint8_t { KEY_A = 0, B = 1 };'), /не совпадает с префиксом KEY_/);
});

test('ошибка: имя enum не совпадает с группой', () => {
  assert.throws(() => parseProtocol('enum keys : uint8_t { CMD_A = 0 };'), /должен называться начиная с "cmd"/);
});

test('ошибка: одна группа объявлена дважды', () => {
  assert.throws(
    () => parseProtocol('enum key : uint8_t { KEY_A = 0 };\nenum key2 : uint8_t { KEY_B = 1 };'),
    /группа KEY уже объявлена/,
  );
});
