// 봇빌더(BB) v0.3.2의 번들에서 추출한 외부 라이브러리 (MIT). 라이선스: 저장소 NOTICE.md
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
  var require_index_no_eval = __commonJS({
    "node_modules/msgpackr/dist/index-no-eval.cjs"(exports, module) {
      (function(global, factory) {
        typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.msgpackr = {}));
      })(exports, (function(exports2) {
        "use strict";
        var decoder;
        try {
          decoder = new TextDecoder();
        } catch (error) {
        }
        var src;
        var srcEnd;
        var position$1 = 0;
        var currentUnpackr = {};
        var currentStructures;
        var srcString;
        var srcStringStart = 0;
        var srcStringEnd = 0;
        var bundledStrings$1;
        var referenceMap;
        var currentExtensions = [];
        var dataView;
        var defaultOptions = {
          useRecords: false,
          mapsAsObjects: true
        };
        class C1Type {
        }
        const C1 = new C1Type();
        C1.name = "MessagePack 0xC1";
        var sequentialMode = false;
        var inlineObjectReadThreshold = 2;
        var readStruct;
        var BlockedFunction;
        try {
          new BlockedFunction("");
        } catch (error) {
          inlineObjectReadThreshold = Infinity;
        }
        class Unpackr {
          constructor(options) {
            if (options) {
              if (options.useRecords === false && options.mapsAsObjects === void 0)
                options.mapsAsObjects = true;
              if (options.sequential && options.trusted !== false) {
                options.trusted = true;
                if (!options.structures && options.useRecords != false) {
                  options.structures = [];
                  if (!options.maxSharedStructures)
                    options.maxSharedStructures = 0;
                }
              }
              if (options.structures)
                options.structures.sharedLength = options.structures.length;
              else if (options.getStructures) {
                (options.structures = []).uninitialized = true;
                options.structures.sharedLength = 0;
              }
              if (options.int64AsNumber) {
                options.int64AsType = "number";
              }
            }
            Object.assign(this, options);
          }
          unpack(source, options) {
            if (src) {
              return saveState(() => {
                clearSource();
                return this ? this.unpack(source, options) : Unpackr.prototype.unpack.call(defaultOptions, source, options);
              });
            }
            if (!source.buffer && source.constructor === ArrayBuffer)
              source = typeof Buffer !== "undefined" ? Buffer.from(source) : new Uint8Array(source);
            if (typeof options === "object") {
              srcEnd = options.end || source.length;
              position$1 = options.start || 0;
            } else {
              position$1 = 0;
              srcEnd = options > -1 ? options : source.length;
            }
            srcStringEnd = 0;
            srcString = null;
            bundledStrings$1 = null;
            src = source;
            try {
              dataView = source.dataView || (source.dataView = new DataView(source.buffer, source.byteOffset, source.byteLength));
            } catch (error) {
              src = null;
              if (source instanceof Uint8Array)
                throw error;
              throw new Error("Source must be a Uint8Array or Buffer but was a " + (source && typeof source == "object" ? source.constructor.name : typeof source));
            }
            if (this instanceof Unpackr) {
              currentUnpackr = this;
              if (this.structures) {
                currentStructures = this.structures;
                return checkedRead(options);
              } else if (!currentStructures || currentStructures.length > 0) {
                currentStructures = [];
              }
            } else {
              currentUnpackr = defaultOptions;
              if (!currentStructures || currentStructures.length > 0)
                currentStructures = [];
            }
            return checkedRead(options);
          }
          unpackMultiple(source, forEach) {
            let values, lastPosition = 0;
            try {
              sequentialMode = true;
              let size = source.length;
              let value = this ? this.unpack(source, size) : defaultUnpackr.unpack(source, size);
              if (forEach) {
                if (forEach(value, lastPosition, position$1) === false) return;
                while (position$1 < size) {
                  lastPosition = position$1;
                  if (forEach(checkedRead(), lastPosition, position$1) === false) {
                    return;
                  }
                }
              } else {
                values = [value];
                while (position$1 < size) {
                  lastPosition = position$1;
                  values.push(checkedRead());
                }
                return values;
              }
            } catch (error) {
              error.lastPosition = lastPosition;
              error.values = values;
              throw error;
            } finally {
              sequentialMode = false;
              clearSource();
            }
          }
          _mergeStructures(loadedStructures, existingStructures) {
            loadedStructures = loadedStructures || [];
            if (Object.isFrozen(loadedStructures))
              loadedStructures = loadedStructures.map((structure) => structure.slice(0));
            for (let i = 0, l = loadedStructures.length; i < l; i++) {
              let structure = loadedStructures[i];
              if (structure) {
                structure.isShared = true;
                if (i >= 32)
                  structure.highByte = i - 32 >> 5;
              }
            }
            loadedStructures.sharedLength = loadedStructures.length;
            for (let id in existingStructures || []) {
              if (id >= 0) {
                let structure = loadedStructures[id];
                let existing = existingStructures[id];
                if (existing) {
                  if (structure)
                    (loadedStructures.restoreStructures || (loadedStructures.restoreStructures = []))[id] = structure;
                  loadedStructures[id] = existing;
                }
              }
            }
            return this.structures = loadedStructures;
          }
          decode(source, options) {
            return this.unpack(source, options);
          }
        }
        function checkedRead(options) {
          try {
            if (!currentUnpackr.trusted && !sequentialMode) {
              let sharedLength = currentStructures.sharedLength || 0;
              if (sharedLength < currentStructures.length)
                currentStructures.length = sharedLength;
            }
            let result;
            if (currentUnpackr.randomAccessStructure && src[position$1] < 64 && src[position$1] >= 32 && readStruct) {
              result = readStruct(src, position$1, srcEnd, currentUnpackr);
              src = null;
              if (!(options && options.lazy) && result)
                result = result.toJSON();
              position$1 = srcEnd;
            } else
              result = read();
            if (bundledStrings$1) {
              position$1 = bundledStrings$1.postBundlePosition;
              bundledStrings$1 = null;
            }
            if (sequentialMode)
              currentStructures.restoreStructures = null;
            if (position$1 == srcEnd) {
              if (currentStructures && currentStructures.restoreStructures)
                restoreStructures();
              currentStructures = null;
              src = null;
              if (referenceMap)
                referenceMap = null;
            } else if (position$1 > srcEnd) {
              throw new Error("Unexpected end of MessagePack data");
            } else if (!sequentialMode) {
              let jsonView;
              try {
                jsonView = JSON.stringify(result, (_, value) => typeof value === "bigint" ? `${value}n` : value).slice(0, 100);
              } catch (error) {
                jsonView = "(JSON view not available " + error + ")";
              }
              throw new Error("Data read, but end of buffer not reached " + jsonView);
            }
            return result;
          } catch (error) {
            if (currentStructures && currentStructures.restoreStructures)
              restoreStructures();
            clearSource();
            if (error instanceof RangeError || error.message.startsWith("Unexpected end of buffer") || position$1 > srcEnd) {
              error.incomplete = true;
            }
            throw error;
          }
        }
        function restoreStructures() {
          for (let id in currentStructures.restoreStructures) {
            currentStructures[id] = currentStructures.restoreStructures[id];
          }
          currentStructures.restoreStructures = null;
        }
        function read() {
          let token = src[position$1++];
          if (token < 160) {
            if (token < 128) {
              if (token < 64)
                return token;
              else {
                let structure = currentStructures[token & 63] || currentUnpackr.getStructures && loadStructures()[token & 63];
                if (structure) {
                  if (!structure.read) {
                    structure.read = createStructureReader(structure, token & 63);
                  }
                  return structure.read();
                } else
                  return token;
              }
            } else if (token < 144) {
              token -= 128;
              if (currentUnpackr.mapsAsObjects) {
                let object2 = {};
                for (let i = 0; i < token; i++) {
                  let key2 = readKey();
                  if (key2 === "__proto__")
                    key2 = "__proto_";
                  object2[key2] = read();
                }
                return object2;
              } else {
                let map = /* @__PURE__ */ new Map();
                for (let i = 0; i < token; i++) {
                  map.set(read(), read());
                }
                return map;
              }
            } else {
              token -= 144;
              let array2 = new Array(token);
              for (let i = 0; i < token; i++) {
                array2[i] = read();
              }
              if (currentUnpackr.freezeData)
                return Object.freeze(array2);
              return array2;
            }
          } else if (token < 192) {
            let length = token - 160;
            if (srcStringEnd >= position$1) {
              return srcString.slice(position$1 - srcStringStart, (position$1 += length) - srcStringStart);
            }
            if (srcStringEnd == 0 && srcEnd < 140) {
              let string = length < 16 ? shortStringInJS(length) : longStringInJS(length);
              if (string != null)
                return string;
            }
            return readFixedString(length);
          } else {
            let value;
            switch (token) {
              case 192:
                return null;
              case 193:
                if (bundledStrings$1) {
                  value = read();
                  if (value > 0)
                    return bundledStrings$1[1].slice(bundledStrings$1.position1, bundledStrings$1.position1 += value);
                  else
                    return bundledStrings$1[0].slice(bundledStrings$1.position0, bundledStrings$1.position0 -= value);
                }
                return C1;
              // "never-used", return special object to denote that
              case 194:
                return false;
              case 195:
                return true;
              case 196:
                value = src[position$1++];
                if (value === void 0)
                  throw new Error("Unexpected end of buffer");
                return readBin(value);
              case 197:
                value = dataView.getUint16(position$1);
                position$1 += 2;
                return readBin(value);
              case 198:
                value = dataView.getUint32(position$1);
                position$1 += 4;
                return readBin(value);
              case 199:
                return readExt(src[position$1++]);
              case 200:
                value = dataView.getUint16(position$1);
                position$1 += 2;
                return readExt(value);
              case 201:
                value = dataView.getUint32(position$1);
                position$1 += 4;
                return readExt(value);
              case 202:
                value = dataView.getFloat32(position$1);
                if (currentUnpackr.useFloat32 > 2) {
                  let multiplier = mult10[(src[position$1] & 127) << 1 | src[position$1 + 1] >> 7];
                  position$1 += 4;
                  return (multiplier * value + (value > 0 ? 0.5 : -0.5) >> 0) / multiplier;
                }
                position$1 += 4;
                return value;
              case 203:
                value = dataView.getFloat64(position$1);
                position$1 += 8;
                return value;
              // uint handlers
              case 204:
                return src[position$1++];
              case 205:
                value = dataView.getUint16(position$1);
                position$1 += 2;
                return value;
              case 206:
                value = dataView.getUint32(position$1);
                position$1 += 4;
                return value;
              case 207:
                if (currentUnpackr.int64AsType === "number") {
                  value = dataView.getUint32(position$1) * 4294967296;
                  value += dataView.getUint32(position$1 + 4);
                } else if (currentUnpackr.int64AsType === "string") {
                  value = dataView.getBigUint64(position$1).toString();
                } else if (currentUnpackr.int64AsType === "auto") {
                  value = dataView.getBigUint64(position$1);
                  if (value <= BigInt(2) << BigInt(52)) value = Number(value);
                } else
                  value = dataView.getBigUint64(position$1);
                position$1 += 8;
                return value;
              // int handlers
              case 208:
                return dataView.getInt8(position$1++);
              case 209:
                value = dataView.getInt16(position$1);
                position$1 += 2;
                return value;
              case 210:
                value = dataView.getInt32(position$1);
                position$1 += 4;
                return value;
              case 211:
                if (currentUnpackr.int64AsType === "number") {
                  value = dataView.getInt32(position$1) * 4294967296;
                  value += dataView.getUint32(position$1 + 4);
                } else if (currentUnpackr.int64AsType === "string") {
                  value = dataView.getBigInt64(position$1).toString();
                } else if (currentUnpackr.int64AsType === "auto") {
                  value = dataView.getBigInt64(position$1);
                  if (value >= BigInt(-2) << BigInt(52) && value <= BigInt(2) << BigInt(52)) value = Number(value);
                } else
                  value = dataView.getBigInt64(position$1);
                position$1 += 8;
                return value;
              case 212:
                value = src[position$1++];
                if (value == 114) {
                  return recordDefinition(src[position$1++] & 63);
                } else {
                  let extension = currentExtensions[value];
                  if (extension) {
                    if (extension.read) {
                      position$1++;
                      return extension.read(read());
                    } else if (extension.noBuffer) {
                      position$1++;
                      return extension();
                    } else
                      return extension(src.subarray(position$1, ++position$1));
                  } else
                    throw new Error("Unknown extension " + value);
                }
              case 213:
                value = src[position$1];
                if (value == 114) {
                  position$1++;
                  return recordDefinition(src[position$1++] & 63, src[position$1++]);
                } else
                  return readExt(2);
              case 214:
                return readExt(4);
              case 215:
                return readExt(8);
              case 216:
                return readExt(16);
              case 217:
                value = src[position$1++];
                if (srcStringEnd >= position$1) {
                  return srcString.slice(position$1 - srcStringStart, (position$1 += value) - srcStringStart);
                }
                return readString8(value);
              case 218:
                value = dataView.getUint16(position$1);
                position$1 += 2;
                if (srcStringEnd >= position$1) {
                  return srcString.slice(position$1 - srcStringStart, (position$1 += value) - srcStringStart);
                }
                return readString16(value);
              case 219:
                value = dataView.getUint32(position$1);
                position$1 += 4;
                if (srcStringEnd >= position$1) {
                  return srcString.slice(position$1 - srcStringStart, (position$1 += value) - srcStringStart);
                }
                return readString32(value);
              case 220:
                value = dataView.getUint16(position$1);
                position$1 += 2;
                return readArray(value);
              case 221:
                value = dataView.getUint32(position$1);
                position$1 += 4;
                return readArray(value);
              case 222:
                value = dataView.getUint16(position$1);
                position$1 += 2;
                return readMap(value);
              case 223:
                value = dataView.getUint32(position$1);
                position$1 += 4;
                return readMap(value);
              default:
                if (token >= 224)
                  return token - 256;
                if (token === void 0) {
                  let error = new Error("Unexpected end of MessagePack data");
                  error.incomplete = true;
                  throw error;
                }
                throw new Error("Unknown MessagePack token " + token);
            }
          }
        }
        const validName = /^[a-zA-Z_$][a-zA-Z\d_$]*$/;
        function createStructureReader(structure, firstId) {
          function readObject() {
            if (readObject.count++ > inlineObjectReadThreshold) {
              let readObject2 = structure.read = new BlockedFunction("r", "return function(){return " + (currentUnpackr.freezeData ? "Object.freeze" : "") + "({" + structure.map((key2) => key2 === "__proto__" ? "__proto_:r()" : validName.test(key2) ? key2 + ":r()" : "[" + JSON.stringify(key2) + "]:r()").join(",") + "})}")(read);
              if (structure.highByte === 0)
                structure.read = createSecondByteReader(firstId, structure.read);
              return readObject2();
            }
            let object2 = {};
            for (let i = 0, l = structure.length; i < l; i++) {
              let key2 = structure[i];
              if (key2 === "__proto__")
                key2 = "__proto_";
              object2[key2] = read();
            }
            if (currentUnpackr.freezeData)
              return Object.freeze(object2);
            return object2;
          }
          readObject.count = 0;
          if (structure.highByte === 0) {
            return createSecondByteReader(firstId, readObject);
          }
          return readObject;
        }
        const createSecondByteReader = (firstId, read0) => {
          return function() {
            let highByte = src[position$1++];
            if (highByte === 0)
              return read0();
            let id = firstId < 32 ? -(firstId + (highByte << 5)) : firstId + (highByte << 5);
            let structure = currentStructures[id] || loadStructures()[id];
            if (!structure) {
              throw new Error("Record id is not defined for " + id);
            }
            if (!structure.read)
              structure.read = createStructureReader(structure, firstId);
            return structure.read();
          };
        };
        function loadStructures() {
          let loadedStructures = saveState(() => {
            src = null;
            return currentUnpackr.getStructures();
          });
          return currentStructures = currentUnpackr._mergeStructures(loadedStructures, currentStructures);
        }
        var readFixedString = readStringJS;
        var readString8 = readStringJS;
        var readString16 = readStringJS;
        var readString32 = readStringJS;
        let isNativeAccelerationEnabled = false;
        function readStringJS(length) {
          let result;
          if (length < 16) {
            if (result = shortStringInJS(length))
              return result;
          }
          if (length > 64 && decoder)
            return decoder.decode(src.subarray(position$1, position$1 += length));
          const end = position$1 + length;
          const units = [];
          result = "";
          while (position$1 < end) {
            const byte1 = src[position$1++];
            if ((byte1 & 128) === 0) {
              units.push(byte1);
            } else if ((byte1 & 224) === 192) {
              const byte2 = src[position$1++] & 63;
              const codePoint = (byte1 & 31) << 6 | byte2;
              if (codePoint < 128) {
                units.push(65533);
              } else {
                units.push(codePoint);
              }
            } else if ((byte1 & 240) === 224) {
              const byte2 = src[position$1++] & 63;
              const byte3 = src[position$1++] & 63;
              const codePoint = (byte1 & 31) << 12 | byte2 << 6 | byte3;
              if (codePoint < 2048 || codePoint >= 55296 && codePoint <= 57343) {
                units.push(65533);
              } else {
                units.push(codePoint);
              }
            } else if ((byte1 & 248) === 240) {
              const byte2 = src[position$1++] & 63;
              const byte3 = src[position$1++] & 63;
              const byte4 = src[position$1++] & 63;
              let unit = (byte1 & 7) << 18 | byte2 << 12 | byte3 << 6 | byte4;
              if (unit < 65536 || unit > 1114111) {
                units.push(65533);
              } else if (unit > 65535) {
                unit -= 65536;
                units.push(unit >>> 10 & 1023 | 55296);
                unit = 56320 | unit & 1023;
                units.push(unit);
              } else {
                units.push(unit);
              }
            } else {
              units.push(65533);
            }
            if (units.length >= 4096) {
              result += fromCharCode.apply(String, units);
              units.length = 0;
            }
          }
          if (units.length > 0) {
            result += fromCharCode.apply(String, units);
          }
          return result;
        }
        function readArray(length) {
          let array2 = new Array(length);
          for (let i = 0; i < length; i++) {
            array2[i] = read();
          }
          if (currentUnpackr.freezeData)
            return Object.freeze(array2);
          return array2;
        }
        function readMap(length) {
          if (currentUnpackr.mapsAsObjects) {
            let object2 = {};
            for (let i = 0; i < length; i++) {
              let key2 = readKey();
              if (key2 === "__proto__")
                key2 = "__proto_";
              object2[key2] = read();
            }
            return object2;
          } else {
            let map = /* @__PURE__ */ new Map();
            for (let i = 0; i < length; i++) {
              map.set(read(), read());
            }
            return map;
          }
        }
        var fromCharCode = String.fromCharCode;
        function longStringInJS(length) {
          let start = position$1;
          let bytes2 = new Array(length);
          for (let i = 0; i < length; i++) {
            const byte = src[position$1++];
            if ((byte & 128) > 0) {
              position$1 = start;
              return;
            }
            bytes2[i] = byte;
          }
          return fromCharCode.apply(String, bytes2);
        }
        function shortStringInJS(length) {
          if (length < 4) {
            if (length < 2) {
              if (length === 0)
                return "";
              else {
                let a = src[position$1++];
                if ((a & 128) > 1) {
                  position$1 -= 1;
                  return;
                }
                return fromCharCode(a);
              }
            } else {
              let a = src[position$1++];
              let b = src[position$1++];
              if ((a & 128) > 0 || (b & 128) > 0) {
                position$1 -= 2;
                return;
              }
              if (length < 3)
                return fromCharCode(a, b);
              let c = src[position$1++];
              if ((c & 128) > 0) {
                position$1 -= 3;
                return;
              }
              return fromCharCode(a, b, c);
            }
          } else {
            let a = src[position$1++];
            let b = src[position$1++];
            let c = src[position$1++];
            let d = src[position$1++];
            if ((a & 128) > 0 || (b & 128) > 0 || (c & 128) > 0 || (d & 128) > 0) {
              position$1 -= 4;
              return;
            }
            if (length < 6) {
              if (length === 4)
                return fromCharCode(a, b, c, d);
              else {
                let e = src[position$1++];
                if ((e & 128) > 0) {
                  position$1 -= 5;
                  return;
                }
                return fromCharCode(a, b, c, d, e);
              }
            } else if (length < 8) {
              let e = src[position$1++];
              let f = src[position$1++];
              if ((e & 128) > 0 || (f & 128) > 0) {
                position$1 -= 6;
                return;
              }
              if (length < 7)
                return fromCharCode(a, b, c, d, e, f);
              let g = src[position$1++];
              if ((g & 128) > 0) {
                position$1 -= 7;
                return;
              }
              return fromCharCode(a, b, c, d, e, f, g);
            } else {
              let e = src[position$1++];
              let f = src[position$1++];
              let g = src[position$1++];
              let h = src[position$1++];
              if ((e & 128) > 0 || (f & 128) > 0 || (g & 128) > 0 || (h & 128) > 0) {
                position$1 -= 8;
                return;
              }
              if (length < 10) {
                if (length === 8)
                  return fromCharCode(a, b, c, d, e, f, g, h);
                else {
                  let i = src[position$1++];
                  if ((i & 128) > 0) {
                    position$1 -= 9;
                    return;
                  }
                  return fromCharCode(a, b, c, d, e, f, g, h, i);
                }
              } else if (length < 12) {
                let i = src[position$1++];
                let j = src[position$1++];
                if ((i & 128) > 0 || (j & 128) > 0) {
                  position$1 -= 10;
                  return;
                }
                if (length < 11)
                  return fromCharCode(a, b, c, d, e, f, g, h, i, j);
                let k = src[position$1++];
                if ((k & 128) > 0) {
                  position$1 -= 11;
                  return;
                }
                return fromCharCode(a, b, c, d, e, f, g, h, i, j, k);
              } else {
                let i = src[position$1++];
                let j = src[position$1++];
                let k = src[position$1++];
                let l = src[position$1++];
                if ((i & 128) > 0 || (j & 128) > 0 || (k & 128) > 0 || (l & 128) > 0) {
                  position$1 -= 12;
                  return;
                }
                if (length < 14) {
                  if (length === 12)
                    return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l);
                  else {
                    let m = src[position$1++];
                    if ((m & 128) > 0) {
                      position$1 -= 13;
                      return;
                    }
                    return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m);
                  }
                } else {
                  let m = src[position$1++];
                  let n = src[position$1++];
                  if ((m & 128) > 0 || (n & 128) > 0) {
                    position$1 -= 14;
                    return;
                  }
                  if (length < 15)
                    return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n);
                  let o = src[position$1++];
                  if ((o & 128) > 0) {
                    position$1 -= 15;
                    return;
                  }
                  return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o);
                }
              }
            }
          }
        }
        function readOnlyJSString() {
          let token = src[position$1++];
          let length;
          if (token < 192) {
            length = token - 160;
          } else {
            switch (token) {
              case 217:
                length = src[position$1++];
                break;
              case 218:
                length = dataView.getUint16(position$1);
                position$1 += 2;
                break;
              case 219:
                length = dataView.getUint32(position$1);
                position$1 += 4;
                break;
              default:
                throw new Error("Expected string");
            }
          }
          return readStringJS(length);
        }
        function readBin(length) {
          return currentUnpackr.copyBuffers ? (
            // specifically use the copying slice (not the node one)
            Uint8Array.prototype.slice.call(src, position$1, position$1 += length)
          ) : src.subarray(position$1, position$1 += length);
        }
        function readExt(length) {
          let type = src[position$1++];
          if (currentExtensions[type]) {
            let end;
            return currentExtensions[type](src.subarray(position$1, end = position$1 += length), (readPosition) => {
              position$1 = readPosition;
              try {
                return read();
              } finally {
                position$1 = end;
              }
            });
          } else
            throw new Error("Unknown extension type " + type);
        }
        var keyCache = new Array(4096);
        function readKey() {
          let length = src[position$1++];
          if (length >= 160 && length < 192) {
            length = length - 160;
            if (srcStringEnd >= position$1)
              return srcString.slice(position$1 - srcStringStart, (position$1 += length) - srcStringStart);
            else if (!(srcStringEnd == 0 && srcEnd < 180))
              return readFixedString(length);
          } else {
            position$1--;
            return asSafeString(read());
          }
          let key2 = (length << 5 ^ (length > 1 ? dataView.getUint16(position$1) : length > 0 ? src[position$1] : 0)) & 4095;
          let entry = keyCache[key2];
          let checkPosition = position$1;
          let end = position$1 + length - 3;
          let chunk;
          let i = 0;
          if (entry && entry.bytes == length) {
            while (checkPosition < end) {
              chunk = dataView.getUint32(checkPosition);
              if (chunk != entry[i++]) {
                checkPosition = 1879048192;
                break;
              }
              checkPosition += 4;
            }
            end += 3;
            while (checkPosition < end) {
              chunk = src[checkPosition++];
              if (chunk != entry[i++]) {
                checkPosition = 1879048192;
                break;
              }
            }
            if (checkPosition === end) {
              position$1 = checkPosition;
              return entry.string;
            }
            end -= 3;
            checkPosition = position$1;
          }
          entry = [];
          keyCache[key2] = entry;
          entry.bytes = length;
          while (checkPosition < end) {
            chunk = dataView.getUint32(checkPosition);
            entry.push(chunk);
            checkPosition += 4;
          }
          end += 3;
          while (checkPosition < end) {
            chunk = src[checkPosition++];
            entry.push(chunk);
          }
          let string = length < 16 ? shortStringInJS(length) : longStringInJS(length);
          if (string != null)
            return entry.string = string;
          return entry.string = readFixedString(length);
        }
        function asSafeString(property) {
          if (typeof property === "string") return property;
          if (typeof property === "number" || typeof property === "boolean" || typeof property === "bigint") return property.toString();
          if (property == null) return property + "";
          if (currentUnpackr.allowArraysInMapKeys && Array.isArray(property) && property.flat().every((item) => ["string", "number", "boolean", "bigint"].includes(typeof item))) {
            return property.flat().toString();
          }
          throw new Error(`Invalid property type for record: ${typeof property}`);
        }
        const recordDefinition = (id, highByte) => {
          let structure = read().map(asSafeString);
          let firstByte = id;
          if (highByte !== void 0) {
            id = id < 32 ? -((highByte << 5) + id) : (highByte << 5) + id;
            structure.highByte = highByte;
          }
          let existingStructure = currentStructures[id];
          if (existingStructure && (existingStructure.isShared || sequentialMode)) {
            (currentStructures.restoreStructures || (currentStructures.restoreStructures = []))[id] = existingStructure;
          }
          currentStructures[id] = structure;
          structure.read = createStructureReader(structure, firstByte);
          return structure.read();
        };
        currentExtensions[0] = () => {
        };
        currentExtensions[0].noBuffer = true;
        currentExtensions[66] = (data) => {
          let headLength = data.byteLength % 8 || 8;
          let head = BigInt(data[0] & 128 ? data[0] - 256 : data[0]);
          for (let i = 1; i < headLength; i++) {
            head <<= BigInt(8);
            head += BigInt(data[i]);
          }
          if (data.byteLength !== headLength) {
            let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
            let decode3 = (start, end) => {
              let length = end - start;
              if (length <= 40) {
                let out = view.getBigUint64(start);
                for (let i = start + 8; i < end; i += 8) {
                  out <<= BigInt(64n);
                  out |= view.getBigUint64(i);
                }
                return out;
              }
              let middle = start + (length >> 4 << 3);
              let left = decode3(start, middle);
              let right = decode3(middle, end);
              return left << BigInt((end - middle) * 8) | right;
            };
            head = head << BigInt((view.byteLength - headLength) * 8) | decode3(headLength, view.byteLength);
          }
          return head;
        };
        let errors = {
          Error,
          EvalError,
          RangeError,
          ReferenceError,
          SyntaxError,
          TypeError,
          URIError,
          AggregateError: typeof AggregateError === "function" ? AggregateError : null
        };
        currentExtensions[101] = () => {
          let data = read();
          if (!errors[data[0]]) {
            let error = Error(data[1], { cause: data[2] });
            error.name = data[0];
            return error;
          }
          return errors[data[0]](data[1], { cause: data[2] });
        };
        currentExtensions[105] = (data) => {
          if (currentUnpackr.structuredClone === false) throw new Error("Structured clone extension is disabled");
          let id = dataView.getUint32(position$1 - 4);
          if (!referenceMap)
            referenceMap = /* @__PURE__ */ new Map();
          let token = src[position$1];
          let target2;
          if (token >= 144 && token < 160 || token == 220 || token == 221)
            target2 = [];
          else if (token >= 128 && token < 144 || token == 222 || token == 223)
            target2 = /* @__PURE__ */ new Map();
          else if ((token >= 199 && token <= 201 || token >= 212 && token <= 216) && src[position$1 + 1] === 115)
            target2 = /* @__PURE__ */ new Set();
          else
            target2 = {};
          let refEntry = { target: target2 };
          referenceMap.set(id, refEntry);
          let targetProperties = read();
          if (!refEntry.used) {
            return refEntry.target = targetProperties;
          } else {
            Object.assign(target2, targetProperties);
          }
          if (target2 instanceof Map)
            for (let [k, v] of targetProperties.entries()) target2.set(k, v);
          if (target2 instanceof Set)
            for (let i of Array.from(targetProperties)) target2.add(i);
          return target2;
        };
        currentExtensions[112] = (data) => {
          if (currentUnpackr.structuredClone === false) throw new Error("Structured clone extension is disabled");
          let id = dataView.getUint32(position$1 - 4);
          let refEntry = referenceMap.get(id);
          refEntry.used = true;
          return refEntry.target;
        };
        currentExtensions[115] = () => new Set(read());
        const typedArrays = ["Int8", "Uint8", "Uint8Clamped", "Int16", "Uint16", "Int32", "Uint32", "Float32", "Float64", "BigInt64", "BigUint64"].map((type) => type + "Array");
        let glbl = typeof globalThis === "object" ? globalThis : window;
        currentExtensions[116] = (data) => {
          let typeCode = data[0];
          let buffer = Uint8Array.prototype.slice.call(data, 1).buffer;
          let typedArrayName = typedArrays[typeCode];
          if (!typedArrayName) {
            if (typeCode === 16) return buffer;
            if (typeCode === 17) return new DataView(buffer);
            throw new Error("Could not find typed array for code " + typeCode);
          }
          return new glbl[typedArrayName](buffer);
        };
        currentExtensions[120] = () => {
          let data = read();
          return new RegExp(data[0], data[1]);
        };
        const TEMP_BUNDLE = [];
        currentExtensions[98] = (data) => {
          let dataSize = (data[0] << 24) + (data[1] << 16) + (data[2] << 8) + data[3];
          let dataPosition = position$1;
          position$1 += dataSize - data.length;
          bundledStrings$1 = TEMP_BUNDLE;
          bundledStrings$1 = [readOnlyJSString(), readOnlyJSString()];
          bundledStrings$1.position0 = 0;
          bundledStrings$1.position1 = 0;
          bundledStrings$1.postBundlePosition = position$1;
          position$1 = dataPosition;
          return read();
        };
        currentExtensions[255] = (data) => {
          if (data.length == 4)
            return new Date((data[0] * 16777216 + (data[1] << 16) + (data[2] << 8) + data[3]) * 1e3);
          else if (data.length == 8)
            return new Date(
              ((data[0] << 22) + (data[1] << 14) + (data[2] << 6) + (data[3] >> 2)) / 1e6 + ((data[3] & 3) * 4294967296 + data[4] * 16777216 + (data[5] << 16) + (data[6] << 8) + data[7]) * 1e3
            );
          else if (data.length == 12)
            return new Date(
              ((data[0] << 24) + (data[1] << 16) + (data[2] << 8) + data[3]) / 1e6 + ((data[4] & 128 ? -281474976710656 : 0) + data[6] * 1099511627776 + data[7] * 4294967296 + data[8] * 16777216 + (data[9] << 16) + (data[10] << 8) + data[11]) * 1e3
            );
          else
            return /* @__PURE__ */ new Date("invalid");
        };
        function saveState(callback) {
          let savedSrcEnd = srcEnd;
          let savedPosition = position$1;
          let savedSrcStringStart = srcStringStart;
          let savedSrcStringEnd = srcStringEnd;
          let savedSrcString = srcString;
          let savedReferenceMap = referenceMap;
          let savedBundledStrings = bundledStrings$1;
          let savedSrc = new Uint8Array(src.slice(0, srcEnd));
          let savedStructures = currentStructures;
          let savedStructuresContents = currentStructures.slice(0, currentStructures.length);
          let savedPackr = currentUnpackr;
          let savedSequentialMode = sequentialMode;
          let value = callback();
          srcEnd = savedSrcEnd;
          position$1 = savedPosition;
          srcStringStart = savedSrcStringStart;
          srcStringEnd = savedSrcStringEnd;
          srcString = savedSrcString;
          referenceMap = savedReferenceMap;
          bundledStrings$1 = savedBundledStrings;
          src = savedSrc;
          sequentialMode = savedSequentialMode;
          currentStructures = savedStructures;
          currentStructures.splice(0, currentStructures.length, ...savedStructuresContents);
          currentUnpackr = savedPackr;
          dataView = new DataView(src.buffer, src.byteOffset, src.byteLength);
          return value;
        }
        function clearSource() {
          src = null;
          referenceMap = null;
          currentStructures = null;
        }
        function addExtension$1(extension) {
          if (extension.unpack)
            currentExtensions[extension.type] = extension.unpack;
          else
            currentExtensions[extension.type] = extension;
        }
        const mult10 = new Array(147);
        for (let i = 0; i < 256; i++) {
          mult10[i] = +("1e" + Math.floor(45.15 - i * 0.30103));
        }
        const Decoder = Unpackr;
        var defaultUnpackr = new Unpackr({ useRecords: false });
        const unpack2 = defaultUnpackr.unpack;
        const unpackMultiple = defaultUnpackr.unpackMultiple;
        const decode2 = defaultUnpackr.unpack;
        const FLOAT32_OPTIONS = {
          NEVER: 0,
          ALWAYS: 1,
          DECIMAL_ROUND: 3,
          DECIMAL_FIT: 4
        };
        let f32Array = new Float32Array(1);
        let u8Array = new Uint8Array(f32Array.buffer, 0, 4);
        function roundFloat32(float32Number) {
          f32Array[0] = float32Number;
          let multiplier = mult10[(u8Array[3] & 127) << 1 | u8Array[2] >> 7];
          return (multiplier * float32Number + (float32Number > 0 ? 0.5 : -0.5) >> 0) / multiplier;
        }
        let textEncoder;
        try {
          textEncoder = new TextEncoder();
        } catch (error) {
        }
        let extensions, extensionClasses;
        const hasNodeBuffer = typeof Buffer !== "undefined";
        const ByteArrayAllocate = hasNodeBuffer ? function(length) {
          return Buffer.allocUnsafeSlow(length);
        } : Uint8Array;
        const ByteArray = hasNodeBuffer ? Buffer : Uint8Array;
        const MAX_BUFFER_SIZE = hasNodeBuffer ? 4294967296 : 2144337920;
        let target, keysTarget;
        let targetView;
        let position = 0;
        let safeEnd;
        let bundledStrings = null;
        let writeStructSlots;
        const MAX_BUNDLE_SIZE = 21760;
        const hasNonLatin = /[-￿]/;
        const RECORD_SYMBOL = Symbol("record-id");
        class Packr extends Unpackr {
          constructor(options) {
            super(options);
            this.offset = 0;
            let start;
            let hasSharedUpdate;
            let structures;
            let referenceMap2;
            let encodeUtf8 = ByteArray.prototype.utf8Write ? function(string, position2) {
              return target.utf8Write(string, position2, target.byteLength - position2);
            } : textEncoder && textEncoder.encodeInto ? function(string, position2) {
              return textEncoder.encodeInto(string, target.subarray(position2)).written;
            } : false;
            let packr = this;
            if (!options)
              options = {};
            let isSequential = options && options.sequential;
            let hasSharedStructures = options.structures || options.saveStructures;
            let maxSharedStructures = options.maxSharedStructures;
            if (maxSharedStructures == null)
              maxSharedStructures = hasSharedStructures ? 32 : 0;
            if (maxSharedStructures > 8160)
              throw new Error("Maximum maxSharedStructure is 8160");
            if (options.structuredClone && options.moreTypes == void 0) {
              this.moreTypes = true;
            }
            let maxOwnStructures = options.maxOwnStructures;
            if (maxOwnStructures == null)
              maxOwnStructures = hasSharedStructures ? 32 : 64;
            if (!this.structures && options.useRecords != false)
              this.structures = [];
            let useTwoByteRecords = maxSharedStructures > 32 || maxOwnStructures + maxSharedStructures > 64;
            let sharedLimitId = maxSharedStructures + 64;
            let maxStructureId = maxSharedStructures + maxOwnStructures + 64;
            if (maxStructureId > 8256) {
              throw new Error("Maximum maxSharedStructure + maxOwnStructure is 8192");
            }
            let recordIdsToRemove = [];
            let transitionsCount = 0;
            let serializationsSinceTransitionRebuild = 0;
            this.pack = this.encode = function(value, encodeOptions) {
              if (!target) {
                target = new ByteArrayAllocate(8192);
                targetView = target.dataView || (target.dataView = new DataView(target.buffer, 0, 8192));
                position = 0;
              }
              safeEnd = target.length - 10;
              if (safeEnd - position < 2048) {
                target = new ByteArrayAllocate(target.length);
                targetView = target.dataView || (target.dataView = new DataView(target.buffer, 0, target.length));
                safeEnd = target.length - 10;
                position = 0;
              } else
                position = position + 7 & 2147483640;
              start = position;
              if (encodeOptions & RESERVE_START_SPACE) position += encodeOptions & 255;
              referenceMap2 = packr.structuredClone ? /* @__PURE__ */ new Map() : null;
              if (packr.bundleStrings && typeof value !== "string") {
                bundledStrings = [];
                bundledStrings.size = Infinity;
              } else
                bundledStrings = null;
              structures = packr.structures;
              if (structures) {
                if (structures.uninitialized)
                  structures = packr._mergeStructures(packr.getStructures());
                let sharedLength = structures.sharedLength || 0;
                if (sharedLength > maxSharedStructures) {
                  throw new Error("Shared structures is larger than maximum shared structures, try increasing maxSharedStructures to " + structures.sharedLength);
                }
                if (!structures.transitions) {
                  structures.transitions = /* @__PURE__ */ Object.create(null);
                  for (let i = 0; i < sharedLength; i++) {
                    let keys2 = structures[i];
                    if (!keys2)
                      continue;
                    let nextTransition, transition = structures.transitions;
                    for (let j = 0, l = keys2.length; j < l; j++) {
                      let key2 = keys2[j];
                      nextTransition = transition[key2];
                      if (!nextTransition) {
                        nextTransition = transition[key2] = /* @__PURE__ */ Object.create(null);
                      }
                      transition = nextTransition;
                    }
                    transition[RECORD_SYMBOL] = i + 64;
                  }
                  this.lastNamedStructuresLength = sharedLength;
                }
                if (!isSequential) {
                  structures.nextId = sharedLength + 64;
                }
              }
              if (hasSharedUpdate)
                hasSharedUpdate = false;
              let encodingError;
              try {
                if (packr.randomAccessStructure && value && typeof value === "object") {
                  if (value.constructor === Object) writeStruct(value);
                  else if (value.constructor !== Map && !Array.isArray(value) && !extensionClasses.some((extClass) => value instanceof extClass)) {
                    writeStruct(value.toJSON ? value.toJSON() : value);
                  } else pack2(value);
                } else
                  pack2(value);
                let lastBundle = bundledStrings;
                if (bundledStrings)
                  writeBundles(start, pack2, 0);
                if (referenceMap2 && referenceMap2.idsToInsert) {
                  let idsToInsert = referenceMap2.idsToInsert.sort((a, b) => a.offset > b.offset ? 1 : -1);
                  let i = idsToInsert.length;
                  let incrementPosition = -1;
                  while (lastBundle && i > 0) {
                    let insertionPoint = idsToInsert[--i].offset + start;
                    if (insertionPoint < lastBundle.stringsPosition + start && incrementPosition === -1)
                      incrementPosition = 0;
                    if (insertionPoint > lastBundle.position + start) {
                      if (incrementPosition >= 0)
                        incrementPosition += 6;
                    } else {
                      if (incrementPosition >= 0) {
                        targetView.setUint32(
                          lastBundle.position + start,
                          targetView.getUint32(lastBundle.position + start) + incrementPosition
                        );
                        incrementPosition = -1;
                      }
                      lastBundle = lastBundle.previous;
                      i++;
                    }
                  }
                  if (incrementPosition >= 0 && lastBundle) {
                    targetView.setUint32(
                      lastBundle.position + start,
                      targetView.getUint32(lastBundle.position + start) + incrementPosition
                    );
                  }
                  position += idsToInsert.length * 6;
                  if (position > safeEnd)
                    makeRoom(position);
                  packr.offset = position;
                  let serialized = insertIds(target.subarray(start, position), idsToInsert);
                  referenceMap2 = null;
                  return serialized;
                }
                packr.offset = position;
                if (encodeOptions & REUSE_BUFFER_MODE) {
                  target.start = start;
                  target.end = position;
                  return target;
                }
                return target.subarray(start, position);
              } catch (error) {
                encodingError = error;
                throw error;
              } finally {
                if (structures) {
                  resetStructures();
                  if (hasSharedUpdate && packr.saveStructures) {
                    let sharedLength = structures.sharedLength || 0;
                    let returnBuffer = target.subarray(start, position);
                    let newSharedData = prepareStructures(structures, packr);
                    if (!encodingError) {
                      if (packr.saveStructures(newSharedData, newSharedData.isCompatible) === false) {
                        return packr.pack(value, encodeOptions);
                      }
                      packr.lastNamedStructuresLength = sharedLength;
                      if (target.length > 1073741824) target = null;
                      return returnBuffer;
                    }
                  }
                }
                if (target.length > 1073741824) target = null;
                if (encodeOptions & RESET_BUFFER_MODE)
                  position = start;
              }
            };
            const resetStructures = () => {
              if (serializationsSinceTransitionRebuild < 10)
                serializationsSinceTransitionRebuild++;
              let sharedLength = structures.sharedLength || 0;
              if (structures.length > sharedLength && !isSequential)
                structures.length = sharedLength;
              if (transitionsCount > 1e4) {
                structures.transitions = null;
                serializationsSinceTransitionRebuild = 0;
                transitionsCount = 0;
                if (recordIdsToRemove.length > 0)
                  recordIdsToRemove = [];
              } else if (recordIdsToRemove.length > 0 && !isSequential) {
                for (let i = 0, l = recordIdsToRemove.length; i < l; i++) {
                  recordIdsToRemove[i][RECORD_SYMBOL] = 0;
                }
                recordIdsToRemove = [];
              }
            };
            const packArray = (value) => {
              var length = value.length;
              if (length < 16) {
                target[position++] = 144 | length;
              } else if (length < 65536) {
                target[position++] = 220;
                target[position++] = length >> 8;
                target[position++] = length & 255;
              } else {
                target[position++] = 221;
                targetView.setUint32(position, length);
                position += 4;
              }
              for (let i = 0; i < length; i++) {
                pack2(value[i]);
              }
            };
            const pack2 = (value) => {
              if (position > safeEnd)
                target = makeRoom(position);
              var type = typeof value;
              var length;
              if (type === "string") {
                let strLength = value.length;
                if (bundledStrings && strLength >= 4 && strLength < 4096) {
                  if ((bundledStrings.size += strLength) > MAX_BUNDLE_SIZE) {
                    let extStart;
                    let maxBytes2 = (bundledStrings[0] ? bundledStrings[0].length * 3 + bundledStrings[1].length : 0) + 10;
                    if (position + maxBytes2 > safeEnd)
                      target = makeRoom(position + maxBytes2);
                    let lastBundle;
                    if (bundledStrings.position) {
                      lastBundle = bundledStrings;
                      target[position] = 200;
                      position += 3;
                      target[position++] = 98;
                      extStart = position - start;
                      position += 4;
                      writeBundles(start, pack2, 0);
                      targetView.setUint16(extStart + start - 3, position - start - extStart);
                    } else {
                      target[position++] = 214;
                      target[position++] = 98;
                      extStart = position - start;
                      position += 4;
                    }
                    bundledStrings = ["", ""];
                    bundledStrings.previous = lastBundle;
                    bundledStrings.size = 0;
                    bundledStrings.position = extStart;
                  }
                  let twoByte = hasNonLatin.test(value);
                  bundledStrings[twoByte ? 0 : 1] += value;
                  target[position++] = 193;
                  pack2(twoByte ? -strLength : strLength);
                  return;
                }
                let headerSize;
                if (strLength < 32) {
                  headerSize = 1;
                } else if (strLength < 256) {
                  headerSize = 2;
                } else if (strLength < 65536) {
                  headerSize = 3;
                } else {
                  headerSize = 5;
                }
                let maxBytes = strLength * 3;
                if (position + maxBytes > safeEnd)
                  target = makeRoom(position + maxBytes);
                if (strLength < 64 || !encodeUtf8) {
                  let i, c1, c2, strPosition = position + headerSize;
                  for (i = 0; i < strLength; i++) {
                    c1 = value.charCodeAt(i);
                    if (c1 < 128) {
                      target[strPosition++] = c1;
                    } else if (c1 < 2048) {
                      target[strPosition++] = c1 >> 6 | 192;
                      target[strPosition++] = c1 & 63 | 128;
                    } else if ((c1 & 64512) === 55296 && ((c2 = value.charCodeAt(i + 1)) & 64512) === 56320) {
                      c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
                      i++;
                      target[strPosition++] = c1 >> 18 | 240;
                      target[strPosition++] = c1 >> 12 & 63 | 128;
                      target[strPosition++] = c1 >> 6 & 63 | 128;
                      target[strPosition++] = c1 & 63 | 128;
                    } else {
                      target[strPosition++] = c1 >> 12 | 224;
                      target[strPosition++] = c1 >> 6 & 63 | 128;
                      target[strPosition++] = c1 & 63 | 128;
                    }
                  }
                  length = strPosition - position - headerSize;
                } else {
                  length = encodeUtf8(value, position + headerSize);
                }
                if (length < 32) {
                  target[position++] = 160 | length;
                } else if (length < 256) {
                  if (headerSize < 2) {
                    target.copyWithin(position + 2, position + 1, position + 1 + length);
                  }
                  target[position++] = 217;
                  target[position++] = length;
                } else if (length < 65536) {
                  if (headerSize < 3) {
                    target.copyWithin(position + 3, position + 2, position + 2 + length);
                  }
                  target[position++] = 218;
                  target[position++] = length >> 8;
                  target[position++] = length & 255;
                } else {
                  if (headerSize < 5) {
                    target.copyWithin(position + 5, position + 3, position + 3 + length);
                  }
                  target[position++] = 219;
                  targetView.setUint32(position, length);
                  position += 4;
                }
                position += length;
              } else if (type === "number") {
                if (value >>> 0 === value) {
                  if (value < 32 || value < 128 && this.useRecords === false || value < 64 && !this.randomAccessStructure) {
                    target[position++] = value;
                  } else if (value < 256) {
                    target[position++] = 204;
                    target[position++] = value;
                  } else if (value < 65536) {
                    target[position++] = 205;
                    target[position++] = value >> 8;
                    target[position++] = value & 255;
                  } else {
                    target[position++] = 206;
                    targetView.setUint32(position, value);
                    position += 4;
                  }
                } else if (value >> 0 === value) {
                  if (value >= -32) {
                    target[position++] = 256 + value;
                  } else if (value >= -128) {
                    target[position++] = 208;
                    target[position++] = value + 256;
                  } else if (value >= -32768) {
                    target[position++] = 209;
                    targetView.setInt16(position, value);
                    position += 2;
                  } else {
                    target[position++] = 210;
                    targetView.setInt32(position, value);
                    position += 4;
                  }
                } else {
                  let useFloat32;
                  if ((useFloat32 = this.useFloat32) > 0 && value < 4294967296 && value >= -2147483648) {
                    target[position++] = 202;
                    targetView.setFloat32(position, value);
                    let xShifted;
                    if (useFloat32 < 4 || // this checks for rounding of numbers that were encoded in 32-bit float to nearest significant decimal digit that could be preserved
                    (xShifted = value * mult10[(target[position] & 127) << 1 | target[position + 1] >> 7]) >> 0 === xShifted) {
                      position += 4;
                      return;
                    } else
                      position--;
                  }
                  target[position++] = 203;
                  targetView.setFloat64(position, value);
                  position += 8;
                }
              } else if (type === "object" || type === "function") {
                if (!value)
                  target[position++] = 192;
                else {
                  if (referenceMap2) {
                    let referee = referenceMap2.get(value);
                    if (referee) {
                      if (!referee.id) {
                        let idsToInsert = referenceMap2.idsToInsert || (referenceMap2.idsToInsert = []);
                        referee.id = idsToInsert.push(referee);
                      }
                      target[position++] = 214;
                      target[position++] = 112;
                      targetView.setUint32(position, referee.id);
                      position += 4;
                      return;
                    } else
                      referenceMap2.set(value, { offset: position - start });
                  }
                  let constructor = value.constructor;
                  if (constructor === Object) {
                    writeObject(value);
                  } else if (constructor === Array) {
                    packArray(value);
                  } else if (constructor === Map) {
                    if (this.mapAsEmptyObject) target[position++] = 128;
                    else {
                      length = value.size;
                      if (length < 16) {
                        target[position++] = 128 | length;
                      } else if (length < 65536) {
                        target[position++] = 222;
                        target[position++] = length >> 8;
                        target[position++] = length & 255;
                      } else {
                        target[position++] = 223;
                        targetView.setUint32(position, length);
                        position += 4;
                      }
                      for (let [key2, entryValue] of value) {
                        pack2(key2);
                        pack2(entryValue);
                      }
                    }
                  } else {
                    for (let i = 0, l = extensions.length; i < l; i++) {
                      let extensionClass = extensionClasses[i];
                      if (value instanceof extensionClass) {
                        let extension = extensions[i];
                        if (extension.write) {
                          if (extension.type) {
                            target[position++] = 212;
                            target[position++] = extension.type;
                            target[position++] = 0;
                          }
                          let writeResult = extension.write.call(this, value);
                          if (writeResult === value) {
                            if (Array.isArray(value)) {
                              packArray(value);
                            } else {
                              writeObject(value);
                            }
                          } else {
                            pack2(writeResult);
                          }
                          return;
                        }
                        let currentTarget = target;
                        let currentTargetView = targetView;
                        let currentPosition = position;
                        target = null;
                        let result;
                        try {
                          result = extension.pack.call(this, value, (size) => {
                            target = currentTarget;
                            currentTarget = null;
                            position += size;
                            if (position > safeEnd)
                              makeRoom(position);
                            return {
                              target,
                              targetView,
                              position: position - size
                            };
                          }, pack2);
                        } finally {
                          if (currentTarget) {
                            target = currentTarget;
                            targetView = currentTargetView;
                            position = currentPosition;
                            safeEnd = target.length - 10;
                          }
                        }
                        if (result) {
                          if (result.length + position > safeEnd)
                            makeRoom(result.length + position);
                          position = writeExtensionData(result, target, position, extension.type);
                        }
                        return;
                      }
                    }
                    if (Array.isArray(value)) {
                      packArray(value);
                    } else {
                      if (value.toJSON) {
                        const json2 = value.toJSON();
                        if (json2 !== value)
                          return pack2(json2);
                      }
                      if (type === "function")
                        return pack2(this.writeFunction && this.writeFunction(value));
                      writeObject(value);
                    }
                  }
                }
              } else if (type === "boolean") {
                target[position++] = value ? 195 : 194;
              } else if (type === "bigint") {
                if (value < 9223372036854776e3 && value >= -9223372036854776e3) {
                  target[position++] = 211;
                  targetView.setBigInt64(position, value);
                } else if (value < 18446744073709552e3 && value > 0) {
                  target[position++] = 207;
                  targetView.setBigUint64(position, value);
                } else {
                  if (this.largeBigIntToFloat) {
                    target[position++] = 203;
                    targetView.setFloat64(position, Number(value));
                  } else if (this.largeBigIntToString) {
                    return pack2(value.toString());
                  } else if (this.useBigIntExtension || this.moreTypes) {
                    let empty = value < 0 ? BigInt(-1) : BigInt(0);
                    let array2;
                    if (value >> BigInt(65536) === empty) {
                      let mask = BigInt(18446744073709552e3) - BigInt(1);
                      let chunks = [];
                      while (true) {
                        chunks.push(value & mask);
                        if (value >> BigInt(63) === empty) break;
                        value >>= BigInt(64);
                      }
                      array2 = new Uint8Array(new BigUint64Array(chunks).buffer);
                      array2.reverse();
                    } else {
                      let invert = value < 0;
                      let string = (invert ? ~value : value).toString(16);
                      if (string.length % 2) {
                        string = "0" + string;
                      } else if (parseInt(string.charAt(0), 16) >= 8) {
                        string = "00" + string;
                      }
                      if (hasNodeBuffer) {
                        array2 = Buffer.from(string, "hex");
                      } else {
                        array2 = new Uint8Array(string.length / 2);
                        for (let i = 0; i < array2.length; i++) {
                          array2[i] = parseInt(string.slice(i * 2, i * 2 + 2), 16);
                        }
                      }
                      if (invert) {
                        for (let i = 0; i < array2.length; i++) array2[i] = ~array2[i];
                      }
                    }
                    if (array2.length + position > safeEnd)
                      makeRoom(array2.length + position);
                    position = writeExtensionData(array2, target, position, 66);
                    return;
                  } else {
                    throw new RangeError(value + " was too large to fit in MessagePack 64-bit integer format, use useBigIntExtension, or set largeBigIntToFloat to convert to float-64, or set largeBigIntToString to convert to string");
                  }
                }
                position += 8;
              } else if (type === "undefined") {
                if (this.encodeUndefinedAsNil)
                  target[position++] = 192;
                else {
                  target[position++] = 212;
                  target[position++] = 0;
                  target[position++] = 0;
                }
              } else {
                throw new Error("Unknown type: " + type);
              }
            };
            const writePlainObject = this.variableMapSize || this.coercibleKeyAsNumber || this.skipValues ? (object2) => {
              let keys2;
              if (this.skipValues) {
                keys2 = [];
                for (let key3 in object2) {
                  if ((typeof object2.hasOwnProperty !== "function" || object2.hasOwnProperty(key3)) && !this.skipValues.includes(object2[key3]))
                    keys2.push(key3);
                }
              } else {
                keys2 = Object.keys(object2);
              }
              let length = keys2.length;
              if (length < 16) {
                target[position++] = 128 | length;
              } else if (length < 65536) {
                target[position++] = 222;
                target[position++] = length >> 8;
                target[position++] = length & 255;
              } else {
                target[position++] = 223;
                targetView.setUint32(position, length);
                position += 4;
              }
              let key2;
              if (this.coercibleKeyAsNumber) {
                for (let i = 0; i < length; i++) {
                  key2 = keys2[i];
                  let num = Number(key2);
                  pack2(isNaN(num) ? key2 : num);
                  pack2(object2[key2]);
                }
              } else {
                for (let i = 0; i < length; i++) {
                  pack2(key2 = keys2[i]);
                  pack2(object2[key2]);
                }
              }
            } : (object2) => {
              target[position++] = 222;
              let objectOffset = position - start;
              position += 2;
              let size = 0;
              for (let key2 in object2) {
                if (typeof object2.hasOwnProperty !== "function" || object2.hasOwnProperty(key2)) {
                  pack2(key2);
                  pack2(object2[key2]);
                  size++;
                }
              }
              if (size > 65535) {
                throw new Error('Object is too large to serialize with fast 16-bit map size, use the "variableMapSize" option to serialize this object');
              }
              target[objectOffset++ + start] = size >> 8;
              target[objectOffset + start] = size & 255;
            };
            const writeRecord = this.useRecords === false ? writePlainObject : options.progressiveRecords && !useTwoByteRecords ? (
              // this is about 2% faster for highly stable structures, since it only requires one for-in loop (but much more expensive when new structure needs to be written)
              (object2) => {
                let nextTransition, transition = structures.transitions || (structures.transitions = /* @__PURE__ */ Object.create(null));
                let objectOffset = position++ - start;
                let wroteKeys;
                for (let key2 in object2) {
                  if (typeof object2.hasOwnProperty !== "function" || object2.hasOwnProperty(key2)) {
                    nextTransition = transition[key2];
                    if (nextTransition)
                      transition = nextTransition;
                    else {
                      let keys2 = Object.keys(object2);
                      let lastTransition = transition;
                      transition = structures.transitions;
                      let newTransitions = 0;
                      for (let i = 0, l = keys2.length; i < l; i++) {
                        let key3 = keys2[i];
                        nextTransition = transition[key3];
                        if (!nextTransition) {
                          nextTransition = transition[key3] = /* @__PURE__ */ Object.create(null);
                          newTransitions++;
                        }
                        transition = nextTransition;
                      }
                      if (objectOffset + start + 1 == position) {
                        position--;
                        newRecord(transition, keys2, newTransitions);
                      } else
                        insertNewRecord(transition, keys2, objectOffset, newTransitions);
                      wroteKeys = true;
                      transition = lastTransition[key2];
                    }
                    pack2(object2[key2]);
                  }
                }
                if (!wroteKeys) {
                  let recordId = transition[RECORD_SYMBOL];
                  if (recordId)
                    target[objectOffset + start] = recordId;
                  else
                    insertNewRecord(transition, Object.keys(object2), objectOffset, 0);
                }
              }
            ) : (object2) => {
              let nextTransition, transition = structures.transitions || (structures.transitions = /* @__PURE__ */ Object.create(null));
              let newTransitions = 0;
              for (let key2 in object2) if (typeof object2.hasOwnProperty !== "function" || object2.hasOwnProperty(key2)) {
                nextTransition = transition[key2];
                if (!nextTransition) {
                  nextTransition = transition[key2] = /* @__PURE__ */ Object.create(null);
                  newTransitions++;
                }
                transition = nextTransition;
              }
              let recordId = transition[RECORD_SYMBOL];
              if (recordId) {
                if (recordId >= 96 && useTwoByteRecords) {
                  target[position++] = ((recordId -= 96) & 31) + 96;
                  target[position++] = recordId >> 5;
                } else
                  target[position++] = recordId;
              } else {
                newRecord(transition, transition.__keys__ || Object.keys(object2), newTransitions);
              }
              for (let key2 in object2)
                if (typeof object2.hasOwnProperty !== "function" || object2.hasOwnProperty(key2)) {
                  pack2(object2[key2]);
                }
            };
            const checkUseRecords = typeof this.useRecords == "function" && this.useRecords;
            const writeObject = checkUseRecords ? (object2) => {
              checkUseRecords(object2) ? writeRecord(object2) : writePlainObject(object2);
            } : writeRecord;
            const makeRoom = (end) => {
              let newSize;
              if (end > 16777216) {
                if (end - start > MAX_BUFFER_SIZE)
                  throw new Error("Packed buffer would be larger than maximum buffer size");
                newSize = Math.min(
                  MAX_BUFFER_SIZE,
                  Math.round(Math.max((end - start) * (end > 67108864 ? 1.25 : 2), 4194304) / 4096) * 4096
                );
              } else
                newSize = (Math.max(end - start << 2, target.length - 1) >> 12) + 1 << 12;
              let newBuffer = new ByteArrayAllocate(newSize);
              targetView = newBuffer.dataView || (newBuffer.dataView = new DataView(newBuffer.buffer, 0, newSize));
              end = Math.min(end, target.length);
              if (target.copy)
                target.copy(newBuffer, 0, start, end);
              else
                newBuffer.set(target.slice(start, end));
              position -= start;
              start = 0;
              safeEnd = newBuffer.length - 10;
              return target = newBuffer;
            };
            const newRecord = (transition, keys2, newTransitions) => {
              let recordId = structures.nextId;
              if (!recordId)
                recordId = 64;
              if (recordId < sharedLimitId && this.shouldShareStructure && !this.shouldShareStructure(keys2)) {
                recordId = structures.nextOwnId;
                if (!(recordId < maxStructureId))
                  recordId = sharedLimitId;
                structures.nextOwnId = recordId + 1;
              } else {
                if (recordId >= maxStructureId)
                  recordId = sharedLimitId;
                structures.nextId = recordId + 1;
              }
              let highByte = keys2.highByte = recordId >= 96 && useTwoByteRecords ? recordId - 96 >> 5 : -1;
              transition[RECORD_SYMBOL] = recordId;
              transition.__keys__ = keys2;
              structures[recordId - 64] = keys2;
              if (recordId < sharedLimitId) {
                keys2.isShared = true;
                structures.sharedLength = recordId - 63;
                hasSharedUpdate = true;
                if (highByte >= 0) {
                  target[position++] = (recordId & 31) + 96;
                  target[position++] = highByte;
                } else {
                  target[position++] = recordId;
                }
              } else {
                if (highByte >= 0) {
                  target[position++] = 213;
                  target[position++] = 114;
                  target[position++] = (recordId & 31) + 96;
                  target[position++] = highByte;
                } else {
                  target[position++] = 212;
                  target[position++] = 114;
                  target[position++] = recordId;
                }
                if (newTransitions)
                  transitionsCount += serializationsSinceTransitionRebuild * newTransitions;
                if (recordIdsToRemove.length >= maxOwnStructures)
                  recordIdsToRemove.shift()[RECORD_SYMBOL] = 0;
                recordIdsToRemove.push(transition);
                pack2(keys2);
              }
            };
            const insertNewRecord = (transition, keys2, insertionOffset, newTransitions) => {
              let mainTarget = target;
              let mainPosition = position;
              let mainSafeEnd = safeEnd;
              let mainStart = start;
              target = keysTarget;
              position = 0;
              start = 0;
              if (!target)
                keysTarget = target = new ByteArrayAllocate(8192);
              safeEnd = target.length - 10;
              newRecord(transition, keys2, newTransitions);
              keysTarget = target;
              let keysPosition = position;
              target = mainTarget;
              position = mainPosition;
              safeEnd = mainSafeEnd;
              start = mainStart;
              if (keysPosition > 1) {
                let newEnd = position + keysPosition - 1;
                if (newEnd > safeEnd)
                  makeRoom(newEnd);
                let insertionPosition = insertionOffset + start;
                target.copyWithin(insertionPosition + keysPosition, insertionPosition + 1, position);
                target.set(keysTarget.slice(0, keysPosition), insertionPosition);
                position = newEnd;
              } else {
                target[insertionOffset + start] = keysTarget[0];
              }
            };
            const writeStruct = (object2) => {
              let newPosition = writeStructSlots(object2, target, start, position, structures, makeRoom, (value, newPosition2, notifySharedUpdate) => {
                if (notifySharedUpdate)
                  return hasSharedUpdate = true;
                position = newPosition2;
                let startTarget = target;
                pack2(value);
                resetStructures();
                if (startTarget !== target) {
                  return { position, targetView, target };
                }
                return position;
              }, this);
              if (newPosition === 0)
                return writeObject(object2);
              position = newPosition;
            };
          }
          useBuffer(buffer) {
            target = buffer;
            target.dataView || (target.dataView = new DataView(target.buffer, target.byteOffset, target.byteLength));
            targetView = target.dataView;
            position = 0;
          }
          set position(value) {
            position = value;
          }
          get position() {
            return position;
          }
          clearSharedData() {
            if (this.structures)
              this.structures = [];
            if (this.typedStructs)
              this.typedStructs = [];
          }
        }
        extensionClasses = [Date, Set, Error, RegExp, ArrayBuffer, Object.getPrototypeOf(Uint8Array.prototype).constructor, DataView, C1Type];
        extensions = [{
          pack(date, allocateForWrite, pack2) {
            let seconds = date.getTime() / 1e3;
            if ((this.useTimestamp32 || date.getMilliseconds() === 0) && seconds >= 0 && seconds < 4294967296) {
              let { target: target2, targetView: targetView2, position: position2 } = allocateForWrite(6);
              target2[position2++] = 214;
              target2[position2++] = 255;
              targetView2.setUint32(position2, seconds);
            } else if (seconds > 0 && seconds < 4294967296) {
              let { target: target2, targetView: targetView2, position: position2 } = allocateForWrite(10);
              target2[position2++] = 215;
              target2[position2++] = 255;
              targetView2.setUint32(position2, date.getMilliseconds() * 4e6 + (seconds / 1e3 / 4294967296 >> 0));
              targetView2.setUint32(position2 + 4, seconds);
            } else if (isNaN(seconds)) {
              if (this.onInvalidDate) {
                allocateForWrite(0);
                return pack2(this.onInvalidDate());
              }
              let { target: target2, targetView: targetView2, position: position2 } = allocateForWrite(3);
              target2[position2++] = 212;
              target2[position2++] = 255;
              target2[position2++] = 255;
            } else {
              let { target: target2, targetView: targetView2, position: position2 } = allocateForWrite(15);
              target2[position2++] = 199;
              target2[position2++] = 12;
              target2[position2++] = 255;
              targetView2.setUint32(position2, date.getMilliseconds() * 1e6);
              targetView2.setBigInt64(position2 + 4, BigInt(Math.floor(seconds)));
            }
          }
        }, {
          pack(set, allocateForWrite, pack2) {
            if (this.setAsEmptyObject) {
              allocateForWrite(0);
              return pack2({});
            }
            let array2 = Array.from(set);
            let { target: target2, position: position2 } = allocateForWrite(this.moreTypes ? 3 : 0);
            if (this.moreTypes) {
              target2[position2++] = 212;
              target2[position2++] = 115;
              target2[position2++] = 0;
            }
            pack2(array2);
          }
        }, {
          pack(error, allocateForWrite, pack2) {
            let { target: target2, position: position2 } = allocateForWrite(this.moreTypes ? 3 : 0);
            if (this.moreTypes) {
              target2[position2++] = 212;
              target2[position2++] = 101;
              target2[position2++] = 0;
            }
            pack2([error.name, error.message, error.cause]);
          }
        }, {
          pack(regex, allocateForWrite, pack2) {
            let { target: target2, position: position2 } = allocateForWrite(this.moreTypes ? 3 : 0);
            if (this.moreTypes) {
              target2[position2++] = 212;
              target2[position2++] = 120;
              target2[position2++] = 0;
            }
            pack2([regex.source, regex.flags]);
          }
        }, {
          pack(arrayBuffer, allocateForWrite) {
            if (this.moreTypes)
              writeExtBuffer(arrayBuffer, 16, allocateForWrite);
            else
              writeBuffer(hasNodeBuffer ? Buffer.from(arrayBuffer) : new Uint8Array(arrayBuffer), allocateForWrite);
          }
        }, {
          pack(typedArray, allocateForWrite) {
            let constructor = typedArray.constructor;
            if (constructor !== ByteArray && this.moreTypes)
              writeExtBuffer(typedArray, typedArrays.indexOf(constructor.name), allocateForWrite);
            else
              writeBuffer(typedArray, allocateForWrite);
          }
        }, {
          pack(arrayBuffer, allocateForWrite) {
            if (this.moreTypes)
              writeExtBuffer(arrayBuffer, 17, allocateForWrite);
            else
              writeBuffer(hasNodeBuffer ? Buffer.from(arrayBuffer) : new Uint8Array(arrayBuffer), allocateForWrite);
          }
        }, {
          pack(c1, allocateForWrite) {
            let { target: target2, position: position2 } = allocateForWrite(1);
            target2[position2] = 193;
          }
        }];
        function writeExtBuffer(typedArray, type, allocateForWrite, encode2) {
          let length = typedArray.byteLength;
          if (length + 1 < 256) {
            var { target: target2, position: position2 } = allocateForWrite(4 + length);
            target2[position2++] = 199;
            target2[position2++] = length + 1;
          } else if (length + 1 < 65536) {
            var { target: target2, position: position2 } = allocateForWrite(5 + length);
            target2[position2++] = 200;
            target2[position2++] = length + 1 >> 8;
            target2[position2++] = length + 1 & 255;
          } else {
            var { target: target2, position: position2, targetView: targetView2 } = allocateForWrite(7 + length);
            target2[position2++] = 201;
            targetView2.setUint32(position2, length + 1);
            position2 += 4;
          }
          target2[position2++] = 116;
          target2[position2++] = type;
          if (!typedArray.buffer) typedArray = new Uint8Array(typedArray);
          target2.set(new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength), position2);
        }
        function writeBuffer(buffer, allocateForWrite) {
          let length = buffer.byteLength;
          var target2, position2;
          if (length < 256) {
            var { target: target2, position: position2 } = allocateForWrite(length + 2);
            target2[position2++] = 196;
            target2[position2++] = length;
          } else if (length < 65536) {
            var { target: target2, position: position2 } = allocateForWrite(length + 3);
            target2[position2++] = 197;
            target2[position2++] = length >> 8;
            target2[position2++] = length & 255;
          } else {
            var { target: target2, position: position2, targetView: targetView2 } = allocateForWrite(length + 5);
            target2[position2++] = 198;
            targetView2.setUint32(position2, length);
            position2 += 4;
          }
          target2.set(buffer, position2);
        }
        function writeExtensionData(result, target2, position2, type) {
          let length = result.length;
          switch (length) {
            case 1:
              target2[position2++] = 212;
              break;
            case 2:
              target2[position2++] = 213;
              break;
            case 4:
              target2[position2++] = 214;
              break;
            case 8:
              target2[position2++] = 215;
              break;
            case 16:
              target2[position2++] = 216;
              break;
            default:
              if (length < 256) {
                target2[position2++] = 199;
                target2[position2++] = length;
              } else if (length < 65536) {
                target2[position2++] = 200;
                target2[position2++] = length >> 8;
                target2[position2++] = length & 255;
              } else {
                target2[position2++] = 201;
                target2[position2++] = length >> 24;
                target2[position2++] = length >> 16 & 255;
                target2[position2++] = length >> 8 & 255;
                target2[position2++] = length & 255;
              }
          }
          target2[position2++] = type;
          target2.set(result, position2);
          position2 += length;
          return position2;
        }
        function insertIds(serialized, idsToInsert) {
          let nextId;
          let distanceToMove = idsToInsert.length * 6;
          let lastEnd = serialized.length - distanceToMove;
          while (nextId = idsToInsert.pop()) {
            let offset = nextId.offset;
            let id = nextId.id;
            serialized.copyWithin(offset + distanceToMove, offset, lastEnd);
            distanceToMove -= 6;
            let position2 = offset + distanceToMove;
            serialized[position2++] = 214;
            serialized[position2++] = 105;
            serialized[position2++] = id >> 24;
            serialized[position2++] = id >> 16 & 255;
            serialized[position2++] = id >> 8 & 255;
            serialized[position2++] = id & 255;
            lastEnd = offset;
          }
          return serialized;
        }
        function writeBundles(start, pack2, incrementPosition) {
          if (bundledStrings.length > 0) {
            targetView.setUint32(bundledStrings.position + start, position + incrementPosition - bundledStrings.position - start);
            bundledStrings.stringsPosition = position - start;
            let writeStrings = bundledStrings;
            bundledStrings = null;
            pack2(writeStrings[0]);
            pack2(writeStrings[1]);
          }
        }
        function addExtension(extension) {
          if (extension.Class) {
            if (!extension.pack && !extension.write)
              throw new Error("Extension has no pack or write function");
            if (extension.pack && !extension.type)
              throw new Error("Extension has no type (numeric code to identify the extension)");
            extensionClasses.unshift(extension.Class);
            extensions.unshift(extension);
          }
          addExtension$1(extension);
        }
        function prepareStructures(structures, packr) {
          structures.isCompatible = (existingStructures) => {
            let compatible = !existingStructures || (packr.lastNamedStructuresLength || 0) === existingStructures.length;
            if (!compatible)
              packr._mergeStructures(existingStructures);
            return compatible;
          };
          return structures;
        }
        let defaultPackr = new Packr({ useRecords: false });
        const pack = defaultPackr.pack;
        const encode = defaultPackr.pack;
        const Encoder = Packr;
        const { NEVER, ALWAYS, DECIMAL_ROUND, DECIMAL_FIT } = FLOAT32_OPTIONS;
        const REUSE_BUFFER_MODE = 512;
        const RESET_BUFFER_MODE = 1024;
        const RESERVE_START_SPACE = 2048;
        function packIter(objectIterator, options = {}) {
          if (!objectIterator || typeof objectIterator !== "object") {
            throw new Error("first argument must be an Iterable, Async Iterable, or a Promise for an Async Iterable");
          } else if (typeof objectIterator[Symbol.iterator] === "function") {
            return packIterSync(objectIterator, options);
          } else if (typeof objectIterator.then === "function" || typeof objectIterator[Symbol.asyncIterator] === "function") {
            return packIterAsync(objectIterator, options);
          } else {
            throw new Error("first argument must be an Iterable, Async Iterable, Iterator, Async Iterator, or a Promise");
          }
        }
        function* packIterSync(objectIterator, options) {
          const packr = new Packr(options);
          for (const value of objectIterator) {
            yield packr.pack(value);
          }
        }
        async function* packIterAsync(objectIterator, options) {
          const packr = new Packr(options);
          for await (const value of objectIterator) {
            yield packr.pack(value);
          }
        }
        function unpackIter(bufferIterator, options = {}) {
          if (!bufferIterator || typeof bufferIterator !== "object") {
            throw new Error("first argument must be an Iterable, Async Iterable, Iterator, Async Iterator, or a promise");
          }
          const unpackr = new Unpackr(options);
          let incomplete;
          const parser = (chunk) => {
            let yields;
            if (incomplete) {
              chunk = Buffer.concat([incomplete, chunk]);
              incomplete = void 0;
            }
            try {
              yields = unpackr.unpackMultiple(chunk);
            } catch (err2) {
              if (err2.incomplete) {
                incomplete = chunk.slice(err2.lastPosition);
                yields = err2.values;
              } else {
                throw err2;
              }
            }
            return yields;
          };
          if (typeof bufferIterator[Symbol.iterator] === "function") {
            return (function* iter() {
              for (const value of bufferIterator) {
                yield* parser(value);
              }
            })();
          } else if (typeof bufferIterator[Symbol.asyncIterator] === "function") {
            return (async function* iter() {
              for await (const value of bufferIterator) {
                yield* parser(value);
              }
            })();
          }
        }
        const decodeIter = unpackIter;
        const encodeIter = packIter;
        const useRecords = false;
        const mapsAsObjects = true;
        exports2.ALWAYS = ALWAYS;
        exports2.C1 = C1;
        exports2.DECIMAL_FIT = DECIMAL_FIT;
        exports2.DECIMAL_ROUND = DECIMAL_ROUND;
        exports2.Decoder = Decoder;
        exports2.Encoder = Encoder;
        exports2.FLOAT32_OPTIONS = FLOAT32_OPTIONS;
        exports2.NEVER = NEVER;
        exports2.Packr = Packr;
        exports2.RESERVE_START_SPACE = RESERVE_START_SPACE;
        exports2.RESET_BUFFER_MODE = RESET_BUFFER_MODE;
        exports2.REUSE_BUFFER_MODE = REUSE_BUFFER_MODE;
        exports2.Unpackr = Unpackr;
        exports2.addExtension = addExtension;
        exports2.clearSource = clearSource;
        exports2.decode = decode2;
        exports2.decodeIter = decodeIter;
        exports2.encode = encode;
        exports2.encodeIter = encodeIter;
        exports2.isNativeAccelerationEnabled = isNativeAccelerationEnabled;
        exports2.mapsAsObjects = mapsAsObjects;
        exports2.pack = pack;
        exports2.roundFloat32 = roundFloat32;
        exports2.unpack = unpack2;
        exports2.unpackMultiple = unpackMultiple;
        exports2.useRecords = useRecords;
      }));
    }
  });

const msgpackr = require_index_no_eval();
export const unpack = msgpackr.unpack, pack = msgpackr.pack;
export default msgpackr;
