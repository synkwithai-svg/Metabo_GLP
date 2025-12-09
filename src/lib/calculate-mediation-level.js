import dayjs from "dayjs";
export default function calculateMedicationLevel(injection, medication) {
    if (!medication || !injection) return 0;

    const halfLife = medication.halfLifeHours;
    if (!halfLife) return 0;

    const k = Math.log(2) / halfLife;

    const dose = parseFloat(injection.dosage ?? injection.dose ?? "0");
    if (!dose || isNaN(dose)) return 0;

    const now = dayjs();
    const injectionTime = dayjs(injection.date);
    const hoursPassed = now.diff(injectionTime, "hour", true);

    const C0 = dose * (medication.bioavailability ?? 1);

    return C0 * Math.exp(-k * hoursPassed);
}
