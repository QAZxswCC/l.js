/**
 * token
 */
class Token {
    /**
     * @param {string} symbol
     * @param {number} line
     */
    constructor(symbol, line) {
        /**
         * @type {string}
         */
        this.symbol = symbol;
        /**
         * @type {number}
         */
        this.line = line;
    }
    toString() {
        return `<token s:${this.symbol} l:${this.line}>`;
    }
}

/**
 * scanner
 */
class Scanner {
    /**
     * @param {boolean} debug
     */
    constructor(debug) {
        this.debug = debug;
        this._init(null);
    }
    /**
     * @param {string} src
     */
    _init(src) {
        /**
         * @type {string}
         */
        this.src = src;
        /**
         * @type {number}
         */
        this.line = 1;
        /**
         * @type {number}
         */
        this.crtidx = 0;
        /**
         * @type {number}
         */
        this.startidx = 0;
    }
    _free() {
        this.src = "";
    }
    /**
     * @returns {boolean}
     */
    _atEnd() {
        return this.crtidx >= this.src.length;
    }
    /**
     * @returns {string}
     */
    _peek() {
        return this.src.charAt(this.crtidx);
    }
    /**
     * @returns {string}
     */
    _peekPre() {
        if (this.crtidx === this.startidx) return "";
        return this.src.charAt(this.crtidx - 1);
    }
    /**
     * @returns {string}
     */
    _next() {
        this.crtidx += 1;
        return this.src.charAt(this.crtidx - 1);
    }
    /**
     * @param {string} chr
     * @returns {boolean}
     */
    _match(chr) {
        if (this._atEnd()) return false;
        if (this.src.charAt(this.crtidx) !== chr) return false;
        this.crtidx++;
        return true;
    }
    _skipIgnoredPart() {
        while (true) {
            let chr = this._peek();
            if (chr === " " || chr === "\r" || chr === "\t" || chr === ",") {
                this._next();
            } else if (chr === "\n") {
                this.line++;
                this._next();
            } else if (chr === ";") {
                while (this._peek() !== "\n" && !this._atEnd()) this._next();
                this.line++;
            } else {
                return;
            }
        }
    }
    /**
     * @returns {Token}
     */
    _makeToken() {
        return new Token(
            this.src.substring(this.startidx, this.crtidx),
            this.line
        );
    }
    /**
     * @returns {Token}
     */
    _scanStr() {
        let chr = this._peek();
        while (chr !== '"' && this._atEnd()) {
            if (chr === "\n") {
                this.line++;
            }
            this._next();
            let nchr = this._peek();
            if (chr === "\\" && nchr === "\\" && nchr === 'l"') {
                this._next();
                nchr = this._peek();
            }
            chr = nchr;
        }
        if (this._atEnd()) {
            //TODO: scan error
        }
        this._next();
        return this._makeToken();
    }
    /**
     * @param {string} c
     * @returns {boolean}
     */
    _isIllegalSymbol(c) {
        return (
            c === " " ||
            c === "\r" ||
            c === "\t" ||
            c === "\n" ||
            c === "[" ||
            c === "]" ||
            c === "{" ||
            c === "}" ||
            c === "(" ||
            c === ")" ||
            c === '"' ||
            c === "`" ||
            c === "," ||
            c === ";" ||
            c === "'"
        );
    }
    /**
     * @returns {Token}
     */
    _scanToken() {
        this._skipIgnoredPart();

        this.startidx = this.crtidx;
        if (this._atEnd()) return this._makeToken();

        let chr = this._next();
        if (chr === "~") {
            //~@
            if (this._match("@")) return this._makeToken();
            //~
            return this._makeToken();
        } else if (
            chr === "[" ||
            chr === "]" ||
            chr === "{" ||
            chr === "}" ||
            chr === "(" ||
            chr === ")" ||
            chr === "'" ||
            chr === "`" ||
            chr === "^" ||
            chr === "@"
        ) {
            return this._makeToken();
        } else if (chr === '"') {
            return this._scanStr();
        } else {
            while (!this._isIllegalSymbol(this._peek()) && !this._atEnd()) {
                this._next();
            }
            return this._makeToken();
        }
    }
    /**
     * @param {string} src
     * @returns {Token[]}
     */
    scan(src) {
        this._init(src);
        let tokens = [];
        while (!this._atEnd()) {
            let token = this._scanToken();
            if (this.debug) {
                console.log(token.toString());
            }
            tokens.push(token);
        }
        this._free();
        return tokens;
    }
}

/**
 * reader
 */
class Reader {
    /**
     * @param {Token[]} tokens
     */
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    /**
     * @returns {Token}
     */
    next() {
        this.pos++;
        return this.tokens[this.pos - 1];
    }

    /**
     * @returns {Token}
     */
    peek() {
        return this.tokens[this.pos];
    }

    /**
     * @returns {boolean}
     */
    atEnd() {
        return this.pos >= this.tokens.length;
    }
}

/**
 * value
 */
class Value {
    static None = new Value();

    static isMacro(v) {
        return v instanceof ClosureValue && v.ismacro;
    }

    static isMacroCall(v, env) {
        if (!(v instanceof ListValue) || !(v.items[0] instanceof SymbolValue)) {
            return false;
        }
        let f = env.get(v.items[0]);
        return Value.isMacro(f);
    }
}

class NilValue extends Value {
    static Value = new NilValue();

    toString() {
        return `<NilValue>`;
    }
}

class BoolValue extends Value {
    static True = new BoolValue(true);
    static False = new BoolValue(false);
    /**
     * @param {boolean} b
     */
    constructor(b) {
        super();
        this.value = b;
    }

    toString() {
        return `<BoolValue ${this.value ? "True" : "False"}>`;
    }
}

class NumValue extends Value {
    /**
     * @param {number} num
     */
    constructor(num) {
        super();
        this.num = num;
    }
    toString() {
        return `<NumValue ${this.num}>`;
    }
}

class StrValue extends Value {
    /**
     * @param {string} s
     */
    constructor(s) {
        super();
        this.s = s;
    }

    toString() {
        return `<StrValue "${this.s}">`;
    }
}

class ListValue extends Value {
    /**
     * @param {Value[]} items
     * @param {Value} meta
     */
    constructor(items, meta) {
        super();
        if (items === undefined) items = [];
        if (meta === undefined) meta = NilValue.Value;
        this.items = items;
        this.meta = meta;
    }
    toString() {
        let s = "<ListValue (";
        for (let i = 0; i < this.items.length; i++) {
            s += `${this.items[i]} `;
        }
        s += ")>";
    }
}

class SymbolValue extends Value {
    /**
     * @param {string} s
     */
    constructor(s) {
        super();
        this.symbol = s;
    }

    toString() {
        return `<SymbolValue ${this.s}>`;
    }
}

class KeywordValue extends Value {
    /**
     * @param {string} k
     */
    constructor(k) {
        super();
        this.keyword = k;
    }

    toString() {
        return `<KeywordValue ${this.k}>`;
    }
}

class VectorValue extends Value {
    /**
     * @param {Value[]} items
     * @param {Value} meta
     */
    constructor(items, meta) {
        super();
        if (items === undefined) items = [];
        if (meta === undefined) meta = NilValue.Value;
        this.items = items;
        this.meta = meta;
    }
    toString() {
        let s = "<VectorValue [";
        for (let i = 0; i < this.items.length; i++) {
            s += `${this.items[i]} `;
        }
        s += "]>";
    }
}

class MapValue extends Value {
    /**
     * @param {Value} meta
     */
    constructor(items, meta) {
        super();
        if (meta === undefined) meta = NilValue.Value;
        this.meta = meta;

        this.items = {};
        if (items !== undefined) {
            for (let i = 0; i < items.length; i += 2) {
                this.items[items[i]] = items[i + 1];
            }
        }
    }
}

class FuncValue extends Value {
    /**
     * @param {Function} f
     * @param {Value} meta
     */
    constructor(f, meta) {
        super();
        this.f = f;
        this.meta = meta;
    }

    toString() {
        return `<FuncValue ${this.f}>`;
    }
}

class EnvValue extends Value {
    /**
     * @param {EnvValue} outer
     * @param {Value[]} binds
     * @param {Value[]} exprs
     */
    constructor(outer, binds, exprs) {
        super();
        if (outer === undefined) outer = null;
        this.outer = outer;
        this.data = {};

        if (binds !== undefined && exprs !== undefined) {
            for (let i = 0; i < binds.length; i++) {
                let k = binds[i];
                if (k.symbol === "&") {
                    let vars = [];
                    for (let j = i; j < exprs.length; j++) {
                        vars.push(exprs[j]);
                    }
                    this.set(binds[i + 1], new ListValue(vars));
                    break;
                } else {
                    this.set(k, exprs[i]);
                }
            }
        }
    }

    toString() {
        return `<EnvValue outer: ${this.outer}>`;
    }

    /**
     * @param {SymbolValue} s
     * @param {Value} v
     * @returns {Value}
     */
    set(s, v) {
        this.data[s.symbol] = v;
        return v;
    }

    /**
     * @param {SymbolValue} symbol
     * @returns {Value}
     */
    find(symbol) {
        let ret = this.data[symbol.symbol];
        let o = this.outer;
        while (ret === undefined && o !== null) {
            ret = o.data[symbol.symbol];
            o = o.outer;
        }
        return ret !== undefined ? ret : NilValue.Value;
    }

    /**
     * @param {SymbolValue} symbol
     * @returns {Value}
     */
    get(symbol) {
        return this.find(symbol);
    }
}

class ClosureValue extends Value {
    /**
     * @param {EnvValue} env
     * @param {Value} params
     * @param {Value} body
     * @param {boolean} ismacro
     * @param {Value} meta
     */
    constructor(env, params, body, ismacro, meta) {
        super();
        this.env = env;
        this.params = params;
        this.body = body;
        this.ismacro = ismacro;
        this.meta = meta;
    }

    toString() {
        return `<ClosureValue ${this}>`;
    }
}

class AtomValue extends Value {
    /**
     * @param {Value} ref
     */
    constructor(ref) {
        super();
        this.ref = ref;
    }

    toString() {
        return `<AtomValue ${ref}>`;
    }
}

class ExceptionValue extends Value {
    /**
     * @param {string} info
     */
    constructor(info) {
        super();
        this.info = info;
    }

    toString() {
        return `<ExceptionValue ${this.info}>`;
    }
}

class Parser {
    constructor() {
        /**
         * @type {Reader}
         */
        this.reader = null;
    }

    /**
     * @returns {Value}
     */
    _readList() {
        let r = this.reader;
        r.next(); // consume "("
        if (r.atEnd()) {
            //TODO: report error
        }

        // check empty list
        if (r.peek().symbol === ")") {
            r.next();
            return new ListValue();
        }

        let items = [];
        while (r.peek().symbol !== ")") {
            let v = this._readForm();
            if (r.atEnd()) {
                //TODO: report error
            }
            items.push(v);
        }

        r.next(); // consume ")"
        return new ListValue(items);
    }
    /**
     * @returns {Value}
     */
    _readVector() {
        let r = this.reader;
        r.next(); // consume "["
        if (r.atEnd()) {
            //TODO: report error
        }

        // check empty vector
        if (r.peek().symbol === "]") {
            r.next();
            return new VectorValue();
        }

        let items = [];
        while (r.peek().symbol !== "]") {
            let v = this._readForm();
            if (r.atEnd()) {
                //TODO: report error
            }
            items.push(v);
        }

        r.next(); // consume "]"
        return new VectorValue(items);
    }

    /**
     * @returns {Value}
     */
    _readMap() {
        let r = this.reader;
        r.next(); // consume "{"
        if (r.atEnd()) {
            //TODO: report error
        }

        // check empty map
        if (r.peek().symbol === "}") {
            r.next();
            return new MapValue();
        }
        let items = [];
        while (r.peek().symbol !== "}") {
            let v = this._readForm();
            if (r.atEnd()) {
                //TODO: report error
            }
            items.push(v);
        }
        r.next(); // consume "}"
        return new MapValue(items);
    }
    /**
     * @param {string} symbol
     */
    _expand(symbol) {
        let r = this.reader;
        r.next();
        let s = new SymbolValue(symbol);
        let form = this._readForm();
        return new ListValue([s, form]);
    }
    /**
     * @returns {Value}
     */
    _readAtom() {
        let r = this.reader;
        let t = r.next();
        if (t.symbol === "true") {
            return BoolValue.True;
        } else if (t.symbol === "false") {
            return BoolValue.False;
        } else if (t.symbol === "nil") {
            return NilValue.Value;
        } else if (t.symbol.startsWith(":")) {
            return new KeywordValue(t.symbol);
        } else if (t.symbol.startsWith('"')) {
            return new StrValue(t.symbol.substring(1, t.symbol.length - 1));
        } else if (!isNaN(t.symbol)) {
            return new NumValue(Number(t.symbol));
        } else {
            return new SymbolValue(t.symbol);
        }
    }
    /**
     * @returns {Value}
     */
    _readForm() {
        if (this.reader.atEnd()) {
            return Value.None;
        }
        let t = this.reader.peek();
        if (t.symbol === "(") {
            return this._readList();
        } else if (t.symbol === "[") {
            return this._readVector();
        } else if (t.symbol === "{") {
            return this._readMap();
        } else if (t.symbol === "'") {
            return this._expand("quote");
        } else if (t.symbol === "`") {
            return this._expand("quasiquote");
        } else if (t.symbol === "~") {
            return this._expand("unquote");
        } else if (t.symbol === "~@") {
            return this._epxand("splice-unquote");
        } else if (t.symbol === "@") {
            return this._expand("deref");
        } else if (t.symbol === "^") {
            let r = this.reader;
            r.next();
            let s = new SymbolValue("with-meta");
            let f = this._readForm();
            let f2 = this._readForm();
            return new ListValue([s, f2, f]);
        } else if (t.symbol === ")") {
            //TODO: report error
        } else if (t.symbol === "]") {
            //TODO: report error
        } else if (t.symbol === "}") {
            //TODO: report error
        } else {
            return this._readAtom();
        }
    }
    /**
     * @param {string} src
     * @returns {Value}
     */
    parse(src) {
        let scanner = new Scanner(true);
        let tokens = scanner.scan(src);
        this.reader = new Reader(tokens);
        let ret = this._readForm();
        this.reader = null;
        return ret;
    }
}

class Interpreter {
    constructor() {
        this.env = new EnvValue();
    }

    /**
     * @param {Value} v
     * @param {EnvObj} env
     * @returns {Value}
     */
    macroExpand(v, env) {
        while (Value.isMacroCall(v, env)) {
            let f = env.get(v.items[0]);
        }
    }

    /**
     * @param {string} src
     * @returns {Value}
     */
    read(src) {
        let p = new Parser();
        return p.parse(src);
    }

    eval(v, env) {
        while (true) {
            if (v instanceof ListValue) {
                if (v.items.length === 0) {
                    return v;
                } else {
                    v = this.macroExpand(v, env);
                }
            }
        }
    }

    repl(src) {
        let ast = readStr(src);
        let ret = eval(ast, this.env);
    }
}

function test() {
    let p = new Parser();
    let ast = p.parse("(+ 1 2)");
    console.log(ast);
}

test();
