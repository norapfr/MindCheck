/**
 * Une tokenización -> BERT (ONNX) -> clasificadores (TFLite).
 * Recibe texto YA LIMPIO (viene de POST /preprocess en el backend) y
 * devuelve las puntuaciones brutas. La categoría/high_risk las decide
 * el backend en POST /entries, no este módulo.
 */
import { parseVocab, encode, Vocab } from './bertTokenizer';
import { loadBertSession, computeBertEmbedding } from './bertInference';
import { loadClassifiers, predictDepression, predictSuicideRisk } from './tfliteInference';
import { ensureBertModelDownloaded, isBertModelDownloaded, DownloadProgress } from './modelDownload';
import { Asset } from 'expo-asset';

const MAX_SEQ = 132;

let cachedVocab: Vocab | null = null;

async function loadVocab(): Promise<Vocab> {
    if (cachedVocab) return cachedVocab;
    const asset = Asset.fromModule(require('../assets/bert_vocab.txt'));
    await asset.downloadAsync();
    const response = await fetch(asset.localUri ?? asset.uri);
    const text = await response.text();
    cachedVocab = parseVocab(text);
    return cachedVocab;
}

export type RawScores = {
    depression_score: number;
    suicide_risk_score: number;
};

export async function ensureModelsReady(onProgress?: (p: DownloadProgress) => void): Promise<void> {
    if (!(await isBertModelDownloaded())) {
        await ensureBertModelDownloaded(onProgress);
    }
    await loadClassifiers();
}

export async function analyzeLocally(cleanedText: string): Promise<RawScores> {
    const vocab = await loadVocab();
    const encoded = encode(cleanedText, vocab, MAX_SEQ);

    const onnxPath = await ensureBertModelDownloaded(); // ya en cache si existe, resuelve rapido
    const session = await loadBertSession(onnxPath);
    const embedding = await computeBertEmbedding(session, encoded);

    await loadClassifiers();
    const depression_score = predictDepression(embedding);
    const suicide_risk_score = predictSuicideRisk(embedding);

    return { depression_score, suicide_risk_score };
}