/**
 * Descarga el BERT en ONNX (~400MB, .onnx + .onnx_data separados) la
 * primera vez que se abre la app, y lo guarda en almacenamiento local
 * persistente. En aperturas siguientes, comprueba que AMBOS archivos
 * existan y estén completos antes de asumir que están listos.
 *
 * Importante: .onnx y .onnx_data deben venir siempre del MISMO export.
 * Si se sube una versión nueva de uno sin el otro, los offsets internos
 * del .onnx dejan de coincidir con el .onnx_data y onnxruntime falla al
 * leer los tensores. Por eso aquí se tratan como una unidad: si falta o
 * está corrupto cualquiera de los dos, se re-descargan ambos.
 */
import * as FileSystem from 'expo-file-system/legacy';

const HF_REPO_BASE = 'https://huggingface.co/norapfr/mindCheck_depression/resolve/main';
const ONNX_FILENAME = 'bert_base_uncased.onnx';
const ONNX_DATA_FILENAME = 'bert_base_uncased.onnx.data';

const MODELS_DIR = `${FileSystem.documentDirectory}mindcheck_models/`;

export type DownloadProgress = {
    fileName: string;
    progress: number; // 0 a 1
};

async function ensureDirExists() {
    const info = await FileSystem.getInfoAsync(MODELS_DIR);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
    }
}

async function getRemoteSize(remoteUrl: string): Promise<number | null> {
    try {
        const res = await fetch(remoteUrl, { method: 'HEAD' });
        const len = res.headers.get('content-length');
        return len ? parseInt(len, 10) : null;
    } catch {
        return null;
    }
}

async function isFileComplete(localPath: string, remoteUrl: string): Promise<boolean> {
    const info = await FileSystem.getInfoAsync(localPath);
    if (!info.exists || info.size === 0) return false;

    const remoteSize = await getRemoteSize(remoteUrl);
    if (remoteSize === null) return true; // sin conexión: confiamos en lo local

    return info.size === remoteSize;
}

async function deleteBothIfExist() {
    await FileSystem.deleteAsync(`${MODELS_DIR}${ONNX_FILENAME}`, { idempotent: true });
    await FileSystem.deleteAsync(`${MODELS_DIR}${ONNX_DATA_FILENAME}`, { idempotent: true });
}

async function downloadOne(
    fileName: string,
    onProgress?: (p: DownloadProgress) => void
): Promise<void> {
    const localPath = `${MODELS_DIR}${fileName}`;
    const remoteUrl = `${HF_REPO_BASE}/${fileName}`;

    const downloadResumable = FileSystem.createDownloadResumable(
        remoteUrl,
        localPath,
        {},
        (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            onProgress?.({ fileName, progress });
        }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result) throw new Error(`No se pudo descargar ${fileName}`);

    const ok = await isFileComplete(localPath, remoteUrl);
    if (!ok) {
        throw new Error(`${fileName} se descargó pero no coincide con el tamaño esperado.`);
    }
}

/**
 * Verifica que .onnx y .onnx_data existan y estén completos. Si
 * cualquiera de los dos falta o está corrupto/incompleto, borra AMBOS
 * y los vuelve a descargar juntos, para que nunca queden desparejados.
 */
export async function ensureBertModelDownloaded(
    onProgress?: (p: DownloadProgress) => void
): Promise<string> {
    await ensureDirExists();

    const onnxPath = `${MODELS_DIR}${ONNX_FILENAME}`;
    const onnxUrl = `${HF_REPO_BASE}/${ONNX_FILENAME}`;
    const dataPath = `${MODELS_DIR}${ONNX_DATA_FILENAME}`;
    const dataUrl = `${HF_REPO_BASE}/${ONNX_DATA_FILENAME}`;

    const [onnxOk, dataOk] = await Promise.all([
        isFileComplete(onnxPath, onnxUrl),
        isFileComplete(dataPath, dataUrl),
    ]);

    if (onnxOk && dataOk) {
        return onnxPath;
    }

    // Cualquier inconsistencia -> se descartan ambos y se bajan de nuevo,
    // para garantizar que siempre queden pareados de la misma versión.
    await deleteBothIfExist();

    try {
        await downloadOne(ONNX_DATA_FILENAME, onProgress);
        await downloadOne(ONNX_FILENAME, onProgress);
    } catch (err) {
        // Si falla a mitad de camino, no dejamos un par a medias.
        await deleteBothIfExist();
        throw err;
    }

    return onnxPath;
}

export async function isBertModelDownloaded(): Promise<boolean> {
    const onnxPath = `${MODELS_DIR}${ONNX_FILENAME}`;
    const onnxUrl = `${HF_REPO_BASE}/${ONNX_FILENAME}`;
    const dataPath = `${MODELS_DIR}${ONNX_DATA_FILENAME}`;
    const dataUrl = `${HF_REPO_BASE}/${ONNX_DATA_FILENAME}`;

    const [onnxOk, dataOk] = await Promise.all([
        isFileComplete(onnxPath, onnxUrl),
        isFileComplete(dataPath, dataUrl),
    ]);
    return onnxOk && dataOk;
}