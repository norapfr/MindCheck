/**
 * Ejecuta los dos clasificadores TFLite (depresión, riesgo suicida)
 * sobre el embedding ya calculado por BERT. Modelos empaquetados
 * localmente en la app (pesan pocos MB), sin descarga en tiempo real.
 *
 * Se fuerza el delegado 'default' (CPU) explícitamente: el pipeline
 * completo se validó corriendo en CPU (ai-edge-litert en el backend),
 * y un delegado GPU (core-ml, metal, android-gpu) podría usar
 * operaciones de menor precisión, dando resultados ligeramente
 * distintos a los ya confirmados como correctos.
 *
 * Nota: pasamos require(...) a través de expo-asset (Asset.fromModule
 * + downloadAsync) para obtener una URI local (file://) explícita, en
 * vez de dejar que loadTensorflowModel reciba el require() crudo. El
 * HybridAssetLoader nativo de react-native-fast-tflite/Nitro no
 * resuelve bien el nombre de recurso Android que Metro genera para
 * estos archivos (falla con "no protocol"), así que evitamos ese
 * camino resolviendo la URI nosotros mismos primero.
 */
import { Asset } from 'expo-asset';
import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';

let depressionModel: TensorflowModel | null = null;
let suicideModel: TensorflowModel | null = null;

async function resolveLocalUri(moduleId: number): Promise<string> {
    const asset = Asset.fromModule(moduleId);
    await asset.downloadAsync();
    if (!asset.localUri) {
        throw new Error('No se pudo resolver la URI local del modelo TFLite.');
    }
    return asset.localUri;
}

export async function loadClassifiers(): Promise<void> {
    if (!depressionModel) {
        const uri = await resolveLocalUri(require('../assets/models/depression_model.tflite'));
        console.log('[tflite] depression model URI resuelta:', uri);
        depressionModel = await loadTensorflowModel({ url: uri }, []);
    }
    if (!suicideModel) {
        const uri = await resolveLocalUri(require('../assets/models/suicide_model.tflite'));
        console.log('[tflite] suicide model URI resuelta:', uri);
        suicideModel = await loadTensorflowModel({ url: uri }, []);
    }
}

function runSingle(model: TensorflowModel, embedding: Float32Array): number {
    const inputBuffer = embedding.buffer.slice(
        embedding.byteOffset,
        embedding.byteOffset + embedding.byteLength
    ) as ArrayBuffer;

    const outputs = model.runSync([inputBuffer]);
    const outputArray = new Float32Array(outputs[0]);
    return outputArray[0];
}

export function predictDepression(embedding: Float32Array): number {
    if (!depressionModel) throw new Error('Depression model not loaded — call loadClassifiers() first.');
    return runSingle(depressionModel, embedding);
}

export function predictSuicideRisk(embedding: Float32Array): number {
    if (!suicideModel) throw new Error('Suicide model not loaded — call loadClassifiers() first.');
    return runSingle(suicideModel, embedding);
}