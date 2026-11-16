# Протокол Vuesp (v2)

Контракт между прошивкой и веб-интерфейсом. Источник правды — один C++ заголовок
(`src/const/protocol.h`). Из него генерируются JSON, TypeScript-константы и
проверка layout для C++.

## 1. Что лежит в `protocol.h`

Файл состоит из трёх видов объявлений: перечисления (`enum`), структуры (`struct`)
и директив `#pragma pack`. Всё остальное (шаблоны, указатели, объединения,
битовые поля, `std::string`, `#ifdef` внутри структур) не поддерживается —
парсер завершится ошибкой с указанием строки.

```cpp
#pragma once

// Индексы сообщений. Значения постоянные и не переиспользуются.
enum key : uint8_t {
  KEY_INIT = 0,
  KEY_SETTINGS = 1,
  KEY_INFO = 2,
};

// Команды. Один общий плоский список для всех структур.
enum cmd : uint8_t {
  CMD_NONE = 0,
  CMD_GET = 1,
  CMD_SET = 2,
  CMD_SAVE = 254,
};

// Маски. Группа = префикс элементов: PORT_* → PORT.*
enum portFlags : uint16_t {
  PORT_INPUT = 1 << 0,
  PORT_OUTPUT = 1 << 2,
  PORT_PWM = 1 << 4,
};

struct Point {
  uint16_t x;
  uint16_t y;
};

#pragma pack(push, 1)
struct Port {
  uint8_t key;        // индекс сообщения
  uint8_t gpio;
  uint16_t value;
  uint8_t command;    // CMD.*
  Point position;     // вложенная структура
  Point trace[4];     // массив структур
  char name[16];      // строка
};
#pragma pack(pop)
```

### Правила

1. Все протокольные структуры упакованы без паддингов: `#pragma pack(push, 1)`.
2. Первое поле каждой структуры-сообщения — `uint8_t key;` со смещением 0.
   Сообщение определяется по имени: ключ `INIT` → структура `Init`.
3. Значения enum'ов задаются явно или вычисляются из предыдущего (`+1`).
   Допустимы целочисленные выражения: `1 << 4`, `A | B`, `A + 1`.
4. Новые значения enum'ов добавляются в конец, существующие номера не меняются
   и не переиспользуются.
5. Имя элемента — `ГРУППА_ЭЛЕМЕНТ`, где `ГРУППА` совпадает с префиксом:
   `KEY_INIT` → `KEY.INIT`, `CMD_SET` → `CMD.SET`, `PORT_PWM` → `PORT.PWM`.
   Группа в JS — это префикс до `_`. Имя enum'а должно начинаться с группы
   в нижнем регистре (`key`, `cmd`, `portFlags`), иначе парсер выдаст ошибку.
6. Комментарий `//` над элементом enum'а или полем структуры попадает в
   описание и в сгенерированную документацию.
7. Массивы только фиксированного размера: `[N]`, `[N][M]`, без переменных длин.
8. Рекурсивные структуры запрещены.

## 2. Поддерживаемые типы полей

| Тип | Размер | В JSON/TS |
|---|---|---|
| `uint8_t`, `int8_t`, `bool`, `char` | 1 | `number` / `string` для `char[N]` |
| `uint16_t`, `int16_t` | 2 | `number` |
| `uint32_t`, `int32_t`, `float` | 4 | `number` |
| `uint64_t`, `int64_t`, `double` | 8 | `number` |
| другая структура | её размер | объект |

`char[N]` кодируется как UTF-8 строка, декодируется до `\0` или до конца поля.
`uint8_t[N]` — массив чисел.

## 3. Результат парсинга

```json
{
  "protocol": 2,
  "enums": {
    "KEY": { "INIT": 0, "SETTINGS": 1, "INFO": 2 },
    "CMD": { "NONE": 0, "GET": 1, "SET": 2, "SAVE": 254 },
    "PORT": { "INPUT": 1, "OUTPUT": 4, "PWM": 16 }
  },
  "flagGroups": ["PORT"],
  "structs": {
    "Point": {
      "size": 4,
      "fields": [
        { "name": "x", "kind": "scalar", "type": "uint16_t", "offset": 0 },
        { "name": "y", "kind": "scalar", "type": "uint16_t", "offset": 2 }
      ]
    },
    "Port": {
      "size": 34,
      "fields": [
        { "name": "key", "kind": "scalar", "type": "uint8_t", "offset": 0, "description": "индекс сообщения" },
        { "name": "position", "kind": "struct", "type": "Point", "offset": 6 },
        { "name": "trace", "kind": "struct", "type": "Point", "dimensions": [4], "offset": 10 },
        { "name": "name", "kind": "scalar", "type": "char", "dimensions": [16], "offset": 26 }
      ]
    }
  },
  "descriptions": {
    "KEY.INIT": "Индекс сообщения INIT",
    "Port.value": "Текущее значение"
  }
}
```

- `offset` и `size` считает парсер, с учётом упаковки;
- `dimensions` описывает массивы любой размерности: `[4]`, `[2, 3]`;
- `kind` — `scalar` или `struct`;
- `descriptions` — необязательная карта «путь → комментарий».

## 4. Что генерируется дальше

| Артефакт | Назначение |
|---|---|
| `src/generated/protocol.ts` | `ENUMS`, `KEY`, `CMD`, `PORT`, `STRUCTS`, интерфейсы структур, `IMessageMap`, `TMessage` |
| `src/const/protocol.generated.h` | `static_assert(sizeof(...))` и `offsetof(...)` для C++ |
| `public/default.json` | только данные приложения; протокол сюда не пишется |

Рантайм инициализируется из сгенерированных констант, а не из JSON:

```ts
import { ENUMS, STRUCTS } from '@/generated/protocol';
struct.init({ enums: ENUMS, structs: STRUCTS });
```

`STRUCTS` содержит только `name`/`type`/`dimensions`; `offset`, `size` и `kind`
кодек вычисляет при `init`.

`IMessageMap` связывает ключ со структурой (`PORT: IPort`), а `TMessage` —
готовое объединение `{ key, object }` для обработчиков сообщений. Это убирает дублирование протокола в JSON и
уменьшает `default.json` примерно на 7 KB.

## 5. Ошибки парсера

Формат: `файл:строка:колонка — текст`.

```
protocol.h:42:14 — неизвестный тип "uint16", возможно uint16_t
protocol.h:57:8 — значение 2 уже занято (CMD_SET), команды должны быть уникальны
protocol.h:70:3 — первое поле структуры Port должно быть uint8_t key
```

## 6. Выражения дашборда

`set` / `get` / `getTo` в `dashboard.json` вычисляются со значениями `v`, `a`, `b`, `c`, `d`
и константами протокола. Имена констант совпадают с кодом приложения:

```json
"set": "({ ...b, value: v, command: CMD.SET })",
"get": "b",
"getTo": "v ? 'ON' : 'OFF'"
```

Доступны `KEY`, `CMD`, `PORT` — те же объекты, что импортируются из
`@/generated/protocol`. Поэтому в данных нет магических чисел.
