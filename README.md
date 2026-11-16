# vuesp-struct

Парсер протокола и бинарный кодек для проектов Vuesp.

Из одного C++ заголовка (`protocol.h`) получаются JSON-описание, TypeScript-константы
и проверка layout для прошивки. Код Arduino и JS всегда синхронизированы.

```bash
npm install vuesp-struct
```

## Быстрый старт

```js
import StructCodec, { parseProtocol } from 'vuesp-struct';

const source = `
enum key : uint8_t { KEY_INIT = 0, KEY_PORT = 1 };
enum cmd : uint8_t { CMD_NONE = 0, CMD_SET = 2 };

struct Init { uint8_t key; };

#pragma pack(push, 1)
struct Port {
  uint8_t key;
  uint8_t gpio;
  uint16_t value;
  uint8_t command;
};
#pragma pack(pop)
`;

const protocol = parseProtocol(source, { file: 'protocol.h' });

const codec = new StructCodec().init(protocol);

const buffer = codec.set('PORT', { gpio: 14, value: 10, command: protocol.enums.CMD.SET });
const message = codec.get(buffer);
// { key: 1, object: { key: 1, gpio: 14, value: 10, command: 2 } }
```

## API

### `parseProtocol(source, options?)`

Разбирает C++ заголовок в JSON:

```json
{
  "protocol": 2,
  "enums": { "KEY": { "INIT": 0 }, "CMD": { "SET": 2, "SAVE": 254 } },
  "structs": {
    "Port": {
      "size": 5,
      "fields": [
        { "name": "key", "kind": "scalar", "type": "uint8_t", "offset": 0 },
        { "name": "value", "kind": "scalar", "type": "uint16_t", "offset": 2 }
      ]
    }
  },
  "descriptions": {}
}
```

Опции: `file` (для ошибок), `maxStructSize` (по умолчанию 8192).

Поддерживается:

- несколько `enum` с явными значениями и выражениями (`1 << 4`, `A | B`);
- структуры с примитивами, вложенными структурами и массивами `[N]`, `[N][M]`, `char[N]`;
- packed-layout: `size` и `offset` считаются без паддингов;
- комментарии `//` → `descriptions`.

Ошибки приходят как `ProtocolParseError` с адресом `файл:строка:колонка`.

### `new StructCodec().init({ enums, structs })`

| Метод | Назначение |
|---|---|
| `set(key, payload?)` | собрать `ArrayBuffer`; без payload — только ключ (1 байт), с payload — полная структура, недостающие поля — нули |
| `get(buffer)` | разобрать в `{ key, object }`; `key` — число из `enum KEY` |
| `sizeOf(key)` | размер сообщения |
| `key`, `cmd`, `enums` | константы из протокола |

`key` можно передавать именем (`'PORT'`) или числом (`9`).

Особенности кодека:

- little-endian;
- `set(key)` без payload — кадр из одного ключа (запрос); кадр полной длины означает запись, поэтому запрос нельзя паддить нулями;
- числовые строки и `boolean` приводятся к числу — формы отдают `string`; нечисловые значения — ошибка;
- `char[N]` — UTF-8 строка с `\0`, `uint8_t[N]` — массив чисел;
- вложенные структуры и многомерные массивы кодируются рекурсивно;
- ошибки содержат путь: `PORT.grid[1]: ожидался массив длиной 3`.

## Генерация для проекта

В приложении обычно используется скрипт (`vue/scripts/protocol-and-json.js`), который
из `protocol.h` пишет:

- `src/generated/protocol.ts` — `ENUMS`, `KEY`, `CMD`, `PORT`, `STRUCTS`,
  интерфейсы структур, `IMessageMap`, `TMessage`; рантайм инициализируется из них:
  `struct.init({ enums: ENUMS, structs: STRUCTS })`;
- `src/const/protocol.generated.h` — `static_assert(sizeof(...))` и `offsetof(...)`;
- `public/default.json` — только данные приложения (протокол в него не пишется).

Запуск: `npm run protocol`, проверка в CI: `npm run protocol:check`.

## Лицензия

MIT
