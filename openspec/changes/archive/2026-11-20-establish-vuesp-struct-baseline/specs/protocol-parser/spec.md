# protocol-parser

## Purpose

Описывает преобразование C++ заголовка протокола в JSON-описание enums, structs и packed-layout, которым пользуются прошивка, web UI и hub.

## ADDED Requirements

### Requirement: Parse protocol header

`parseProtocol` SHALL разбирать C++ заголовок и возвращать `protocol: 2`, `enums`, `flagGroups`, `structs` и `descriptions`.

#### Scenario: Enums and structs are extracted

- **WHEN** на вход подан заголовок с `enum` и `struct`
- **THEN** результат содержит имена и значения enum, а также структуры с полями

#### Scenario: Flag groups are reported

- **WHEN** имя enum заканчивается на `Flags`
- **THEN** оно попадает в `flagGroups`

### Requirement: Packed layout

Парсер SHALL вычислять `size` структур и `offset` полей без паддингов, с поддержкой примитивов, вложенных структур и массивов `[N]`, `[N][M]`, `char[N]`.

#### Scenario: Offsets have no padding

- **WHEN** в структуре чередуются поля разного размера
- **THEN** `offset` следующего поля равен сумме размеров предыдущих

#### Scenario: Arrays expand in layout

- **WHEN** поле объявлено как `uint16_t grid[3]`
- **THEN** оно занимает шесть байт и имеет размерность `[3]`

### Requirement: Struct size limit

Парсер SHALL отклонять структуру, размер которой превышает `maxStructSize` (по умолчанию 8192 байта).

#### Scenario: Oversized struct fails

- **WHEN** вычисленный размер структуры больше лимита
- **THEN** разбор завершается ошибкой с указанием структуры и лимита

### Requirement: Parse errors with location

Ошибки разбора SHALL возвращаться как `ProtocolParseError` с файлом, строкой и колонкой.

#### Scenario: Unknown type points to the field

- **WHEN** в структуре указан неизвестный тип
- **THEN** ошибка содержит координаты этого поля

### Requirement: Descriptions from comments

Комментарии `//` SHALL попадать в `descriptions` под ключами `<ENUM>.<MEMBER>` и `<Struct>.<field>`.

#### Scenario: Field comments are preserved

- **WHEN** у поля структуры есть комментарий
- **THEN** он доступен в `descriptions` по ключу `Struct.field`
