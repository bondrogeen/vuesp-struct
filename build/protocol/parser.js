import { PRIMITIVE_SIZES, } from './types.js';
export class ProtocolParseError extends Error {
    constructor(message, line = 0, column = 0, file) {
        const location = line ? `${line}:${column}` : '';
        const prefix = file ? (location ? `${file}:${location}` : file) : location;
        super(prefix ? `${prefix} — ${message}` : message);
        this.line = line;
        this.column = column;
        this.file = file;
        this.name = 'ProtocolParseError';
    }
}
const SYMBOLS = new Set(['{', '}', '[', ']', '(', ')', ';', ',', ':', '=', '+', '-', '*', '/', '%', '|', '&', '^', '~', '<', '>']);
const BINARY_PRECEDENCE = {
    '|': 1,
    '^': 2,
    '&': 3,
    '<<': 4,
    '>>': 4,
    '+': 5,
    '-': 5,
    '*': 6,
    '/': 6,
    '%': 6,
};
const DEFAULT_MAX_STRUCT_SIZE = 8192;
const isPrimitive = (type) => Object.prototype.hasOwnProperty.call(PRIMITIVE_SIZES, type);
export const stripEnumPrefix = (name) => {
    const match = /^[A-Z0-9]+_(.+)$/.exec(name);
    return match ? match[1] : name;
};
const tokenize = (source, file) => {
    const tokens = [];
    let index = 0;
    let line = 1;
    let column = 1;
    const push = (type, value, tokenLine, tokenColumn) => {
        tokens.push({ type, value, line: tokenLine, column: tokenColumn });
    };
    while (index < source.length) {
        const char = source[index];
        if (char === '\n') {
            index += 1;
            line += 1;
            column = 1;
            continue;
        }
        if (char === ' ' || char === '\t' || char === '\r') {
            index += 1;
            column += 1;
            continue;
        }
        if (char === '#') {
            while (index < source.length && source[index] !== '\n') {
                index += 1;
                column += 1;
            }
            continue;
        }
        if (char === '/' && source[index + 1] === '/') {
            const tokenLine = line;
            const tokenColumn = column;
            let text = '';
            index += 2;
            column += 2;
            while (index < source.length && source[index] !== '\n') {
                text += source[index];
                index += 1;
                column += 1;
            }
            push('comment', text.trim(), tokenLine, tokenColumn);
            continue;
        }
        if (char === '/' && source[index + 1] === '*') {
            const tokenLine = line;
            const tokenColumn = column;
            let text = '';
            index += 2;
            column += 2;
            while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
                if (source[index] === '\n') {
                    line += 1;
                    column = 1;
                }
                else {
                    column += 1;
                }
                text += source[index];
                index += 1;
            }
            index += 2;
            column += 2;
            push('comment', text.replace(/\s*\*\s*/g, ' ').trim(), tokenLine, tokenColumn);
            continue;
        }
        if ((char === '<' || char === '>') && source[index + 1] === char) {
            push('symbol', char + char, line, column);
            index += 2;
            column += 2;
            continue;
        }
        if (SYMBOLS.has(char)) {
            push('symbol', char, line, column);
            index += 1;
            column += 1;
            continue;
        }
        if (/[A-Za-z_]/.test(char)) {
            const tokenLine = line;
            const tokenColumn = column;
            let word = '';
            while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) {
                word += source[index];
                index += 1;
                column += 1;
            }
            push('ident', word, tokenLine, tokenColumn);
            continue;
        }
        if (/[0-9]/.test(char)) {
            const tokenLine = line;
            const tokenColumn = column;
            let number = '';
            if (char === '0' && /[xX]/.test(source[index + 1] ?? '')) {
                number = '0x';
                index += 2;
                column += 2;
                while (index < source.length && /[0-9a-fA-F]/.test(source[index])) {
                    number += source[index];
                    index += 1;
                    column += 1;
                }
            }
            else {
                while (index < source.length && /[0-9]/.test(source[index])) {
                    number += source[index];
                    index += 1;
                    column += 1;
                }
            }
            push('number', number, tokenLine, tokenColumn);
            continue;
        }
        throw new ProtocolParseError(`неожиданный символ "${char}"`, line, column, file);
    }
    return tokens;
};
const applyBinary = (operator, left, right) => {
    switch (operator) {
        case '+':
            return left + right;
        case '-':
            return left - right;
        case '*':
            return left * right;
        case '/':
            return Math.trunc(left / right);
        case '%':
            return left % right;
        case '<<':
            return left * 2 ** right;
        case '>>':
            return Math.floor(left / 2 ** right);
        case '|':
            return (left | right) >>> 0;
        case '&':
            return (left & right) >>> 0;
        case '^':
            return (left ^ right) >>> 0;
        default:
            return 0;
    }
};
class ProtocolParser {
    constructor(source, options = {}) {
        this.index = 0;
        this.constants = new Map();
        this.enums = {};
        this.structs = {};
        this.descriptions = {};
        this.flagGroups = [];
        this.enumBase = new Map();
        this.sizeCache = new Map();
        this.file = options.file;
        this.maxStructSize = options.maxStructSize ?? DEFAULT_MAX_STRUCT_SIZE;
        this.tokens = tokenize(source, this.file);
    }
    parse() {
        while (!this.isEnd()) {
            this.skipComments();
            if (this.isEnd())
                break;
            const keyword = this.peek();
            if (keyword.type !== 'ident' || (keyword.value !== 'enum' && keyword.value !== 'struct')) {
                this.fail(`ожидалось объявление enum или struct, получено "${keyword.value}"`, keyword);
            }
            if (keyword.value === 'enum')
                this.parseEnum();
            else
                this.parseStruct();
        }
        return this.buildProtocol();
    }
    parseEnum() {
        this.expectIdent('enum');
        const name = this.expectName('имя enum');
        if (this.peek().type === 'symbol' && this.peek().value === ':') {
            this.index += 1;
            const base = this.expectName('базовый тип enum');
            if (base !== 'uint8_t' && base !== 'uint16_t' && base !== 'uint32_t') {
                this.fail(`неподдерживаемый базовый тип enum "${base}" (нужен uint8_t, uint16_t или uint32_t)`, this.peek());
            }
            this.enumBase.set(name, base);
        }
        this.expectSymbol('{');
        const members = [];
        let previous = -1;
        for (;;) {
            const description = this.takeLeadingComment();
            if (this.peek().type === 'symbol' && this.peek().value === '}') {
                this.index += 1;
                break;
            }
            const token = this.peek();
            const memberName = this.expectName('имя элемента enum');
            let value;
            if (this.peek().type === 'symbol' && this.peek().value === '=') {
                this.index += 1;
                value = this.parseExpression();
            }
            else {
                value = previous + 1;
            }
            previous = value;
            if (!Number.isInteger(value) || value < 0) {
                this.fail(`значение ${memberName} должно быть неотрицательным целым`, token);
            }
            this.constants.set(memberName, value);
            if (/_END$/.test(memberName)) {
                this.consumeSeparator();
                continue;
            }
            members.push({ full: memberName, value, description, token });
            this.consumeSeparator();
            const trailing = this.takeTrailingComment(token.line);
            if (trailing && !members[members.length - 1].description) {
                members[members.length - 1].description = trailing;
            }
        }
        this.expectSymbol(';');
        if (!members.length)
            this.fail(`enum ${name} пуст`);
        const group = members[0].full.split('_')[0];
        if (!/^[A-Z][A-Z0-9]*$/.test(group)) {
            this.fail(`член ${members[0].full} должен начинаться с ПРЕФИКСА_ (например, ${name.toUpperCase()}_VALUE)`, members[0].token);
        }
        if (!name.toLowerCase().startsWith(group.toLowerCase())) {
            this.fail(`enum ${name} должен называться начиная с "${group.toLowerCase()}", потому что его члены — ${group}_*`, members[0].token);
        }
        if (this.enums[group]) {
            this.fail(`группа ${group} уже объявлена другим enum'ом`, members[0].token);
        }
        const values = {};
        const seenValues = new Map();
        for (const member of members) {
            const prefix = member.full.split('_')[0];
            if (prefix !== group) {
                this.fail(`член ${member.full} не совпадает с префиксом ${group}_ группы ${name}`, member.token);
            }
            const publicName = stripEnumPrefix(member.full);
            if (publicName in values) {
                this.fail(`элемент "${publicName}" уже объявлен в группе ${group}`, member.token);
            }
            if (seenValues.has(member.value)) {
                this.fail(`значение ${member.value} уже занято (${seenValues.get(member.value)}), значения должны быть уникальны`, member.token);
            }
            values[publicName] = member.value;
            seenValues.set(member.value, publicName);
            if (member.description) {
                this.descriptions[`${group}.${publicName}`] = member.description;
            }
        }
        this.validateEnumRange(name, values);
        this.enums[group] = values;
        if (name.endsWith('Flags'))
            this.flagGroups.push(group);
    }
    consumeSeparator() {
        const separator = this.peek();
        if (separator.type === 'symbol' && (separator.value === ',' || separator.value === ';')) {
            this.index += 1;
        }
        else if (!(separator.type === 'symbol' && separator.value === '}')) {
            this.fail('ожидалось ",", ";" или "}"', separator);
        }
    }
    parseStruct() {
        this.expectIdent('struct');
        const name = this.expectName('имя структуры');
        if (this.structs[name])
            this.fail(`структура "${name}" уже объявлена`, this.peek());
        this.expectSymbol('{');
        const fields = [];
        const seen = new Set();
        for (;;) {
            const description = this.takeLeadingComment();
            if (this.peek().type === 'symbol' && this.peek().value === '}') {
                this.index += 1;
                break;
            }
            const typeToken = this.peek();
            const type = this.expectName('тип поля');
            const fieldToken = this.peek();
            const fieldName = this.expectName('имя поля');
            if (seen.has(fieldName))
                this.fail(`поле "${fieldName}" уже объявлено в структуре ${name}`, fieldToken);
            seen.add(fieldName);
            const dimensions = [];
            while (this.peek().type === 'symbol' && this.peek().value === '[') {
                this.index += 1;
                const size = this.parseExpression();
                if (!Number.isInteger(size) || size <= 0) {
                    this.fail(`размер массива ${fieldName} должен быть положительным целым`, this.peek());
                }
                dimensions.push(size);
                this.expectSymbol(']');
            }
            const terminator = this.peek();
            this.expectSymbol(';');
            const trailing = this.takeTrailingComment(terminator.line);
            const fieldDescription = description ?? trailing;
            if (fieldDescription)
                this.descriptions[`${name}.${fieldName}`] = fieldDescription;
            fields.push({
                name: fieldName,
                type,
                dimensions,
                line: typeToken.line,
                column: typeToken.column,
                description: fieldDescription,
            });
        }
        this.expectSymbol(';');
        this.structs[name] = { name, fields };
    }
    parseExpression() {
        return this.parseBinary(0);
    }
    parseBinary(minPrecedence) {
        let left = this.parseUnary();
        for (;;) {
            const token = this.peek();
            if (token.type !== 'symbol')
                break;
            const precedence = BINARY_PRECEDENCE[token.value];
            if (precedence === undefined || precedence < minPrecedence)
                break;
            this.index += 1;
            const right = this.parseBinary(precedence + 1);
            left = applyBinary(token.value, left, right);
        }
        return left;
    }
    parseUnary() {
        const token = this.peek();
        if (token.type === 'symbol' && (token.value === '-' || token.value === '+' || token.value === '~')) {
            this.index += 1;
            const value = this.parseUnary();
            if (token.value === '-')
                return -value;
            if (token.value === '~')
                return ~value;
            return value;
        }
        if (token.type === 'symbol' && token.value === '(') {
            this.index += 1;
            const value = this.parseExpression();
            this.expectSymbol(')');
            return value;
        }
        if (token.type === 'number') {
            this.index += 1;
            return token.value.startsWith('0x') ? Number.parseInt(token.value.slice(2), 16) : Number.parseInt(token.value, 10);
        }
        if (token.type === 'ident') {
            this.index += 1;
            const value = this.constants.get(token.value);
            if (value === undefined)
                this.fail(`неизвестная константа "${token.value}"`, token);
            return value;
        }
        this.fail('ожидалось числовое выражение', token);
        return 0;
    }
    validateEnumRange(name, values) {
        const base = this.enumBase.get(name);
        const limit = base === 'uint8_t' ? 255 : base === 'uint16_t' ? 65535 : undefined;
        if (limit === undefined)
            return;
        for (const [member, value] of Object.entries(values)) {
            if (value > limit) {
                this.fail(`значение ${member}=${value} не помещается в ${base}`, this.peek());
            }
        }
    }
    buildProtocol() {
        const keys = this.enums.KEY;
        if (!keys)
            this.fail('не найден enum key (группа KEY)');
        this.validateNoRecursion();
        this.validateMessageStructs();
        const structs = {};
        for (const name of Object.keys(this.structs)) {
            structs[name] = this.buildStruct(name);
        }
        return {
            protocol: 2,
            enums: this.enums,
            flagGroups: this.flagGroups,
            structs,
            descriptions: this.descriptions,
        };
    }
    buildStruct(name) {
        const raw = this.structs[name];
        const fields = [];
        let offset = 0;
        for (const field of raw.fields) {
            const baseSize = isPrimitive(field.type) ? PRIMITIVE_SIZES[field.type] : this.structSize(field.type);
            const count = field.dimensions.reduce((acc, value) => acc * value, 1);
            const size = baseSize * count;
            fields.push({
                name: field.name,
                kind: isPrimitive(field.type) ? 'scalar' : 'struct',
                type: field.type,
                offset,
                ...(field.dimensions.length ? { dimensions: [...field.dimensions] } : {}),
                ...(field.description ? { description: field.description } : {}),
            });
            offset += size;
        }
        if (offset > this.maxStructSize) {
            this.fail(`структура ${name} занимает ${offset} байт, максимум ${this.maxStructSize}`);
        }
        return { size: offset, fields };
    }
    structSize(name) {
        const cached = this.sizeCache.get(name);
        if (cached !== undefined)
            return cached;
        const raw = this.structs[name];
        if (!raw)
            this.fail(`неизвестный тип "${name}"`);
        let offset = 0;
        for (const field of raw.fields) {
            const baseSize = isPrimitive(field.type) ? PRIMITIVE_SIZES[field.type] : this.structSize(field.type);
            offset += baseSize * field.dimensions.reduce((acc, value) => acc * value, 1);
        }
        this.sizeCache.set(name, offset);
        return offset;
    }
    validateNoRecursion() {
        const visiting = new Set();
        const visited = new Set();
        const walk = (name, path) => {
            if (visited.has(name))
                return;
            if (visiting.has(name)) {
                this.fail(`рекурсивная структура: ${[...path, name].join(' → ')}`);
            }
            const raw = this.structs[name];
            if (!raw)
                this.fail(`неизвестный тип "${name}"`);
            visiting.add(name);
            for (const field of raw.fields) {
                if (!isPrimitive(field.type) && !this.structs[field.type]) {
                    throw new ProtocolParseError(`неизвестный тип "${field.type}"`, field.line, field.column, this.file);
                }
                if (!isPrimitive(field.type))
                    walk(field.type, [...path, name]);
            }
            visiting.delete(name);
            visited.add(name);
        };
        for (const name of Object.keys(this.structs))
            walk(name, []);
    }
    validateMessageStructs() {
        const keys = this.enums.KEY;
        for (const key of Object.keys(keys)) {
            const structName = Object.keys(this.structs).find((name) => name.toLowerCase() === key.toLowerCase());
            if (!structName)
                continue;
            const first = this.structs[structName].fields[0];
            if (!first || first.name !== 'key' || first.type !== 'uint8_t' || first.dimensions.length) {
                this.fail(`первое поле структуры ${structName} должно быть "uint8_t key"`);
            }
        }
    }
    isEnd() {
        return this.index >= this.tokens.length;
    }
    peek() {
        return this.tokens[this.index] ?? { type: 'comment', value: '', line: 0, column: 0 };
    }
    skipComments() {
        while (!this.isEnd() && this.peek().type === 'comment')
            this.index += 1;
    }
    takeLeadingComment() {
        const parts = [];
        while (!this.isEnd() && this.peek().type === 'comment') {
            const value = this.tokens[this.index].value;
            if (value)
                parts.push(value);
            this.index += 1;
        }
        return parts.length ? parts.join(' ') : undefined;
    }
    takeTrailingComment(line) {
        const token = this.peek();
        if (token.type === 'comment' && token.line === line && token.value) {
            this.index += 1;
            return token.value;
        }
        return undefined;
    }
    expectIdent(value) {
        const token = this.peek();
        if (token.type !== 'ident' || token.value !== value) {
            this.fail(`ожидалось "${value}"`, token);
        }
        this.index += 1;
    }
    expectName(what) {
        const token = this.peek();
        if (token.type !== 'ident')
            this.fail(`ожидалось ${what}`, token);
        this.index += 1;
        return token.value;
    }
    expectSymbol(value, alternative) {
        const token = this.peek();
        if (token.type !== 'symbol' || (token.value !== value && token.value !== alternative)) {
            this.fail(`ожидалось "${value}"${alternative ? ` или "${alternative}"` : ''}`, token);
        }
        this.index += 1;
    }
    fail(message, token) {
        throw new ProtocolParseError(message, token?.line ?? 0, token?.column ?? 0, this.file);
    }
}
export const parseProtocol = (source, options = {}) => {
    return new ProtocolParser(source, options).parse();
};
