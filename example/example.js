// import VuespStruct from '../build/';

const VuespStruct = require('../build/index').default;

// import VuespStruct from 'vuesp-struct';

const struct = new VuespStruct();

const initStruct = {
  keys: ['INIT', 'SETTINGS', 'INFO'],
  structs: {
    Init: [{ type: 'uint8_t', name: 'key' }],
    Settings: [
      { type: 'uint8_t', name: 'key' },
      { type: 'char', name: 'login', length: 12 },
      { type: 'char', name: 'pass', length: 12 },
    ],
    Info: [
      { type: 'uint8_t', name: 'key' },
      { type: 'uint8_t', name: 'firmware', length: 3 },
      { type: 'uint32_t', name: 'totalBytes' },
      { type: 'uint32_t', name: 'usedBytes' },
      { type: 'uint32_t', name: 'id' },
    ],
  },
};

struct.init(initStruct);

const objectSetting = {
  login: 'Привет',
  pass: 'admin',
};

const objectInfo = {
  firmware: [1, 255, 0],
  totalBytes: 1024,
  usedBytes: 168545,
  id: 8,
};

const bufferInfo = struct.set('INFO', objectInfo);

console.log(bufferInfo);
// ArrayBuffer {
//   [Uint8Contents]: <02 01 ff 00 00 04 00 00 61 92 02 00 08 00 00 00>,
//   byteLength: 16
// }

const dataInfo = struct.get(bufferInfo);
if (dataInfo) {
  const { object, key } = dataInfo;
  console.log(object);
  //   {
  //     key: 2,
  //     firmware: [ 1, 255, 0 ],
  //     totalBytes: 1024,
  //     usedBytes: 168545,
  //     id: 8
  //   }
  console.log(key);
  //   INFO
}

const bufferSetting = struct.set('SETTINGS', objectSetting);

const dataSetting = struct.get(bufferSetting);
if (dataSetting) {
  const { object, key } = dataSetting;
  console.log(object, key);
}
