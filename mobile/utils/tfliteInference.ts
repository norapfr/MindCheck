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
 */
import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';

let depressionModel: TensorflowModel | null = null;
let suicideModel: TensorflowModel | null = null;

export async function loadClassifiers(): Promise<void> {
    if (!depressionModel) {
        depressionModel = await loadTensorflowModel(
            require('../assets/models/depression_model.tflite'),
            []
        );
    }
    if (!suicideModel) {
        suicideModel = await loadTensorflowModel(
            require('../assets/models/suicide_model.tflite'),
            []
        );
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