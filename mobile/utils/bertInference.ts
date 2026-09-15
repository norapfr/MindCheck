/**
 * Ejecuta bert-base-uncased (ONNX) sobre los tensores ya tokenizados.
 * Migrado de onnxruntime-react-native a react-native-nitro-onnxruntime
 * por un bug conocido y sin resolver de la primera dentro de proyectos
 * Expo (ver github.com/microsoft/onnxruntime/issues/19510).
 */
import { createModelLoader } from 'react-native-nitro-onnxruntime';
import type { EncodedInput } from './bertTokenizer';
import { roundTripFloat16 } from './float16';

const HIDDEN_SIZE = 768;

let cachedSession: Awaited<ReturnType<typeof createModelLoader>> | null = null;

export async function loadBertSession(onnxPath: string) {
    if (cachedSession) return cachedSession;
    cachedSession = await createModelLoader({ filePath: onnxPath });
    return cachedSession;
}

function toArrayBuffer(int64Values: number[]): ArrayBuffer {
    const buffer = new ArrayBuffer(int64Values.length * 8);
    const view = new BigInt64Array(buffer);
    for (let i = 0; i < int64Values.length; i++) {
        view[i] = BigInt(int64Values[i]);
    }
    return buffer;
}

export async function computeBertEmbedding(
    session: Awaited<ReturnType<typeof createModelLoader>>,
    encoded: EncodedInput
): Promise<Float32Array> {
    const seqLen = encoded.inputIds.length;

    const feeds: Record<string, ArrayBuffer> = {
        input_ids: toArrayBuffer(encoded.inputIds),
        attention_mask: toArrayBuffer(encoded.attentionMask),
        token_type_ids: toArrayBuffer(encoded.tokenTypeIds),
    };

    const results = session.run(feeds);
    const lastHiddenState = new Float32Array(results['last_hidden_state']); // [1, seqLen, 768]

    const masked = new Float32Array(seqLen * HIDDEN_SIZE);
    for (let t = 0; t < seqLen; t++) {
        const maskVal = encoded.attentionMask[t];
        for (let h = 0; h < HIDDEN_SIZE; h++) {
            masked[t * HIDDEN_SIZE + h] = lastHiddenState[t * HIDDEN_SIZE + h] * maskVal;
        }
    }

    const croppedLen = seqLen - 2;
    const cropped = masked.slice(HIDDEN_SIZE, HIDDEN_SIZE * (croppedLen + 1));

    for (let i = 0; i < cropped.length; i++) {
        cropped[i] = roundTripFloat16(cropped[i]);
    }

    return cropped;
}