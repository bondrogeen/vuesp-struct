#pragma once

// Индексы сообщений.
enum key : uint8_t {
  KEY_INIT = 0,
  KEY_PORT = 9,
};

// Команды.
enum cmd : uint8_t {
  CMD_NONE = 0, // нет команды
  CMD_GET = 1,
  CMD_SET = 2,
  CMD_SAVE = 254,
};

// Маски порта.
enum portFlags : uint16_t {
  PORT_INPUT = 1 << 0,
  PORT_OUTPUT = 1 << 2,
  PORT_PWM = 1 << 4,
};

struct Init {
  uint8_t key;
};

struct Point {
  uint16_t x;
  uint16_t y;
};

#pragma pack(push, 1)
struct Port {
  uint8_t key;      // индекс сообщения
  uint8_t gpio;
  uint16_t value;   // текущее значение
  uint8_t command;  // COMMANDS.SET и т.д.
  Point position;
  Point trace[4];
  uint16_t grid[2][3];
  char name[8];
  bool enabled;
  double calibrate;
};
#pragma pack(pop)
