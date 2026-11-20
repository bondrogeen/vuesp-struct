# Proposal

## Why

`vuesp-struct` — общий парсер и бинарный кодек для прошивки, web UI и hub. Его
поведение описано только в README и тестах, поэтому изменения протокола сложно
проверять на совместимость. Нужен baseline-контракт.

## What Changes

- Добавляются две baseline-спеки:
  - `protocol-parser` — разбор C++ заголовка в JSON-описание;
  - `protocol-codec` — кодирование и декодирование бинарных сообщений.
- Код библиотеки не меняется.

## Capabilities

### New Capabilities

- `protocol-parser`: разбор `protocol.h` в enums/structs/descriptions и
  проверка packed-layout.
- `protocol-codec`: сборка и разбор сообщений по описанию протокола.

### Modified Capabilities

Нет.

## Impact

- Только `openspec/`.
- Прошивка, web UI и hub используют те же контракты; изменения поведения
  потребуют обновления этих спек.
