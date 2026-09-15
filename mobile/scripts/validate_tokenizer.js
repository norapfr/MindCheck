/**
 * Valida bertTokenizer.ts contra tokenizer_baseline.json (generado en
 * Python con el BertTokenizer real). Copia funcional de la lógica de
 * ../utils/bertTokenizer.ts en JS plano, para correr con "node" sin
 * necesitar compilar TypeScript.
 *
 * Uso:
 *   node scripts/validate_tokenizer.js
 */
const fs = require('fs');
const path = require('path');

const CLS_TOKEN = '[CLS]';
const SEP_TOKEN = '[SEP]';
const PAD_TOKEN = '[PAD]';
const UNK_TOKEN = '[UNK]';
const MAX_INPUT_CHARS_PER_WORD = 100;
const MAX_LEN = 132;

function parseVocab(vocabText) {
    const vocab = new Map();
    const lines = vocabText.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const token = lines[i].replace(/\r$/, '');
        if (token.length === 0 && i === lines.length - 1) continue;
        vocab.set(token, i);
    }
    return vocab;
}

function stripAccents(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isPunctuation(char) {
    const cp = char.codePointAt(0);
    if ((cp >= 33 && cp <= 47) || (cp >= 58 && cp <= 64) || (cp >= 91 && cp <= 96) || (cp >= 123 && cp <= 126)) {
        return true;
    }
    return /\p{P}/u.test(char);
}

function isControl(char) {
    if (char === '\t' || char === '\n' || char === '\r') return false;
    return /\p{Cc}|\p{Cf}/u.test(char);
}

function isWhitespace(char) {
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') return true;
    return /\p{Zs}/u.test(char);
}

function cleanControlAndWhitespace(text) {
    let out = '';
    for (const char of text) {
        const cp = char.codePointAt(0);
        if (cp === 0 || cp === 0xfffd || isControl(char)) continue;
        out += isWhitespace(char) ? ' ' : char;
    }
    return out;
}

function whitespaceTokenize(text) {
    return text.trim().length === 0 ? [] : text.trim().split(/\s+/);
}

function runSplitOnPunctuation(token) {
    const chars = Array.from(token);
    const output = [];
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

function basicTokenize(text) {
    const cleaned = cleanControlAndWhitespace(text);
    const origTokens = whitespaceTokenize(cleaned);
    const splitTokens = [];
    for (let token of origTokens) {
        token = token.toLowerCase();
        token = stripAccents(token);
        splitTokens.push(...runSplitOnPunctuation(token));
    }
    return whitespaceTokenize(splitTokens.join(' '));
}

function wordpieceTokenize(token, vocab) {
    const chars = Array.from(token);
    if (chars.length > MAX_INPUT_CHARS_PER_WORD) return [UNK_TOKEN];

    const subTokens = [];
    let start = 0;
    let isBad = false;

    while (start < chars.length) {
        let end = chars.length;
        let curSubstr = null;

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

function encode(text, vocab, maxLen) {
    const basicTokens = basicTokenize(text);
    const wordpieceTokens = [];
    for (const token of basicTokens) {
        wordpieceTokens.push(...wordpieceTokenize(token, vocab));
    }

    const tokens = [CLS_TOKEN, ...wordpieceTokens.slice(0, maxLen - 2), SEP_TOKEN];

    const unkId = vocab.get(UNK_TOKEN);
    const padId = vocab.get(PAD_TOKEN);

    const inputIds = tokens.map((t) => (vocab.has(t) ? vocab.get(t) : unkId));
    const attentionMask = new Array(inputIds.length).fill(1);

    while (inputIds.length < maxLen) {
        inputIds.push(padId);
        attentionMask.push(0);
    }

    return { inputIds, attentionMask };
}

function main() {
    const vocabPath = path.join(__dirname, '..', 'assets', 'bert_vocab.txt');
    const baselinePath = path.join(__dirname, 'tokenizer_baseline.json');

    if (!fs.existsSync(vocabPath)) {
        console.error(`No se encontró ${vocabPath}. Copia vocab.txt desde backend/scripts/bert_tokenizer/ y renómbralo a bert_vocab.txt.`);
        process.exit(1);
    }
    if (!fs.existsSync(baselinePath)) {
        console.error(`No se encontró ${baselinePath}. Copia tokenizer_baseline.json generado en el backend.`);
        process.exit(1);
    }

    const vocab = parseVocab(fs.readFileSync(vocabPath, 'utf-8'));
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));

    let allOk = true;
    console.log('id   input_ids match   attention_mask match   status');
    console.log('-'.repeat(55));

    for (const item of baseline) {
        const result = encode(item.cleaned_text, vocab, MAX_LEN);

        const idsMatch = JSON.stringify(result.inputIds) === JSON.stringify(item.input_ids);
        const maskMatch = JSON.stringify(result.attentionMask) === JSON.stringify(item.attention_mask);
        const status = idsMatch && maskMatch ? 'ok' : 'FAIL';
        if (status === 'FAIL') allOk = false;

        console.log(`${String(item.id).padEnd(4)} ${String(idsMatch).padEnd(17)} ${String(maskMatch).padEnd(23)} ${status}`);

        if (!idsMatch) {
            console.log(`  esperado: ${item.input_ids.slice(0, 15).join(',')}...`);
            console.log(`  obtenido: ${result.inputIds.slice(0, 15).join(',')}...`);
        }
    }

    console.log('-'.repeat(55));
    console.log(allOk ? '\n✅ Tokenización idéntica en los 12 casos.' : '\n⚠️  Hay diferencias — no integrar en la app todavía.');
    process.exit(allOk ? 0 : 1);
}

main();