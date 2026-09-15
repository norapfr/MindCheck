/**
 * Redondeo float32 -> float16 -> float32, replicando exactamente
 * `.half()` de PyTorch en embeddings.py (seguido del cast de vuelta a
 * float32 en loader.py antes de alimentar al modelo). Sin esto, el
 * móvil calcularía embeddings más precisos que los que realmente se
 * validaron contra el baseline — una divergencia sutil pero real.
 *
 * Implementación estándar de conversión IEEE 754 binary32 <-> binary16
 * mediante manipulación de bits (algoritmo bien documentado, sin
 * dependencias externas).
 */

const floatView = new Float32Array(1);
const int32View = new Int32Array(floatView.buffer);

function float32ToFloat16Bits(value: number): number {
    floatView[0] = value;
    const x = int32View[0];

    const sign = (x >> 16) & 0x8000;
    let exponent = ((x >> 23) & 0xff) - 127 + 15;
    let mantissa = x & 0x7fffff;

    if (exponent <= 0) {
        if (exponent < -10) return sign; // demasiado pequeño -> cero
        mantissa = mantissa | 0x800000;
        const shift = 14 - exponent;
        return sign | (mantissa >> shift);
    }
    if (exponent >= 31) {
        return sign | 0x7c00; // overflow -> infinito
    }
    return sign | (exponent << 10) | (mantissa >> 13);
}

function float16BitsToFloat32(bits: number): number {
    const sign = (bits & 0x8000) >> 15;
    const exponent = (bits & 0x7c00) >> 10;
    const mantissa = bits & 0x03ff;

    let value: number;
    if (exponent === 0) {
        value = mantissa === 0 ? 0 : Math.pow(2, -14) * (mantissa / 1024);
    } else if (exponent === 31) {
        value = mantissa === 0 ? Infinity : NaN;
    } else {
        value = Math.pow(2, exponent - 15) * (1 + mantissa / 1024);
    }
    return sign ? -value : value;
}

/** Redondea un valor float32 tal como quedaría tras pasar por float16 y volver. */
export function roundTripFloat16(value: number): number {
    return float16BitsToFloat32(float32ToFloat16Bits(value));
}

/** Aplica el redondeo a todo un array (in-place, para eficiencia con embeddings grandes). */
export function roundTripFloat16Array(arr: Float32Array): Float32Array {
    for (let i = 0; i < arr.length; i++) {
        arr[i] = roundTripFloat16(arr[i]);
    }
    return arr;
}