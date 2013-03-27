var ParsingFrame = require('./parsing_frame').ParsingFrame,
    namedEntitiesTrie = require('./named_entities_trie').TRIE,
    err = require('./err');

var undefined;

//Character const
var EOF = null,
    NULL = '\u0000',
    BOM = '\uFEFF',
    GRAVE_ACCENT = '\u0060',
    REPLACEMENT_CHARACTER = '\uFFFD';

var NUMERIC_ENTITY_REPLACEMENTS = {
    0x00: REPLACEMENT_CHARACTER,
    0x0D: '\u000D', 0x80: '\u20AC', 0x81: '\u0081', 0x82: '\u201A', 0x83: '\u0192',
    0x84: '\u201E', 0x85: '\u2026', 0x86: '\u2020', 0x87: '\u2021', 0x88: '\u02C6',
    0x89: '\u2030', 0x8A: '\u0160', 0x8B: '\u2039', 0x8C: '\u0152', 0x8D: '\u008D',
    0x8E: '\u017D', 0x8F: '\u008F', 0x90: '\u0090', 0x91: '\u2018', 0x92: '\u2019',
    0x93: '\u201C', 0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
    0x98: '\u02DC', 0x99: '\u2122', 0x9A: '\u0161', 0x9B: '\u203A', 0x9C: '\u0153',
    0x9D: '\u009D', 0x9E: '\u017E', 0x9F: '\u0178'
};

var ILLEGAL_CHAR_CODES = {
    0x000B: true, 0xFFFE: true, 0xFFFF: true, 0x1FFFE: true, 0x1FFFF: true, 0x2FFFE: true, 0x2FFFF: true,
    0x3FFFE: true, 0x3FFFF: true, 0x4FFFE: true, 0x4FFFF: true, 0x5FFFE: true, 0x5FFFF: true, 0x6FFFE: true,
    0x6FFFF: true, 0x7FFFE: true, 0x7FFFF: true, 0x8FFFE: true, 0x8FFFF: true, 0x9FFFE: true, 0x9FFFF: true,
    0xAFFFE: true, 0xAFFFF: true, 0xBFFFE: true, 0xBFFFF: true, 0xCFFFE: true, 0xCFFFF: true, 0xDFFFE: true,
    0xDFFFF: true, 0xEFFFE: true, 0xEFFFF: true, 0xFFFFE: true, 0xFFFFF: true, 0x10FFFE: true, 0x10FFFF: true
};

//States
var DATA_STATE = 'DATA_STATE',
    CHARACTER_REFERENCE_IN_DATA_STATE = 'CHARACTER_REFERENCE_IN_DATA_STATE',
    RCDATA_STATE = 'RCDATA_STATE',
    CHARACTER_REFERENCE_IN_RCDATA_STATE = 'CHARACTER_REFERENCE_IN_RCDATA_STATE',
    RAWTEXT_STATE = 'RAWTEXT_STATE',
    SCRIPT_DATA_STATE = 'SCRIPT_DATA_STATE',
    PLAINTEXT_STATE = 'PLAINTEXT_STATE',
    TAG_OPEN_STATE = 'TAG_OPEN_STATE',
    END_TAG_OPEN_STATE = 'END_TAG_OPEN_STATE',
    TAG_NAME_STATE = 'TAG_NAME_STATE',
    RCDATA_LESS_THAN_SIGN_STATE = 'RCDATA_LESS_THAN_SIGN_STATE',
    RCDATA_END_TAG_OPEN_STATE = 'RCDATA_END_TAG_OPEN_STATE',
    RCDATA_END_TAG_NAME_STATE = 'RCDATA_END_TAG_NAME_STATE',
    RAWTEXT_LESS_THAN_SIGN_STATE = 'RAWTEXT_LESS_THAN_SIGN_STATE',
    RAWTEXT_END_TAG_OPEN_STATE = 'RAWTEXT_END_TAG_OPEN_STATE',
    RAWTEXT_END_TAG_NAME_STATE = 'RAWTEXT_END_TAG_NAME_STATE',
    SCRIPT_DATA_LESS_THAN_SIGN_STATE = 'SCRIPT_DATA_LESS_THAN_SIGN_STATE',
    SCRIPT_DATA_END_TAG_OPEN_STATE = 'SCRIPT_DATA_END_TAG_OPEN_STATE',
    SCRIPT_DATA_END_TAG_NAME_STATE = 'SCRIPT_DATA_END_TAG_NAME_STATE',
    SCRIPT_DATA_ESCAPE_START_STATE = 'SCRIPT_DATA_ESCAPE_START_STATE',
    SCRIPT_DATA_ESCAPE_START_DASH_STATE = 'SCRIPT_DATA_ESCAPE_START_DASH_STATE',
    SCRIPT_DATA_ESCAPED_STATE = 'SCRIPT_DATA_ESCAPED_STATE',
    SCRIPT_DATA_ESCAPED_DASH_STATE = 'SCRIPT_DATA_ESCAPED_DASH_STATE',
    SCRIPT_DATA_ESCAPED_DASH_DASH_STATE = 'SCRIPT_DATA_ESCAPED_DASH_DASH_STATE',
    SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE = 'SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE',
    SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE = 'SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE',
    SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE = 'SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE',
    SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE',
    BEFORE_ATTRIBUTE_NAME_STATE = 'BEFORE_ATTRIBUTE_NAME_STATE',
    ATTRIBUTE_NAME_STATE = 'ATTRIBUTE_NAME_STATE',
    AFTER_ATTRIBUTE_NAME_STATE = 'AFTER_ATTRIBUTE_NAME_STATE',
    BEFORE_ATTRIBUTE_VALUE_STATE = 'BEFORE_ATTRIBUTE_VALUE_STATE',
    ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE = 'ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE',
    ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE = 'ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE',
    ATTRIBUTE_VALUE_UNQUOTED_STATE = 'ATTRIBUTE_VALUE_UNQUOTED_STATE',
    CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE = 'CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE',
    AFTER_ATTRIBUTE_VALUE_QUOTED_STATE = 'AFTER_ATTRIBUTE_VALUE_QUOTED_STATE',
    SELF_CLOSING_START_TAG_STATE = 'SELF_CLOSING_START_TAG_STATE',
    BOGUS_COMMENT_STATE = 'BOGUS_COMMENT_STATE',
    MARKUP_DECLARATION_OPEN_STATE = 'MARKUP_DECLARATION_OPEN_STATE',
    COMMENT_START_STATE = 'COMMENT_START_STATE',
    COMMENT_START_DASH_STATE = 'COMMENT_START_DASH_STATE',
    COMMENT_STATE = 'COMMENT_STATE',
    COMMENT_END_DASH_STATE = 'COMMENT_END_DASH_STATE',
    COMMENT_END_STATE = 'COMMENT_END_STATE',
    COMMENT_END_BANG_STATE = 'COMMENT_END_BANG_STATE',
    DOCTYPE_STATE = 'DOCTYPE_STATE',
    BEFORE_DOCTYPE_NAME_STATE = 'BEFORE_DOCTYPE_NAME_STATE',
    DOCTYPE_NAME_STATE = 'DOCTYPE_NAME_STATE',
    AFTER_DOCTYPE_NAME_STATE = 'AFTER_DOCTYPE_NAME_STATE',
    AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE = 'AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE',
    BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE = 'BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE',
    DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE = 'DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE',
    DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE = 'DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE',
    AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE = 'AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE',
    BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE = 'BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE',
    AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE = 'AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE',
    BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE = 'BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE',
    DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE = 'DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE',
    DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE = 'DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE',
    AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE = 'AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE',
    BOGUS_DOCTYPE_STATE = 'BOGUS_DOCTYPE_STATE',
    CDATA_SECTION_STATE = 'CDATA_SECTION_STATE';

//Utils
function asciiToLower(ch) {
    //NOTE: it's significantly faster than String.toLowerCase
    return String.fromCharCode(ch.charCodeAt(0) + 0x0020);
}

function isAsciiDigit(ch) {
    return ch >= '0' && ch <= '9';
}

function isAsciiAlphaNumeric(ch) {
    return isAsciiDigit(ch) || ch >= 'A' && ch <= 'Z' || ch >= 'a' && ch <= 'z';
}

function getStringFromCharCode(charCode) {
    //NOTE: despite the fact that JavaScript uses UTF-16 strings internally, String.fromCharCode() works only with a
    //UCS-2 character subset. This function workarounds this issue.
    //(see: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String/fromCharCode#Getting_it_to_work_with_higher_values)
    if (charCode <= 0xFFFF)
        return String.fromCharCode(charCode);

    charCode -= 0x10000;
    return String.fromCharCode(charCode >>> 10 & 0x3FF | 0xD800) + String.fromCharCode(0xDC00 | charCode & 0x3FF);
}

function isIllegalCharCode(charCode) {
    return ILLEGAL_CHAR_CODES[charCode] ||
        charCode >= 0x0001 && charCode <= 0x0008 ||
        charCode >= 0x000E && charCode <= 0x001F ||
        charCode >= 0x007F && charCode <= 0x009F ||
        charCode >= 0xFDD0 && charCode <= 0xFDEF;
}

//Tokenizer
var Tokenizer = exports.Tokenizer = function (html) {
    //Output
    this.tokenQueue = [];
    this.errs = [];

    //Input frame
    this.parsingFrame = new ParsingFrame(html, this.errs);
    this.html = html;

    //Input processing
    this.line = 1;
    this.col = 1;
    this.lineLengths = [];
    this.strMatchLookaheadPos = 0;
    //NOTE: one leading U+FEFF BYTE ORDER MARK character must be ignored if any are present in the input stream.
    //(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html#preprocessing-the-input-stream)
    this.consumptionPos = this.html[0] === BOM ? 0 : -1;

    //State machine
    this.state = DATA_STATE;
    this.tempBuff = '';
    this.additionalAllowedCh = undefined;
    this.returnState = null;
    this.lastStartTagName = null;
    this.currentToken = null;
    this.currentAttr = {};
};

//Token types
Tokenizer.CHARACTER_TOKEN = 'CHARACTER_TOKEN';
Tokenizer.START_TAG_TOKEN = 'START_TAG_TOKEN';
Tokenizer.END_TAG_TOKEN = 'END_TAG_TOKEN';
Tokenizer.COMMENT_TOKEN = 'COMMENT_TOKEN';
Tokenizer.DOCTYPE_TOKEN = 'DOCTYPE_TOKEN';
Tokenizer.EOF_TOKEN = 'EOF_TOKEN';

//Proto
Tokenizer.prototype.getToken = function () {
    //NOTE: iterate through states until we don't get at least one token in the queue
    while (!this.tokenQueue.length)
        this[this.state](this._consumeChar());


    return this.tokenQueue.shift();
};

//Input processing
Tokenizer.prototype._consumeChar = function () {
    this.consumptionPos++;
    return this.parsingFrame.advanceAndPeekChar();
};

Tokenizer.prototype._unconsumeChar = function () {
    this.consumptionPos--;
    this.parsingFrame.retreat();
};

Tokenizer.prototype._unconsumeSeveralChars = function (count) {
    while (count--)
        this._unconsumeChar();
};

Tokenizer.prototype._reconsumeCharInState = function (state) {
    this.state = state;
    this._unconsumeChar();
};

Tokenizer.prototype._lookahead = function () {
    var ch = this.parsingFrame.advanceAndPeekChar();
    this.parsingFrame.retreat();

    return ch;
};

Tokenizer.prototype._consumeIfMatch = function (str, caseSensitive) {
    //TODO
    var rollbackPos = this.consumptionPos,
        match = true,
        strPos = 0,
        ch = this._consumeChar(),
        strCh = str[strPos];

    for (; ch !== EOF && strPos < str.length; ch = this._consumeChar(), strCh = str[++strPos]) {
        if (ch !== strCh && (caseSensitive || ch !== asciiToLower(strCh))) {
            match = false;
            break;
        }
    }

    if(!match) {
    }

    return match;
};

Tokenizer.prototype._consumeLastLookaheadMatch = function () {
    while (this.consumptionPos < this.strMatchLookaheadPos)
        this._consumeChar();
};

//Error handling
Tokenizer.prototype._err = function (code) {
    this.errs.push({
        code: code,
        line: this.line,
        col: this.col
    });
};

Tokenizer.prototype._unexpectedEOF = function () {
    this._err(err.UNEXPECTED_END_OF_FILE);
    this._reconsumeCharInState(DATA_STATE);
};

//Token creation
Tokenizer.prototype._createStartTagToken = function (tagNameFirstCh) {
    this.currentToken = {
        type: Tokenizer.START_TAG_TOKEN,
        tagName: tagNameFirstCh,
        selfClosing: false,
        attrs: []
    };
};

Tokenizer.prototype._createEndTagToken = function (tagNameFirstCh) {
    this.currentToken = {
        type: Tokenizer.END_TAG_TOKEN,
        tagName: tagNameFirstCh
    };
};

Tokenizer.prototype._createCommentToken = function () {
    this.currentToken = {
        type: Tokenizer.COMMENT_TOKEN,
        data: ''
    };
};

Tokenizer.prototype._createDoctypeToken = function (doctypeNameFirstCh) {
    this.currentToken = {
        type: Tokenizer.DOCTYPE_TOKEN,
        name: doctypeNameFirstCh || '',
        forceQuirks: false,
        publicID: null,
        systemID: null
    };
};

//Tag attributes
Tokenizer.prototype._createAttr = function (attrNameFirstCh) {
    this.currentAttr = {
        name: attrNameFirstCh,
        value: ''
    };
};

Tokenizer.prototype._isDuplicateAttr = function () {
    var attrs = this.currentToken.attrs;

    for (var i = 0; i < attrs.length; i++) {
        if (attrs[i].name === this.currentAttr.name)
            return true;
    }

    return false;
};

Tokenizer.prototype._leaveAttrName = function (toState) {
    this.state = toState;

    if (this._isDuplicateAttr())
        this._err(err.DUPLICATE_ATTRIBUTE);
    else
        this.currentToken.attrs.push(this.currentAttr);
};

//Appropriate end tag token
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tokenization.html#appropriate-end-tag-token)
Tokenizer.prototype._isAppropriateEndTagToken = function () {
    return this.lastStartTagName === this.currentToken.tagName;
};

//Token emission
Tokenizer.prototype._emitCurrentToken = function () {
    //NOTE: store emited start tag's tagName to determine is the following end tag token is appropriate.
    if (this.currentToken.type === Tokenizer.START_TAG_TOKEN)
        this.lastStartTagName = this.currentToken.tagName;

    this.tokenQueue.push(this.currentToken);
    this.currentToken = null;
};

Tokenizer.prototype._emitCharacterToken = function (ch) {
    this.tokenQueue.push({
        type: Tokenizer.CHARACTER_TOKEN,
        ch: ch
    });
};

Tokenizer.prototype._emitSeveralCharacterTokens = function (chars) {
    for (var i = 0; i < chars.length; i++)
        this._emitCharacterToken(chars[i]);
};

Tokenizer.prototype._emitEOFToken = function () {
    this.tokenQueue.push({type: Tokenizer.EOF_TOKEN});
};

//Character reference tokenization
Tokenizer.prototype._consumeNumericEntity = function (isHex) {
    var digits = '',
        nextCh = undefined,
        isDigit = isHex ? isAsciiAlphaNumeric : isAsciiDigit;

    do {
        digits += this._consumeChar();
        nextCh = this._lookahead();
    } while (nextCh !== EOF && isDigit(nextCh));

    if (this._lookahead() === ';')
        this._consumeChar();
    else
        this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);

    var charCode = parseInt(digits, isHex ? 16 : 10),
        replacement = NUMERIC_ENTITY_REPLACEMENTS[charCode];

    if (replacement) {
        this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);
        return replacement;
    }

    if (charCode >= 0xD800 && charCode <= 0xDFFF || charCode > 0x10FFFF) {
        this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);
        return REPLACEMENT_CHARACTER;
    }

    if (isIllegalCharCode(charCode))
        this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);

    return getStringFromCharCode(charCode);
};

Tokenizer.prototype._consumeNamedEntity = function (startCh, inAttr) {
    var replacementChars = null,
        ch = startCh,
        leaf = namedEntitiesTrie[ch],
        consumedCount = 1,
        semicolonTerminated = false;

    for (; ch !== EOF; ch = this._consumeChar(), consumedCount++, leaf = leaf.$l && leaf.$l[ch]) {
        //NOTE: trie leaf was not found for the current character. We abandon found replacement (if we have one)
        //and stop lookup, because found reference match was a part of the longer character sequence that is not
        //a valid named entity (e.g. '&not' in '&noti')
        if (!leaf) {
            replacementChars = null;
            break;
        }

        if (leaf.$c) {
            //NOTE: we have at least one named reference match. But we don't stop lookup at this point,
            //because longer matches still can be found (e.g. '&not' and '&notin;') except the case
            //then found match is terminated by semicolon.
            replacementChars = leaf.$c;

            if (ch === ';') {
                semicolonTerminated = true;
                break;
            }
        }
    }

    if (replacementChars) {
        if (!semicolonTerminated) {
            this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);

            //NOTE: If the character reference is being consumed as part of an attribute and the next character
            //is either a U+003D EQUALS SIGN character (=) or an alphanumeric ASCII character, then, for historical
            //reasons, all the characters that were matched after the U+0026 AMPERSAND character (&) must be
            //unconsumed, and nothing is returned.
            //However, if this next character is in fact a U+003D EQUALS SIGN character (=), then this is a
            //parse error, because some legacy user agents will misinterpret the markup in those cases.
            //(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tokenization.html#tokenizing-character-references)
            if (inAttr) {
                var nextCh = this._lookahead();

                if (nextCh === '=' || isAsciiAlphaNumeric(nextCh)) {
                    if (nextCh === '=')
                        this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);

                    this._unconsumeSeveralChars(consumedCount);
                    return null;
                }
            }
        }

        return replacementChars;
    }

    this._unconsumeSeveralChars(consumedCount);
    this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);

    return null;
};

Tokenizer.prototype._consumeCharacterReference = function (startCh, inAttr) {
    if (startCh === '\n' || startCh === '\f' || startCh === '\t' || startCh === ' ' ||
        startCh === '<' || startCh === '&' || startCh === EOF || startCh === this.additionalAllowedCh) {
        //NOTE: not a character reference. No characters are consumed, and nothing is returned.
        return null;
    }

    else if (startCh === '#') {
        //NOTE: we have a numeric entity candidate, now we should determine if it's hex or decimal
        var isHex = false,
            nextCh = this._lookahead();

        if (nextCh === 'x' || nextCh === 'X') {
            this._consumeChar();
            isHex = true;
        }

        var isDigit = isHex ? isAsciiAlphaNumeric : isAsciiDigit;

        //NOTE: if we have at least one digit this is a numeric entity for sure, so we consume it
        if (isDigit(this._lookahead()))
            return this._consumeNumericEntity(isHex);
        else {
            //NOTE: otherwise this is a bogus number entity and a parse error. Unconsume the number sign
            //and the 'x'-character if appropriate.
            this._unconsumeSeveralChars(isHex ? 2 : 1);
            this._err(err.FAILED_TO_CONSUME_CHARACTER_REFERENCE);

            return null;
        }
    }

    else
        return this._consumeNamedEntity(startCh, inAttr);
};

//State machine
var _ = Tokenizer.prototype;

//12.2.4.1 Data state
_[DATA_STATE] = function (ch) {
    if (ch === '&')
        this.state = CHARACTER_REFERENCE_IN_DATA_STATE;

    else if (ch === '<')
        this.state = TAG_OPEN_STATE;

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken(ch);
    }

    else if (ch === EOF)
        this._emitEOFToken();

    else
        this._emitCharacterToken(ch);
};

//12.2.4.2 Character reference in data state
_[CHARACTER_REFERENCE_IN_DATA_STATE] = function (ch) {
    this.state = DATA_STATE;
    this.additionalAllowedCh = undefined;

    var replacementChars = this._consumeCharacterReference(ch, false);

    if (replacementChars)
        this._emitSeveralCharacterTokens(replacementChars);
    else
        this._emitCharacterToken('&');
};

//12.2.4.3 RCDATA state
_[RCDATA_STATE] = function (ch) {
    if (ch === '&')
        this.state = CHARACTER_REFERENCE_IN_RCDATA_STATE;

    else if (ch === '<')
        this.state = RCDATA_LESS_THAN_SIGN_STATE;

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken(REPLACEMENT_CHARACTER);
    }

    else if (ch === EOF)
        this._emitEOFToken();

    else
        this._emitCharacterToken(ch);
};

//12.2.4.4 Character reference in RCDATA state
_[CHARACTER_REFERENCE_IN_RCDATA_STATE] = function (ch) {
    this.state = RCDATA_STATE;
    this.additionalAllowedCh = undefined;

    var replacementChars = this._consumeCharacterReference(ch, false);

    if (replacementChars)
        this._emitSeveralCharacterTokens(replacementChars);
    else
        this._emitCharacterToken('&');
};

//12.2.4.5 RAWTEXT state
_[RAWTEXT_STATE] = function (ch) {
    if (ch === '<')
        this.state = RAWTEXT_LESS_THAN_SIGN_STATE;

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken(REPLACEMENT_CHARACTER);
    }

    else if (ch === EOF)
        this._emitEOFToken();

    else
        this._emitCharacterToken(ch);
};

//12.2.4.6 Script data state
_[SCRIPT_DATA_STATE] = function (ch) {
    if (ch === '<')
        this.state = SCRIPT_DATA_LESS_THAN_SIGN_STATE;

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken(REPLACEMENT_CHARACTER);
    }

    else if (ch === EOF)
        this._emitEOFToken();

    else
        this._emitCharacterToken(ch);
};

//12.2.4.7 PLAINTEXT state
_[PLAINTEXT_STATE] = function (ch) {
    if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken(REPLACEMENT_CHARACTER);
    }

    else if (ch === EOF)
        this._emitEOFToken();

    else
        this._emitCharacterToken(ch);
};

//12.2.4.8 Tag open state
_[TAG_OPEN_STATE] = function (ch) {
    if (ch === '!')
        this.state = MARKUP_DECLARATION_OPEN_STATE;

    else if (ch === '/')
        this.state = END_TAG_OPEN_STATE;

    else if (ch >= 'A' && ch <= 'Z') {
        this._createStartTagToken(asciiToLower(ch));
        this.state = TAG_NAME_STATE;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this._createStartTagToken(ch);
        this.state = TAG_NAME_STATE;
    }

    else if (ch === '?') {
        this._err(err.MAILFORMED_COMMENT);
        //NOTE: call bogus comment state directly with current consumed character to avoid unnecessary reconsumption.
        this[BOGUS_COMMENT_STATE](ch);
    }

    else {
        this._err(err.UNEXPECTED_CHARACTER_IN_TAG_NAME);
        this._emitCharacterToken('<');
        this._reconsumeCharInState(DATA_STATE);
    }
};

//12.2.4.9 End tag open state
_[END_TAG_OPEN_STATE] = function (ch) {
    if (ch >= 'A' && ch <= 'Z') {
        this._createEndTagToken(asciiToLower(ch));
        this.state = TAG_NAME_STATE;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this._createEndTagToken(ch);
        this.state = TAG_NAME_STATE;
    }

    else if (ch === '>') {
        this._err(err.MISSING_END_TAG_NAME);
        this.state = DATA_STATE;
    }

    else if (ch === EOF) {
        this._unexpectedEOF();
        this._emitCharacterToken('<');
        this._emitCharacterToken('/');
    }

    else {
        this._err(err.MAILFORMED_COMMENT);
        //NOTE: call bogus comment state directly with current consumed character to avoid unnecessary reconsumption.
        this[BOGUS_COMMENT_STATE](ch);
    }
};

//12.2.4.10 Tag name state
_[TAG_NAME_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this.state = BEFORE_ATTRIBUTE_NAME_STATE;

    else if (ch === '/')
        this.state = SELF_CLOSING_START_TAG_STATE;

    else if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch >= 'A' && ch <= 'Z')
        this.currentToken.tagName += asciiToLower(ch);

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.tagName += REPLACEMENT_CHARACTER;
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else
        this.currentToken.tagName += ch;
};

//12.2.4.11 RCDATA less-than sign state
_[RCDATA_LESS_THAN_SIGN_STATE] = function (ch) {
    if (ch === '/') {
        this.tempBuff = '';
        this.state = RCDATA_END_TAG_OPEN_STATE;
    }

    else {
        this._emitCharacterToken('<');
        this._reconsumeCharInState(RCDATA_STATE);
    }
};

//12.2.4.12 RCDATA end tag open state
_[RCDATA_END_TAG_OPEN_STATE] = function (ch) {
    if (ch >= 'A' && ch <= 'Z') {
        this._createEndTagToken(asciiToLower(ch));
        this.tempBuff += ch;
        this.state = RCDATA_END_TAG_NAME_STATE;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this._createEndTagToken(ch);
        this.tempBuff += ch;
        this.state = RCDATA_END_TAG_NAME_STATE;
    }

    else {
        this._emitCharacterToken('<');
        this._emitCharacterToken('/');
        this._reconsumeCharInState(RCDATA_STATE);
    }
};

//12.2.4.13 RCDATA end tag name state
_[RCDATA_END_TAG_NAME_STATE] = function (ch) {
    var tokenizer = this,
        defaultEntry = function () {
            tokenizer._emitCharacterToken('<');
            tokenizer._emitCharacterToken('/');

            for (var i = 0; i < tokenizer.tempBuff.length; i++)
                tokenizer._emitCharacterToken(tokenizer.tempBuff[i]);

            tokenizer._reconsumeCharInState(RCDATA_STATE);
        };

    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ') {
        if (this._isAppropriateEndTagToken())
            this.state = BEFORE_ATTRIBUTE_NAME_STATE;
        else
            defaultEntry();
    }

    else if (ch === '/') {
        if (this._isAppropriateEndTagToken())
            this.state = SELF_CLOSING_START_TAG_STATE;
        else
            defaultEntry();
    }

    else if (ch === '>') {
        if (this._isAppropriateEndTagToken()) {
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else
            defaultEntry();
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this.currentToken.tagName += asciiToLower(ch);
        this.tempBuff += ch;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this.currentToken.tagName += ch;
        this.tempBuff += ch;
    }

    else
        defaultEntry();
};

//12.2.4.14 RAWTEXT less-than sign state
_[RAWTEXT_LESS_THAN_SIGN_STATE] = function (ch) {
    if (ch === '/') {
        this.tempBuff = '';
        this.state = RAWTEXT_END_TAG_OPEN_STATE;
    }

    else {
        this._emitCharacterToken('<');
        this._reconsumeCharInState(RAWTEXT_STATE);
    }
};

//12.2.4.15 RAWTEXT end tag open state
_[RAWTEXT_END_TAG_OPEN_STATE] = function (ch) {
    if (ch >= 'A' && ch <= 'Z') {
        this._createEndTagToken(asciiToLower(ch));
        this.tempBuff += ch;
        this.state = RAWTEXT_END_TAG_NAME_STATE;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this._createEndTagToken(ch);
        this.tempBuff += ch;
        this.state = RAWTEXT_END_TAG_NAME_STATE;
    }

    else {
        this._emitCharacterToken('<');
        this._emitCharacterToken('/');
        this._reconsumeCharInState(RAWTEXT_STATE);
    }
};

//12.2.4.16 RAWTEXT end tag name state
_[RAWTEXT_END_TAG_NAME_STATE] = function (ch) {
    var tokenizer = this,
        defaultEntry = function () {
            tokenizer._emitCharacterToken('<');
            tokenizer._emitCharacterToken('/');

            for (var i = 0; i < tokenizer.tempBuff.length; i++)
                tokenizer._emitCharacterToken(tokenizer.tempBuff[i]);

            tokenizer._reconsumeCharInState(RAWTEXT_STATE);
        };

    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ') {
        if (this._isAppropriateEndTagToken())
            this.state = BEFORE_ATTRIBUTE_NAME_STATE;
        else
            defaultEntry();
    }

    else if (ch === '/') {
        if (this._isAppropriateEndTagToken())
            this.state = SELF_CLOSING_START_TAG_STATE;
        else
            defaultEntry();
    }

    else if (ch === '>') {
        if (this._isAppropriateEndTagToken()) {
            this._emitCurrentToken();
            this.state = DATA_STATE;
        } else
            defaultEntry();
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this.currentToken.tagName += asciiToLower(ch);
        this.tempBuff += ch;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this.currentToken.tagName += ch;
        this.tempBuff += ch;
    }

    else
        defaultEntry();
};

//12.2.4.17 Script data less-than sign state
_[SCRIPT_DATA_LESS_THAN_SIGN_STATE] = function (ch) {
    if (ch === '/') {
        this.tempBuff = '';
        this.state = SCRIPT_DATA_END_TAG_OPEN_STATE;
    }

    else if (ch === '!') {
        this.state = SCRIPT_DATA_ESCAPE_START_STATE;
        this._emitCharacterToken('<');
        this._emitCharacterToken('!');
    }

    else {
        this._emitCharacterToken('<');
        this._reconsumeCharInState(SCRIPT_DATA_STATE);
    }
};

//12.2.4.18 Script data end tag open state
_[SCRIPT_DATA_END_TAG_OPEN_STATE] = function (ch) {
    if (ch >= 'A' && ch <= 'Z') {
        this._createEndTagToken(asciiToLower(ch));
        this.tempBuff += ch;
        this.state = SCRIPT_DATA_END_TAG_NAME_STATE;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this._createEndTagToken(ch);
        this.tempBuff += ch;
        this.state = SCRIPT_DATA_END_TAG_NAME_STATE;
    }

    else {
        this._emitCharacterToken('<');
        this._emitCharacterToken('/');
        this._reconsumeCharInState(SCRIPT_DATA_STATE);
    }
};

//12.2.4.19 Script data end tag name state
_[SCRIPT_DATA_END_TAG_NAME_STATE] = function (ch) {
    var tokenizer = this,
        defaultEntry = function () {
            tokenizer._emitCharacterToken('<');
            tokenizer._emitCharacterToken('/');

            for (var i = 0; i < tokenizer.tempBuff.length; i++)
                tokenizer._emitCharacterToken(tokenizer.tempBuff[i]);

            tokenizer._reconsumeCharInState(SCRIPT_DATA_STATE);
        };

    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ') {
        if (this._isAppropriateEndTagToken())
            this.state = BEFORE_ATTRIBUTE_NAME_STATE;
        else
            defaultEntry();
    }

    else if (ch === '/') {
        if (this._isAppropriateEndTagToken())
            this.state = SELF_CLOSING_START_TAG_STATE;
        else
            defaultEntry();
    }

    else if (ch === '>') {
        if (this._isAppropriateEndTagToken()) {
            this._emitCurrentToken();
            this.state = DATA_STATE;
        } else
            defaultEntry();
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this.currentToken.tagName += asciiToLower(ch);
        this.tempBuff += ch;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this.currentToken.tagName += ch;
        this.tempBuff += ch;
    }

    else
        defaultEntry();
};

//12.2.4.20 Script data escape start state
_[SCRIPT_DATA_ESCAPE_START_STATE] = function (ch) {
    if (ch === '-') {
        this.state = SCRIPT_DATA_ESCAPE_START_DASH_STATE;
        this._emitCharacterToken('-');
    }

    else
        this._reconsumeCharInState(SCRIPT_DATA_STATE);
};

//12.2.4.21 Script data escape start dash state
_[SCRIPT_DATA_ESCAPE_START_DASH_STATE] = function (ch) {
    if (ch === '-') {
        this.state = SCRIPT_DATA_ESCAPED_DASH_DASH_STATE;
        this._emitCharacterToken('-');
    }

    else
        this._reconsumeCharInState(SCRIPT_DATA_STATE);
};

//12.2.4.22 Script data escaped state
_[SCRIPT_DATA_ESCAPED_STATE] = function (ch) {
    if (ch === '-') {
        this.state = SCRIPT_DATA_ESCAPED_DASH_STATE;
        this._emitCharacterToken('-');
    }

    else if (ch === '<')
        this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken(REPLACEMENT_CHARACTER);
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else
        this._emitCharacterToken(ch);
};

//12.2.4.23 Script data escaped dash state
_[SCRIPT_DATA_ESCAPED_DASH_STATE] = function (ch) {
    if (ch === '-') {
        this.state = SCRIPT_DATA_ESCAPED_DASH_DASH_STATE;
        this._emitCharacterToken('-');
    }

    else if (ch === '<')
        this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitCharacterToken(REPLACEMENT_CHARACTER);
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else {
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitCharacterToken(ch);
    }
};

//12.2.4.24 Script data escaped dash dash state
_[SCRIPT_DATA_ESCAPED_DASH_DASH_STATE] = function (ch) {
    if (ch === '-')
        this._emitCharacterToken('-');

    else if (ch === '<')
        this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;

    else if (ch === '>') {
        this.state = SCRIPT_DATA_STATE;
        this._emitCharacterToken('>');
    }

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitCharacterToken(REPLACEMENT_CHARACTER);
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else {
        this.state = SCRIPT_DATA_ESCAPED_STATE;
        this._emitCharacterToken(ch);
    }
};

//12.2.4.25 Script data escaped less-than sign state
_[SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE] = function (ch) {
    if (ch === '/') {
        this.tempBuff = '';
        this.state = SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE;
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this.tempBuff = asciiToLower(ch);
        this.state = SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE;
        this._emitCharacterToken('<');
        this._emitCharacterToken(ch);
    }

    else if (ch >= 'a' && ch <= 'z') {
        this.tempBuff = ch;
        this.state = SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE;
        this._emitCharacterToken('<');
        this._emitCharacterToken(ch);
    }

    else {
        this._emitCharacterToken('<');
        this._reconsumeCharInState(SCRIPT_DATA_ESCAPED_STATE);
    }
};

//12.2.4.26 Script data escaped end tag open state
_[SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE] = function (ch) {
    if (ch >= 'A' && ch <= 'Z') {
        this._createEndTagToken(asciiToLower(ch));
        this.tempBuff += ch;
        this.state = SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this._createEndTagToken(ch);
        this.tempBuff += ch;
        this.state = SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE;
    }

    else {
        this._emitCharacterToken('<');
        this._emitCharacterToken('/');
        this._reconsumeCharInState(SCRIPT_DATA_ESCAPED_STATE);
    }
};

//12.2.4.27 Script data escaped end tag name state
_[SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE] = function (ch) {
    var tokenizer = this,
        defaultEntry = function () {
            tokenizer._emitCharacterToken('<');
            tokenizer._emitCharacterToken('/');

            for (var i = 0; i < tokenizer.tempBuff.length; i++)
                tokenizer._emitCharacterToken(tokenizer.tempBuff[i]);

            tokenizer._reconsumeCharInState(SCRIPT_DATA_ESCAPED_STATE);
        };

    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ') {
        if (this._isAppropriateEndTagToken())
            this.state = BEFORE_ATTRIBUTE_NAME_STATE;
        else
            defaultEntry();
    }

    else if (ch === '/') {
        if (this._isAppropriateEndTagToken())
            this.state = SELF_CLOSING_START_TAG_STATE;
        else
            defaultEntry();
    }

    else if (ch === '>') {
        if (this._isAppropriateEndTagToken()) {
            this._emitCurrentToken();
            this.state = DATA_STATE;
        } else
            defaultEntry();
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this.currentToken.tagName += asciiToLower(ch);
        this.tempBuff += ch;
    }

    else if (ch >= 'a' && ch <= 'z') {
        this.currentToken.tagName += ch;
        this.tempBuff += ch;
    }

    else
        defaultEntry();
};

//12.2.4.28 Script data double escape start state
_[SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ' || ch === '/' || ch === '>') {
        this.state = this.tempBuff === 'script' ? SCRIPT_DATA_DOUBLE_ESCAPED_STATE : SCRIPT_DATA_ESCAPED_STATE;
        this._emitCharacterToken(ch);
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this.tempBuff += asciiToLower(ch);
        this._emitCharacterToken(ch);
    }

    else if (ch >= 'a' && ch <= 'z') {
        this.tempBuff += ch;
        this._emitCharacterToken(ch);
    }

    else
        this._reconsumeCharInState(SCRIPT_DATA_ESCAPED_STATE);
};

//12.2.4.29 Script data double escaped state
_[SCRIPT_DATA_DOUBLE_ESCAPED_STATE] = function (ch) {
    if (ch === '-') {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE;
        this._emitCharacterToken('-');
    }

    else if (ch === '<') {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
        this._emitCharacterToken('<');
    }

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._emitCharacterToken(REPLACEMENT_CHARACTER);
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else
        this._emitCharacterToken(ch);
};

//12.2.4.30 Script data double escaped dash state
_[SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE] = function (ch) {
    if (ch === '-') {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE;
        this._emitCharacterToken('-');
    }

    else if (ch === '<') {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
        this._emitCharacterToken('<');
    }

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitCharacterToken(REPLACEMENT_CHARACTER);
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitCharacterToken(ch);
    }
};

//12.2.4.31 Script data double escaped dash dash state
_[SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE] = function (ch) {
    if (ch === '-')
        this._emitCharacterToken('-');

    else if (ch === '<') {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
        this._emitCharacterToken('<');
    }

    else if (ch === '>') {
        this.state = SCRIPT_DATA_STATE;
        this._emitCharacterToken('>');
    }

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitCharacterToken(REPLACEMENT_CHARACTER);
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else {
        this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitCharacterToken(ch);
    }
};

//12.2.4.32 Script data double escaped less-than sign state
_[SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE] = function (ch) {
    if (ch === '/') {
        this.tempBuff = '';
        this.state = SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE;
        this._emitCharacterToken('/');
    }

    else
        this._reconsumeCharInState(SCRIPT_DATA_DOUBLE_ESCAPED_STATE);
};

//12.2.4.33 Script data double escape end state
_[SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ' || ch === '/' || ch === '>') {
        this.state = this.tempBuff === 'script' ? SCRIPT_DATA_ESCAPED_STATE : SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
        this._emitCharacterToken(ch);
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this.tempBuff += asciiToLower(ch);
        this._emitCharacterToken(ch);
    }

    else if (ch >= 'a' && ch <= 'z') {
        this.tempBuff += ch;
        this._emitCharacterToken(ch);
    }

    else
        this._reconsumeCharInState(SCRIPT_DATA_DOUBLE_ESCAPED_STATE);
};

//12.2.4.34 Before attribute name state
_[BEFORE_ATTRIBUTE_NAME_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '/')
        this.state = SELF_CLOSING_START_TAG_STATE;

    else if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this._createAttr(asciiToLower(ch));
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._createAttr(REPLACEMENT_CHARACTER);
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (ch === '\'' || ch === '"' || ch === '<' || ch === '=') {
        this._err(err.MAILFORMED_ATTRIBUTE_NAME);
        this._createAttr(ch);
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else {
        this._createAttr(ch);
        this.state = ATTRIBUTE_NAME_STATE;
    }
};

//12.2.4.35 Attribute name state
_[ATTRIBUTE_NAME_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this._leaveAttrName(AFTER_ATTRIBUTE_NAME_STATE);

    else if (ch === '/')
        this._leaveAttrName(SELF_CLOSING_START_TAG_STATE);

    else if (ch === '=')
        this._leaveAttrName(BEFORE_ATTRIBUTE_VALUE_STATE);

    else if (ch === '>') {
        this._leaveAttrName(DATA_STATE);
        this._emitCurrentToken();
    }

    else if (ch >= 'A' && ch <= 'Z')
        this.currentAttr.name += asciiToLower(ch);

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentAttr.name += REPLACEMENT_CHARACTER;
    }

    else if (ch === '\'' || ch === '"' || ch === '<') {
        this._err(err.MAILFORMED_ATTRIBUTE_NAME);
        this.currentAttr.name += ch;
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else
        this.currentAttr.name += ch;
};

//12.2.4.36 After attribute name state
_[AFTER_ATTRIBUTE_NAME_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '/')
        this.state = SELF_CLOSING_START_TAG_STATE;

    else if (ch === '=')
        this.state = BEFORE_ATTRIBUTE_VALUE_STATE;

    else if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch >= 'A' && ch <= 'Z') {
        this._createAttr(asciiToLower(ch));
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._createAttr(REPLACEMENT_CHARACTER);
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (ch === '\'' || ch === '"' || ch === '<') {
        this._err(err.MAILFORMED_ATTRIBUTE_NAME);
        this._createAttr(ch);
        this.state = ATTRIBUTE_NAME_STATE;
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else {
        this._createAttr(ch);
        this.state = ATTRIBUTE_NAME_STATE;
    }
};

//12.2.4.37 Before attribute value state
_[BEFORE_ATTRIBUTE_VALUE_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '"')
        this.state = ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE;

    else if (ch === '&')
        this._reconsumeCharInState(ATTRIBUTE_VALUE_UNQUOTED_STATE);

    else if (ch === '\'')
        this.state = ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE;

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentAttr.value += REPLACEMENT_CHARACTER;
        this.state = ATTRIBUTE_VALUE_UNQUOTED_STATE;
    }

    else if (ch === '>') {
        this._err(err.INVALID_ATTRIBUTE_DEFINITION);
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === '<' || ch === '=' || ch === GRAVE_ACCENT) {
        this._err(err.MAILFORMED_ATTRIBUTE_VALUE);
        this.currentAttr.value += ch;
        this.state = ATTRIBUTE_VALUE_UNQUOTED_STATE;
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else {
        this.currentAttr.value += ch;
        this.state = ATTRIBUTE_VALUE_UNQUOTED_STATE;
    }
};

//12.2.4.38 Attribute value (double-quoted) state
_[ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE] = function (ch) {
    if (ch === '"')
        this.state = AFTER_ATTRIBUTE_VALUE_QUOTED_STATE;

    else if (ch === '&') {
        this.additionalAllowedCh = '"';
        this.returnState = this.state;
        this.state = CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE;
    }

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentAttr.value += REPLACEMENT_CHARACTER
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else
        this.currentAttr.value += ch;
};

//12.2.4.39 Attribute value (single-quoted) state
_[ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE] = function (ch) {
    if (ch === '\'')
        this.state = AFTER_ATTRIBUTE_VALUE_QUOTED_STATE;

    else if (ch === '&') {
        this.additionalAllowedCh = '\'';
        this.returnState = this.state;
        this.state = CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE;
    }

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentAttr.value += REPLACEMENT_CHARACTER;
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else
        this.currentAttr.value += ch;
};

//12.2.4.40 Attribute value (unquoted) state
_[ATTRIBUTE_VALUE_UNQUOTED_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this.state = BEFORE_ATTRIBUTE_NAME_STATE;

    else if (ch === '&') {
        this.additionalAllowedCh = '>';
        this.returnState = this.state;
        this.state = CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE;
    }

    else if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentAttr.value += REPLACEMENT_CHARACTER;
    }

    else if (ch === '\'' || ch === '"' || ch === '<' || ch === '=' || ch === GRAVE_ACCENT) {
        this._err(err.MAILFORMED_ATTRIBUTE_VALUE);
        this.currentAttr.value += ch;
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else
        this.currentAttr.value += ch;
};

//12.2.4.41 Character reference in attribute value state
_[CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE_STATE] = function (ch) {
    var chars = this._consumeCharacterReference(ch, true);

    if (chars) {
        for (var i = 0; i < chars.length; i++)
            this.currentAttr.value += chars[i];
    } else
        this.currentAttr.value += '&';

    this.state = this.returnState;
};

//12.2.4.42 After attribute value (quoted) state
_[AFTER_ATTRIBUTE_VALUE_QUOTED_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this.state = BEFORE_ATTRIBUTE_NAME_STATE;

    else if (ch === '/')
        this.state = SELF_CLOSING_START_TAG_STATE;

    else if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else {
        this._err(err.UNEXPECTED_CHARACTER_IN_TAG_DEFINITION);
        this._reconsumeCharInState(BEFORE_ATTRIBUTE_NAME_STATE);
    }
};

//12.2.4.43 Self-closing start tag state
_[SELF_CLOSING_START_TAG_STATE] = function (ch) {
    if (ch === '>') {
        this.currentToken.selfClosing = true;
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === EOF)
        this._unexpectedEOF();

    else {
        this._err(err.UNEXPECTED_CHARACTER_IN_TAG_DEFINITION);
        this._reconsumeCharInState(BEFORE_ATTRIBUTE_NAME_STATE);
    }
};

//12.2.4.44 Bogus comment state
_[BOGUS_COMMENT_STATE] = function (ch) {
    this._createCommentToken();

    while (true) {
        if (ch === '>') {
            this.state = DATA_STATE;
            break;
        }

        else if (ch === EOF) {
            this._reconsumeCharInState(DATA_STATE);
            break;
        }

        else {
            this.currentToken.data += ch;
            ch = this._consumeChar();
        }
    }

    this._emitCurrentToken();
};

//12.2.4.45 Markup declaration open state
_[MARKUP_DECLARATION_OPEN_STATE] = function (ch) {
    if (this._consumeIfMatch('--', true, true)) {
        this._consumeLastLookaheadMatch();
        this._createCommentToken();
        this.state = COMMENT_START_STATE;
    }

    else if (this._consumeIfMatch('DOCTYPE', true, false)) {
        this._consumeLastLookaheadMatch();
        this.state = DOCTYPE_STATE;
    }
    //TODO
    else
        throw 'Not implemented';
};

//12.2.4.46 Comment start state
_[COMMENT_START_STATE] = function (ch) {
    if (ch === '-')
        this.state = COMMENT_START_DASH_STATE;

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.data += REPLACEMENT_CHARACTER;
        this.state = COMMENT_STATE;
    }

    else if (ch === '>') {
        this._err(err.MAILFORMED_COMMENT);
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === EOF) {
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this.currentToken.data += ch;
        this.state = COMMENT_STATE;
    }
};

//12.2.4.47 Comment start dash state
_[COMMENT_START_DASH_STATE] = function (ch) {
    if (ch === '-')
        this.state = COMMENT_END_STATE;

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.data += '-';
        this.currentToken.data += REPLACEMENT_CHARACTER;
        this.state = COMMENT_STATE;
    }

    else if (ch === '>') {
        this._err(err.MAILFORMED_COMMENT);
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === EOF) {
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this.currentToken.data += '-';
        this.currentToken.data += ch;
        this.state = COMMENT_STATE;
    }
};

//12.2.4.48 Comment state
_[COMMENT_STATE] = function (ch) {
    if (ch === '-')
        this.state = COMMENT_END_DASH_STATE;

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.data += REPLACEMENT_CHARACTER;
    }

    else if (ch === EOF) {
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else
        this.currentToken.data += ch;
};

//12.2.4.49 Comment end dash state
_[COMMENT_END_DASH_STATE] = function (ch) {
    if (ch === '-')
        this.state = COMMENT_END_STATE;

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.data += '-';
        this.currentToken.data += REPLACEMENT_CHARACTER;
        this.state = COMMENT_STATE;
    }

    else if (ch === EOF) {
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this.currentToken.data += '-';
        this.currentToken.data += ch;
        this.state = COMMENT_STATE;
    }
};

//12.2.4.50 Comment end state
_[COMMENT_END_STATE] = function (ch) {
    if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.data += '-';
        this.currentToken.data += REPLACEMENT_CHARACTER;
        this.state = COMMENT_STATE;
    }

    else if (ch === '!') {
        this._err(err.MAILFORMED_COMMENT);
        this.state = COMMENT_END_BANG_STATE;
    }

    else if (ch === '-') {
        this._err(err.MAILFORMED_COMMENT);
        this.currentToken.data += '-';
    }

    else if (ch === EOF) {
        this._unexpectedEOF();
        this._emitCurrentToken();
    }

    else {
        this._err(err.MAILFORMED_COMMENT);
        this.currentToken.data += '-';
        this.currentToken.data += ch;
        this.state = COMMENT_STATE;
    }
};

//12.2.4.51 Comment end bang state
_[COMMENT_END_BANG_STATE] = function (ch) {
    if (ch === '-') {
        this.currentToken.data += '--!';
        this.state = COMMENT_END_DASH_STATE;
    }

    else if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.data += '--!';
        this.currentToken.data += REPLACEMENT_CHARACTER;
        this.state = COMMENT_STATE;
    }

    else if (ch === EOF) {
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this.currentToken.data += '--!';
        this.currentToken.data += ch;
        this.state = COMMENT_STATE;
    }
};

//12.2.4.52 DOCTYPE state
_[DOCTYPE_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this.state = BEFORE_DOCTYPE_NAME_STATE;

    else if (ch === EOF) {
        this._createDoctypeToken();
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MAILFORMED_DOCTYPE);
        this._reconsumeCharInState(BEFORE_DOCTYPE_NAME_STATE);
    }
};

//12.2.4.53 Before DOCTYPE name state
_[BEFORE_DOCTYPE_NAME_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch >= 'A' && ch <= 'Z') {
        this._createDoctypeToken(asciiToLower(ch));
        this.state = DOCTYPE_NAME_STATE;
    }

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this._createDoctypeToken(REPLACEMENT_CHARACTER);
        this.state = DOCTYPE_NAME_STATE;
    }

    else if (ch === '>') {
        this._createDoctypeToken();
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === EOF) {
        this._createDoctypeToken();
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._createDoctypeToken(ch);
        this.state = DOCTYPE_NAME_STATE;
    }
};

//12.2.4.54 DOCTYPE name state
_[DOCTYPE_NAME_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this.state = AFTER_DOCTYPE_NAME_STATE;

    else if (ch === '>') {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch >= 'A' && ch <= 'Z')
        this.currentToken.name += asciiToLower(ch);

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.name += REPLACEMENT_CHARACTER;
    }

    else if (ch === EOF) {
        this._createDoctypeToken();
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else
        this.currentToken.name += ch;
};

//12.2.4.55 After DOCTYPE name state
_[AFTER_DOCTYPE_NAME_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '>') {
        this.state = DATA_STATE;
        this._emitCurrentToken();
    }

    else if (ch === EOF) {
        this._createDoctypeToken();
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else if (this._consumeIfMatch('PUBLIC', false, false)) {
        this._consumeLastLookaheadMatch();
        this.state = AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE;
    }

    else if (this._consumeIfMatch('SYSTEM', false, false)) {
        this._consumeLastLookaheadMatch();
        this.state = AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE;
    }

    else {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.56 After DOCTYPE public keyword state
_[AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this.state = BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE;

    else if (ch === '"') {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.publicID = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (ch === '\'') {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.publicID = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (ch === '>') {
        this._err(err.MISSING_DOCTYPE_PUBLIC_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MISSING_DOCTYPE_PUBLIC_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.57 Before DOCTYPE public identifier state
_[BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '"') {
        this.currentToken.publicID = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (ch === '\'') {
        this.currentToken.publicID = '';
        this.state = DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (ch === '>') {
        this._err(err.MISSING_DOCTYPE_PUBLIC_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MISSING_DOCTYPE_PUBLIC_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.58 DOCTYPE public identifier (double-quoted) state
_[DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE] = function (ch) {
    if (ch === '"')
        this.state = AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE;

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.publicID += REPLACEMENT_CHARACTER;
    }

    else if (ch === '>') {
        this._err(err.MAILFORMED_DOCTYPE_PUBLIC_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else
        this.currentToken.publicID += ch;
};

//12.2.4.59 DOCTYPE public identifier (single-quoted) state
_[DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE] = function (ch) {
    if (ch === '\'')
        this.state = AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE;

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.publicID += REPLACEMENT_CHARACTER;
    }

    else if (ch === '>') {
        this._err(err.MAILFORMED_DOCTYPE_PUBLIC_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else
        this.currentToken.publicID += ch;
};

//12.2.4.60 After DOCTYPE public identifier state
_[AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        this.state = BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE;

    else if (ch === '>') {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === '"') {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }


    else if (ch === '\'') {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (ch === EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.61 Between DOCTYPE public and system identifiers state
_[BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '>') {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === '"') {
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }


    else if (ch === '\'') {
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (ch === EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.62 After DOCTYPE system keyword state
_[AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '"') {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (ch === '\'') {
        this._err(err.MAILFORMED_DOCTYPE);
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (ch === '>') {
        this._err(err.MISSING_DOCTYPE_SYSTEM_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MISSING_DOCTYPE_SYSTEM_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.63 Before DOCTYPE system identifier state
_[BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '"') {
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
    }

    else if (ch === '\'') {
        this.currentToken.systemID = '';
        this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
    }

    else if (ch === '>') {
        this._err(err.MISSING_DOCTYPE_SYSTEM_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MISSING_DOCTYPE_SYSTEM_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.64 DOCTYPE system identifier (double-quoted) state
_[DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE] = function (ch) {
    if (ch === '"')
        this.state = AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE;

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.systemID += REPLACEMENT_CHARACTER;
    }

    else if (ch === '>') {
        this._err(err.MAILFORMED_DOCTYPE_SYSTEM_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else
        this.currentToken.systemID += ch;
};

//12.2.4.65 DOCTYPE system identifier (single-quoted) state
_[DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE] = function (ch) {
    if (ch === '\'')
        this.state = AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE;

    else if (ch === NULL) {
        this._err(err.UNEXPECTED_NULL_CHARACTER);
        this.currentToken.systemID += REPLACEMENT_CHARACTER;
    }

    else if (ch === '>') {
        this._err(err.MAILFORMED_DOCTYPE_SYSTEM_IDENTIFIER);
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else
        this.currentToken.systemID += ch;
};

//12.2.4.66 After DOCTYPE system identifier state
_[AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE] = function (ch) {
    if (ch === '\n' || ch === '\f' || ch === '\t' || ch === ' ')
        return;

    if (ch === '>') {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === EOF) {
        this.currentToken.forceQuirks = true;
        this._emitCurrentToken();
        this._unexpectedEOF();
    }

    else {
        this._err(err.MAILFORMED_DOCTYPE);
        this.state = BOGUS_DOCTYPE_STATE;
    }
};

//12.2.4.67 Bogus DOCTYPE state
_[BOGUS_DOCTYPE_STATE] = function (ch) {
    if (ch === '>') {
        this._emitCurrentToken();
        this.state = DATA_STATE;
    }

    else if (ch === EOF) {
        this._emitCurrentToken();
        this._reconsumeCharInState(DATA_STATE);
    }
};

//12.2.4.68 CDATA section state
_[CDATA_SECTION_STATE] = function (ch) {
    //TODO
    throw new Error('Not implemented');
};