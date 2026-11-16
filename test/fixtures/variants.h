#pragma once

// Все варианты, которые должен пережить парсер и кодек.

enum key : uint8_t {
  KEY_EMPTY = 0,
  KEY_FULL = 1,
};

enum cmd : uint8_t {
  CMD_NONE = 0,
  CMD_GET = 1,
  CMD_SET = 2,
};

// Маски с выражениями и ссылками на предыдущие значения.
enum modeFlags : uint8_t {
  MODE_A = 1 << 0,
  MODE_B = 1 << 1,
  MODE_AB = MODE_A | MODE_B,
  MODE_D = (MODE_AB << 1) + 1,
};

struct Empty {
  uint8_t key;
};

struct Inner {
  uint8_t a;
  uint16_t b;
};

struct Deep {
  Inner one;
  Inner many[2];
  uint8_t tail;
};

#pragma pack(push, 1)
struct Full {
  uint8_t key;
  int8_t i8;
  uint8_t u8;
  int16_t i16;
  uint16_t u16;
  int32_t i32;
  uint32_t u32;
  float f32;
  double f64;
  uint64_t u64;
  int64_t i64;
  bool flag;
  char text[8];        // строка
  uint8_t bytes[3];    // сырые байты
  uint16_t grid[2][3]; // двумерный массив
  Inner inner;         // вложенная структура
  Inner list[2];       // массив структур
  Deep deep;           // двухуровневая вложенность
  Inner matrix[2][2];  // двумерный массив структур
};
#pragma pack(pop)
