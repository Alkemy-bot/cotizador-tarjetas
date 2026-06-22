export const BANCOS = [
  'AGRICOLA',
  'PROMERICA',
  'DAVIVIENDA',
  'BAC',
  'CUSCATLAN',
  'NICO VISA',
  'WOMPI',
]

export const CARD_TYPES = [
  { id: 'VISA',   label: 'TC Otro Banco Visa' },
  { id: 'MC',     label: 'TC Otro Banco Mastercard' },
  { id: 'PROPIA', label: 'TC Propia' },
]

export const CUOTAS_TASA0 = [2, 3, 6, 9, 12, 18, 24, 36]

export const IVA = 0.13

// Tasas para 1 cuota (por banco y tipo de tarjeta)
// 0% en 1 cuota = plan válido sin cargo
export const oneCuotaRates = {
  'AGRICOLA':   { VISA: 3.00,  MC: 3.00,  PROPIA: 3.00 },
  'PROMERICA':  { VISA: 1.50,  MC: 1.50,  PROPIA: 1.50 },
  'DAVIVIENDA': { VISA: 2.55,  MC: 3.40,  PROPIA: 0.00 },
  'BAC':        { VISA: 2.20,  MC: 2.20,  PROPIA: 2.20 },
  'CUSCATLAN':  { VISA: 2.15,  MC: 2.15,  PROPIA: 2.00 },
  'NICO VISA':  { VISA: 1.50,  MC: 3.55,  PROPIA: 0.00 },
  'WOMPI':      { VISA: 0.00,  MC: 0.00,  PROPIA: 0.00 },
}

// Tasas Tasa 0 (por banco y número de cuotas)
// 0% = ese plan no existe para ese banco
export const tasa0Rates = {
  'AGRICOLA':   { 2: 0.00, 3: 2.50, 6: 2.75,  9: 3.50,  12: 4.50,  18: 5.50,  24: 7.50,  36: 8.75 },
  'PROMERICA':  { 2: 0.00, 3: 1.50, 6: 2.00,  9: 2.50,  12: 3.00,  18: 4.00,  24: 5.00,  36: 0.00 },
  'DAVIVIENDA': { 2: 1.00, 3: 1.00, 6: 1.00,  9: 1.00,  12: 1.00,  18: 0.00,  24: 1.00,  36: 0.00 },
  'BAC':        { 2: 0.00, 3: 5.00, 6: 7.00,  9: 8.00,  12: 9.00,  18: 0.00,  24: 0.00,  36: 0.00 },
  'CUSCATLAN':  { 2: 0.00, 3: 2.00, 6: 2.25,  9: 2.60,  12: 3.25,  18: 0.00,  24: 3.50,  36: 0.00 },
  'NICO VISA':  { 2: 0.00, 3: 0.00, 6: 0.00,  9: 0.00,  12: 0.00,  18: 0.00,  24: 0.00,  36: 0.00 },
  'WOMPI':      { 2: 0.00, 3: 0.00, 6: 0.00,  9: 0.00,  12: 0.00,  18: 0.00,  24: 0.00,  36: 0.00 },
}

// Tasas Pago con Puntos (por banco)
// 0% = banco no ofrece este plan
export const pagoPuntosRates = {
  'AGRICOLA':   3.00,
  'PROMERICA':  0.75,
  'DAVIVIENDA': 0.00,
  'BAC':        0.00,
  'CUSCATLAN':  1.00,
  'NICO VISA':  0.00,
  'WOMPI':      0.00,
}

export function getAvailableCuotas(banco) {
  const options = [{ value: 1, label: '1 Cuota' }]
  if (!banco) return options
  CUOTAS_TASA0.forEach(c => {
    if (tasa0Rates[banco][c] > 0) {
      options.push({ value: c, label: `${c} Cuotas — Tasa 0` })
    }
  })
  return options
}

export function hasPagoPuntos(banco) {
  return !!banco && pagoPuntosRates[banco] > 0
}

export function calcularCargo(monto, tasa) {
  const cargo = monto * (tasa / 100)
  const ivaCargo = cargo * IVA
  const valorFinanciero = cargo + ivaCargo
  const totalACobrar = monto + valorFinanciero
  return { monto, tasa, cargo, ivaCargo, valorFinanciero, totalACobrar }
}
