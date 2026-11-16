import StructCodec from '../build/index.js';

const protocol = {
  protocol: 2,
  enums: {
    keys: { INIT: 0, PORT: 1 },
    commands: { NONE: 0, GET: 1, SET: 2, SAVE: 254 },
  },
  structs: {
    Init: {
      size: 1,
      fields: [{ name: 'key', kind: 'scalar', type: 'uint8_t', offset: 0 }],
    },
    Port: {
      size: 5,
      fields: [
        { name: 'key', kind: 'scalar', type: 'uint8_t', offset: 0 },
        { name: 'gpio', kind: 'scalar', type: 'uint8_t', offset: 1 },
        { name: 'value', kind: 'scalar', type: 'uint16_t', offset: 2 },
        { name: 'command', kind: 'scalar', type: 'uint8_t', offset: 4 },
      ],
    },
  },
  descriptions: {},
};

const codec = new StructCodec().init(protocol);

const buffer = codec.set('PORT', {
  gpio: 14,
  value: 10,
  command: protocol.enums.commands.SET,
});

console.log('bytes:', [...new Uint8Array(buffer)]);

console.log('message:', codec.get(buffer));

console.log('sizeOf(PORT):', codec.sizeOf('PORT'));
console.log('commands.SET:', codec.commands.SET);
