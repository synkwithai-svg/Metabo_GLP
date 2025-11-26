function calculateBMI(weight, height) {
    if (!weight || !height) return { index: null, category: "" }

    const bmi = weight / (height / 100) ** 2

    const category = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal weight" : bmi < 30 ? "Overweight" : "Obesity"

    return {
        index: Number.parseFloat(bmi.toFixed(1)),
        category,
    }
}

export default calculateBMI;