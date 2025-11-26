// utils/conversion.ts

export function lbsToKg(lbs: number) {
    return Math.round((lbs * 0.45359237) * 100) / 100; // Round to 2 decimals
}

export function kgToLbs(kg: number) {
    return Math.round((kg * 2.20462262) * 100) / 100; // Round to 2 decimals
}

export function ftInToCm(ft: number, inch: number) {
    return Math.round(((ft * 12 + inch) * 2.54) * 100) / 100; // Round to 2 decimals
}

export function cmToFtIn(cm: number) {
    const totalInches = cm / 2.54;
    const ft = Math.floor(totalInches / 12);
    const inch = Math.round(totalInches % 12);
    return { ft, inch };
}
