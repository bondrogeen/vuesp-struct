"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _VuespStructs_keys, _VuespStructs_structs, _VuespStructs_isOk;
Object.defineProperty(exports, "__esModule", { value: true });
const c_struct_to_json_1 = __importDefault(require("c-struct-to-json"));
class VuespStructs {
    constructor() {
        _VuespStructs_keys.set(this, void 0);
        _VuespStructs_structs.set(this, void 0);
        _VuespStructs_isOk.set(this, void 0);
        __classPrivateFieldSet(this, _VuespStructs_keys, [], "f");
        __classPrivateFieldSet(this, _VuespStructs_structs, {}, "f");
        __classPrivateFieldSet(this, _VuespStructs_isOk, false, "f");
    }
    init({ keys = [], structs = {} }) {
        __classPrivateFieldSet(this, _VuespStructs_keys, keys, "f");
        for (const key in structs) {
            const name = key.toUpperCase();
            __classPrivateFieldGet(this, _VuespStructs_structs, "f")[name] = new c_struct_to_json_1.default(structs[key]);
            __classPrivateFieldSet(this, _VuespStructs_isOk, true, "f");
        }
    }
    set(key, data) {
        console.log(__classPrivateFieldGet(this, _VuespStructs_isOk, "f"));
        if (!__classPrivateFieldGet(this, _VuespStructs_isOk, "f")) {
            console.warn(`Struct not init`);
            return false;
        }
        const struct = __classPrivateFieldGet(this, _VuespStructs_structs, "f")[key];
        const index = __classPrivateFieldGet(this, _VuespStructs_keys, "f").findIndex(i => i === key);
        if (struct && data) {
            return struct.setObject({ ...data, key: index }).getBuffer();
        }
        if (typeof index !== 'undefined' && __classPrivateFieldGet(this, _VuespStructs_structs, "f")['INIT']) {
            return __classPrivateFieldGet(this, _VuespStructs_structs, "f")['INIT'].setObject({ key: index }).getBuffer();
        }
        console.warn(`No struct or key ${key}`, data);
        return null;
    }
    get(data) {
        if (!__classPrivateFieldGet(this, _VuespStructs_isOk, "f")) {
            console.warn(`Struct not init`);
            return false;
        }
        if (data instanceof ArrayBuffer) {
            const [keyIndex] = new Uint8Array(data);
            const name = __classPrivateFieldGet(this, _VuespStructs_keys, "f")[keyIndex];
            const struct = __classPrivateFieldGet(this, _VuespStructs_structs, "f")[name];
            if (struct) {
                const object = struct.setBuffer(data).getObject();
                return { object, key: name };
            }
            console.warn(`No struct in data`);
            return null;
        }
        console.warn(`No data or data not ArrayBuffer`);
        return null;
    }
}
_VuespStructs_keys = new WeakMap(), _VuespStructs_structs = new WeakMap(), _VuespStructs_isOk = new WeakMap();
exports.default = VuespStructs;
