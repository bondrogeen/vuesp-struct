# protocol-codec Specification

## Purpose

Описывает бинарный кодек `StructCodec`: сборку и разбор сообщений протокола Vuesp по JSON-описанию.

## Requirements

### Requirement: Initialize codec from protocol

`StructCodec.init` SHALL принимать `{ enums, structs }` и предоставлять `key`, `cmd` и `enums` для дальнейшей работы.

#### Scenario: Constants are available after init

- **WHEN** кодек инициализирован описанием протокола
- **THEN** `key` и `cmd` содержат значения соответствующих enum

### Requirement: Request and write frames

`set(key)` без payload SHALL возвращать кадр из одного байта ключа; `set(key, payload)` SHALL возвращать кадр полной длины структуры и заполнять отсутствующие поля нулями.

#### Scenario: Request frame is not padded

- **WHEN** вызывается `set(key)` без payload
- **THEN** буфер содержит ровно один байт ключа

#### Scenario: Write frame has full size

- **WHEN** вызывается `set(key, payload)`
- **THEN** длина буфера равна размеру структуры

### Requirement: Scalar value encoding

Кодек SHALL кодировать числа little-endian, принимать числовые строки и `boolean` как числа и SHALL отклонять нечисловые значения.

#### Scenario: Numeric string is accepted

- **WHEN** в числовое поле передана строка `"42"`
- **THEN** в буфер записывается число 42

#### Scenario: Non-numeric string fails

- **WHEN** в числовое поле передана нечисловая строка
- **THEN** кодек возвращает ошибку с путём поля

### Requirement: Strings and byte arrays

`char[N]` SHALL кодироваться как UTF-8 строка с завершающим `\0`, а `uint8_t[N]` — как массив чисел.

#### Scenario: String is null-terminated

- **WHEN** в `char[16]` передана строка
- **THEN** буфер содержит UTF-8 байты и завершающий ноль

#### Scenario: Byte array keeps values

- **WHEN** в `uint8_t[4]` передан массив чисел
- **THEN** байты записываются в исходном порядке

### Requirement: Nested structures and multidimensional arrays

Кодек SHALL рекурсивно кодировать и декодировать вложенные структуры и многомерные массивы.

#### Scenario: Nested grid round-trips

- **WHEN** структура содержит `uint16_t grid[2][3]` и значение закодировано
- **THEN** декодирование возвращает тот же массив

### Requirement: Decoding and message size

`get(buffer)` SHALL возвращать `{ key, object }`, где `key` — число из `enum KEY`, а `sizeOf(key)` — размер сообщения.

#### Scenario: Decode returns key and payload

- **WHEN** декодируется кадр структуры
- **THEN** результат содержит числовой ключ и объект полей

### Requirement: Error paths

Ошибки кодирования и декодирования SHALL содержать путь до поля, включая индексы массивов.

#### Scenario: Array length mismatch is explicit

- **WHEN** для `grid[3]` передано меньше элементов
- **THEN** ошибка содержит путь вида `PORT.grid[1]`
