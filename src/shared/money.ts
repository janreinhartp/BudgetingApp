/**
 * Safe monetary helpers. All amounts are stored and calculated as integer
 * centavos (1 peso = 100 centavos) to avoid floating point rounding errors.
 */

export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100)
}

export function centavosToPesos(centavos: number): number {
  return centavos / 100
}

export function formatPHP(centavos: number): string {
  const pesos = centavosToPesos(centavos)
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(pesos)
}

export function sumCentavos(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}
