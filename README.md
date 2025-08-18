# vuesp-struct

```
npm install vuesp-struct
```

## Usage

```js

const VuespStruct = require('../build/index').default;
// or
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
  login: 'admin',
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

```

See [example/example.js](example/example.js) for more.

### 1.1.2 (2025-08-08)

- (bondrogeen) typescript

## 1.0.0 (2023-01-05)

- (bondrogeen) Change

## License

The MIT License (MIT)

Copyright (c) 2021-2023, bondrogeen <bondrogeen@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
