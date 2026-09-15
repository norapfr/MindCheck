/**
 * Tokenizador WordPiece de BERT, implementado desde cero en TypeScript
 * para no depender de ninguna librería externa de tokenización en el
 * móvil. Reproduce fielmente el algoritmo de BertTokenizer (Python) en
 * sus dos fases: BasicTokenizer (split por espacios/puntuación,
 * minúsculas, sin acentos) + WordPieceTokenizer (coincidencia voraz
 * por el vocabulario, con prefijo "##" para continuaciones).
 *
 * Validado contra la salida real de BertTokenizer en Python — ver
 * scripts/validate_tokenizer.js.
 */

export type Vocab = Map<string, number>;

const CLS_TOKEN = '[CLS]';
const SEP_TOKEN = '[SEP]';
const PAD_TOKEN = '[PAD]';
const UNK_TOKEN = '[UNK]';
const MAX_INPUT_CHARS_PER_WORD = 100;

export function parseVocab(vocabText: string): Vocab {
    const vocab: Vocab = new Map();
    const lines = vocabText.split('\n');
    for (let i = 0; i < lines.length; i++) {
        // vocab.txt puede traer una línea vacía final; se ignora.
        const token = lines[i].replace(/\r$/, '');
        if (token.length === 0 && i === lines.length - 1) continue;
        vocab.set(token, i);
    }
    return vocab;
}

function stripAccents(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Mismo criterio que _is_punctuation en Python: rangos ASCII explícitos
// de puntuación, o cualquier carácter Unicode de categoría "P*".
function isPunctuation(char: string): boolean {
    const cp = char.codePointAt(0)!;
    if (
        (cp >= 33 && cp <= 47) ||
        (cp >= 58 && cp <= 64) ||
        (cp >= 91 && cp <= 96) ||
        (cp >= 123 && cp <= 126)
    ) {
        return true;
    }
    return /\p{P}/u.test(char);
}

function isControl(char: string): boolean {
    if (char === '\t' || char === '\n' || char === '\r') return false;
    return /\p{Cc}|\p{Cf}/u.test(char);
}

function isWhitespace(char: string): boolean {
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') return true;
    return /\p{Zs}/u.test(char);
}

function cleanControlAndWhitespace(text: string): string {
    let out = '';
    for (const char of text) {
        const cp = char.codePointAt(0)!;
        if (cp === 0 || cp === 0xfffd || isControl(char)) continue;
        out += isWhitespace(char) ? ' ' : char;
    }
    return out;
}

function whitespaceTokenize(text: string): string[] {
    return text.trim().length === 0 ? [] : text.trim().split(/\s+/);
}

function runSplitOnPunctuation(token: string): string[] {
    const chars = Array.from(token);
    const output: string[][] = [];
    let startNewWord = true;
    for (const char of chars) {
        if (isPunctuation(char)) {
            output.push([char]);
            startNewWord = true;
        } else {
            if (startNewWord) output.push([]);
            startNewWord = false;
            output[output.length - 1].push(char);
        }
    }
    return output.map((chars) => chars.join(''));
}

/** BasicTokenizer: split por espacios, puntuación, minúsculas, sin acentos. */
function basicTokenize(text: string): string[] {
    const cleaned = cleanControlAndWhitespace(text);
    const origTokens = whitespaceTokenize(cleaned);
    const splitTokens: string[] = [];
    for (let token of origTokens) {
        token = token.toLowerCase();
        token = stripAccents(token);
        splitTokens.push(...runSplitOnPunctuation(token));
    }
    return whitespaceTokenize(splitTokens.join(' '));
}

/** WordPieceTokenizer: coincidencia voraz de mayor a menor longitud contra el vocabulario. */
function wordpieceTokenize(token: string, vocab: Vocab): string[] {
    const chars = Array.from(token);
    if (chars.length > MAX_INPUT_CHARS_PER_WORD) return [UNK_TOKEN];

    const subTokens: string[] = [];
    let start = 0;
    let isBad = false;

    while (start < chars.length) {
        let end = chars.length;
        let curSubstr: string | null = null;

        while (start < end) {
            let substr = chars.slice(start, end).join('');
            if (start > 0) substr = '##' + substr;
            if (vocab.has(substr)) {
                curSubstr = substr;
                break;
            }
            end -= 1;
        }

        if (curSubstr === null) {
            isBad = true;
            break;
        }
        subTokens.push(curSubstr);
        start = end;
    }

    return isBad ? [UNK_TOKEN] : subTokens;
}

export type EncodedInput = {
    inputIds: number[];
    attentionMask: number[];
    tokenTypeIds: number[];
};

/**
 * Tokeniza texto (ya limpio, viniendo de /preprocess) y devuelve los
 * tensores listos para BERT: [CLS] ... [SEP] + padding, longitud fija
 * maxLen (debe coincidir con max_seq usado al exportar el modelo ONNX).
 */
export function encode(text: string, vocab: Vocab, maxLen: number): EncodedInput {
    const basicTokens = basicTokenize(text);
    const wordpieceTokens: string[] = [];
    for (const token of basicTokens) {
        wordpieceTokens.push(...wordpieceTokenize(token, vocab));
    }

    const tokens = [CLS_TOKEN, ...wordpieceTokens.slice(0, maxLen - 2), SEP_TOKEN];

    const unkId = vocab.get(UNK_TOKEN)!;
    const padId = vocab.get(PAD_TOKEN)!;

    const inputIds = tokens.map((t) => vocab.get(t) ?? unkId);
    const attentionMask = new Array(inputIds.length).fill(1);

    while (inputIds.length < maxLen) {
        inputIds.push(padId);
        attentionMask.push(0);
    }

    const tokenTypeIds = new Array(maxLen).fill(0);

    return { inputIds, attentionMask, tokenTypeIds };
}