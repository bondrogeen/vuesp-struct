"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _cStructToJson = _interopRequireDefault(require("c-struct-to-json"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }
function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }
function _classPrivateFieldGet(receiver, privateMap) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get"); return _classApplyDescriptorGet(receiver, descriptor); }
function _classApplyDescriptorGet(receiver, descriptor) { if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }
function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set"); _classApplyDescriptorSet(receiver, descriptor, value); return value; }
function _classExtractFieldDescriptor(receiver, privateMap, action) { if (!privateMap.has(receiver)) { throw new TypeError("attempted to " + action + " private field on non-instance"); } return privateMap.get(receiver); }
function _classApplyDescriptorSet(receiver, descriptor, value) { if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } }
var _keys = /*#__PURE__*/new WeakMap();
var _structs = /*#__PURE__*/new WeakMap();
var _isOk = /*#__PURE__*/new WeakMap();
var VuespStructs = /*#__PURE__*/function () {
  function VuespStructs() {
    _classCallCheck(this, VuespStructs);
    _classPrivateFieldInitSpec(this, _keys, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _structs, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _isOk, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldSet(this, _keys, []);
    _classPrivateFieldSet(this, _structs, {});
    _classPrivateFieldSet(this, _isOk, false);
  }
  _createClass(VuespStructs, [{
    key: "init",
    value: function init(_ref) {
      var _ref$keys = _ref.keys,
        keys = _ref$keys === void 0 ? [] : _ref$keys,
        _ref$structs = _ref.structs,
        structs = _ref$structs === void 0 ? {} : _ref$structs;
      _classPrivateFieldSet(this, _keys, keys);
      for (var key in structs) {
        var name = key.toUpperCase();
        _classPrivateFieldGet(this, _structs)[name] = new _cStructToJson["default"](structs[key]);
        _classPrivateFieldSet(this, _isOk, true);
      }
    }
  }, {
    key: "set",
    value: function set(key, data) {
      console.log(_classPrivateFieldGet(this, _isOk));
      if (!_classPrivateFieldGet(this, _isOk)) {
        console.warn("Struct not init");
        return false;
      }
      var struct = _classPrivateFieldGet(this, _structs)[key];
      var index = _classPrivateFieldGet(this, _keys).findIndex(function (i) {
        return i === key;
      });
      if (struct && data) {
        return struct.setObject(_objectSpread(_objectSpread({}, data), {}, {
          key: index
        })).getBuffer();
      }
      if (typeof index !== 'undefined') return _classPrivateFieldGet(this, _structs)['INIT'].setObject({
        key: index
      }).getBuffer();
      console.warn("No struct or key ".concat(key), data);
      return null;
    }
  }, {
    key: "get",
    value: function get(data) {
      if (!_classPrivateFieldGet(this, _isOk)) {
        console.warn("Struct not init");
        return false;
      }
      if (data instanceof ArrayBuffer) {
        var _Uint8Array = new Uint8Array(data),
          _Uint8Array2 = _slicedToArray(_Uint8Array, 1),
          key = _Uint8Array2[0];
        var name = _classPrivateFieldGet(this, _keys)[key];
        var struct = _classPrivateFieldGet(this, _structs)[name];
        if (struct) {
          var object = struct.setBuffer(data).getObject();
          return {
            object: object,
            key: name
          };
        }
        console.warn("No struct in data");
        return null;
      }
      console.warn("No data or data not ArrayBuffer");
      return null;
    }
  }]);
  return VuespStructs;
}();
var _default = VuespStructs;
exports["default"] = _default;