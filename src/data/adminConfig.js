import { oneCuotaRates, tasa0Rates, pagoPuntosRates, BANCOS, CUOTAS_TASA0 } from './rates'

export const ADMIN_CODE = '4321'

export function buildDefaultConfig() {
  const cfg = { oneCuota: {}, tasa0: {}, puntos: {} }
  BANCOS.forEach(b => {
    const enabledByDefault = b !== 'WOMPI'
    cfg.oneCuota[b] = {
      VISA:   { rate: oneCuotaRates[b].VISA,   enabled: enabledByDefault },
      MC:     { rate: oneCuotaRates[b].MC,     enabled: enabledByDefault },
      PROPIA: { rate: oneCuotaRates[b].PROPIA, enabled: enabledByDefault },
    }
    cfg.tasa0[b] = {}
    CUOTAS_TASA0.forEach(c => {
      cfg.tasa0[b][c] = { rate: tasa0Rates[b][c], enabled: enabledByDefault && tasa0Rates[b][c] > 0 }
    })
    cfg.puntos[b] = { rate: pagoPuntosRates[b], enabled: enabledByDefault }
  })
  return cfg
}

export function withMissingBancos(cfg) {
  const defaults = buildDefaultConfig()
  BANCOS.forEach(b => {
    cfg.oneCuota[b] ??= defaults.oneCuota[b]
    cfg.tasa0[b]    ??= defaults.tasa0[b]
    cfg.puntos[b]   ??= defaults.puntos[b]
  })
  return cfg
}

export async function loadConfig() {
  try {
    const res = await fetch('/api/config')
    if (res.ok) {
      const data = await res.json()
      if (data) return withMissingBancos(data)
    }
  } catch {}
  return buildDefaultConfig()
}

export async function saveConfig(cfg) {
  const res = await fetch('/api/config', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(cfg),
  })
  if (!res.ok) throw new Error('Error al guardar configuración')
}
