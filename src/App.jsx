import { useState, useEffect } from 'react'
import { BANCOS, CARD_TYPES, IVA, CUOTAS_TASA0, calcularCargo } from './data/rates'
import { loadConfig, saveConfig } from './data/adminConfig'
import AdminPanel from './components/AdminPanel'

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100
const fmt    = (n) => `$${round2(n).toFixed(2)}`
const fmtPct = (n) => `${n.toFixed(2)}%`

// ── Modo POS ──────────────────────────────────────────────────────────────────

function getPlanOptions(banco, cfg) {
  const opts = [{ value: '', label: '—' }]
  if (!banco || !cfg) return opts
  const anyCard = ['VISA', 'MC', 'PROPIA'].some(ct => cfg.oneCuota[banco]?.[ct]?.enabled)
  if (anyCard) opts.push({ value: '1', label: '1 Cuota' })
  CUOTAS_TASA0.forEach(c => {
    if (cfg.tasa0[banco]?.[c]?.enabled)
      opts.push({ value: String(c), label: `${c} Cuotas — Tasa 0` })
  })
  if (cfg.puntos[banco]?.enabled)
    opts.push({ value: 'puntos', label: 'Compra con Puntos' })
  return opts
}

function getComparativoTarjeta(cuotas, cardType, monto, cfg) {
  if (monto <= 0) return []
  return BANCOS.map(b => {
    const cell = cuotas === 1 ? cfg.oneCuota[b]?.[cardType] : cfg.tasa0[b]?.[cuotas]
    if (!cell?.enabled) return null
    return { banco: b, tasa: cell.rate, ...calcularCargo(monto, cell.rate) }
  }).filter(Boolean).sort((a, b) => a.valorFinanciero - b.valorFinanciero)
}

function getComparativoPropiaVsOtro(bancoPOS, propiaRed, monto, cfg) {
  if (monto <= 0) return []
  return BANCOS.map(b => {
    const tasa = b === bancoPOS
      ? cfg.oneCuota[b]?.['PROPIA']?.rate ?? 0
      : cfg.oneCuota[b]?.[propiaRed]?.rate ?? 0
    return { banco: b, tasa, ...calcularCargo(monto, tasa) }
  }).sort((a, b) => a.valorFinanciero - b.valorFinanciero)
}

// ── Modo Tarjeta ──────────────────────────────────────────────────────────────

function getPlanOptionsByCard(cardBanco, cfg) {
  const opts = [{ value: '', label: '—' }]
  if (!cardBanco || !cfg) return opts
  opts.push({ value: '1', label: '1 Cuota' })
  CUOTAS_TASA0.forEach(c => {
    if (cfg.tasa0[cardBanco]?.[c]?.enabled)
      opts.push({ value: String(c), label: `${c} Cuotas — Tasa 0` })
  })
  if (cfg.puntos[cardBanco]?.enabled)
    opts.push({ value: 'puntos', label: 'Compra con Puntos' })
  return opts
}

function getComparativoByCard(cardBanco, cardRed, monto, cfg) {
  if (monto <= 0) return []
  return BANCOS.map(b => {
    const ct   = b === cardBanco ? 'PROPIA' : cardRed
    const cell = cfg.oneCuota[b]?.[ct]
    if (!cell?.enabled) return null
    return { banco: b, tasa: cell.rate, ...calcularCargo(monto, cell.rate) }
  }).filter(Boolean).sort((a, b) => a.valorFinanciero - b.valorFinanciero)
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [config,        setConfig]        = useState(null)
  const [configLoading, setConfigLoading] = useState(true)

  useEffect(() => {
    loadConfig().then(cfg => { setConfig(cfg); setConfigLoading(false) })
  }, [])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res  = await fetch('/api/config')
        if (!res.ok) return
        const data = await res.json()
        if (!data) return
        setConfig(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev)
      } catch {}
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const [page,      setPage]      = useState('main')
  const [mode,      setMode]      = useState('pos')   // 'pos' | 'tarjeta'
  const [plan,      setPlan]      = useState('')
  const [monto,     setMonto]     = useState('')
  const [resultado, setResultado] = useState(null)
  const [error,     setError]     = useState('')

  // Modo POS
  const [banco,       setBanco]       = useState('')
  const [cardType,    setCardType]    = useState('VISA')
  const [propiaRed,   setPropiaRed]   = useState('VISA')
  const [montoPuntos, setMontoPuntos] = useState('')

  // Modo Tarjeta
  const [cardBanco, setCardBanco] = useState('')
  const [cardRed,   setCardRed]   = useState('VISA')

  // Derivados compartidos
  const isPuntos = plan === 'puntos'
  const cuotas   = isPuntos ? 1 : parseInt(plan) || 1
  const isTasa0  = !isPuntos && cuotas > 1

  // Derivados modo POS
  const planOptions        = getPlanOptions(banco, config)
  const isPropia           = cardType === 'PROPIA'
  const showTarjeta        = plan !== '' && !isPuntos
  const availableCardTypes = plan === '1'
    ? CARD_TYPES.filter(ct => config?.oneCuota[banco]?.[ct.id]?.enabled)
    : CARD_TYPES
  const cardLabel = plan === '1' ? CARD_TYPES.find(c => c.id === cardType)?.label : null

  // Derivados modo Tarjeta
  const planOptionsByCard = getPlanOptionsByCard(cardBanco, config)

  function limpiar() {
    setPlan(''); setMonto(''); setResultado(null); setError('')
    setBanco(''); setCardType('VISA'); setPropiaRed('VISA'); setMontoPuntos('')
    setCardBanco(''); setCardRed('VISA')
  }

  function onModeChange(m) { setMode(m); limpiar() }
  function onBancoChange(v)     { setBanco(v);     setPlan(''); setMonto(''); setMontoPuntos(''); setResultado(null); setError('') }
  function onCardBancoChange(v) { setCardBanco(v); setPlan(''); setMonto(''); setResultado(null); setError('') }
  function onPlanChange(v)      { setPlan(v);      setMonto(''); setMontoPuntos(''); setResultado(null); setError('') }

  async function handleAdminSave(newCfg) {
    await saveConfig(newCfg)
    setConfig(newCfg)
    limpiar()
    setPage('main')
  }

  function calcular() {
    setError('')
    const m  = parseFloat(monto)      || 0
    const mP = parseFloat(montoPuntos) || 0

    if (mode === 'pos') {
      if (!banco) { setError('Seleccione un banco POS.'); return }
      if (!plan)  { setError('Seleccione un plan de pago.'); return }
      if (showTarjeta && m  <= 0) { setError('Ingrese el monto a financiar con tarjeta.'); return }
      if (isPuntos    && mP <= 0) { setError('Ingrese el monto a financiar con puntos.');  return }

      let tarjetaResult = null
      let puntosResult  = null
      if (showTarjeta) {
        const cell = cuotas === 1 ? config.oneCuota[banco][cardType] : config.tasa0[banco][cuotas]
        const base = calcularCargo(m, cell.rate)
        tarjetaResult = { ...base, cuotas, valorPorCuota: isTasa0 ? base.totalACobrar / cuotas : null }
      }
      if (isPuntos) {
        puntosResult = calcularCargo(mP, config.puntos[banco].rate)
      }
      setResultado({ tarjetaResult, puntosResult })

    } else {
      if (!cardBanco) { setError('Seleccione el banco emisor de la tarjeta.'); return }
      if (!plan)      { setError('Seleccione un plan de pago.'); return }
      if (m <= 0)     { setError('Ingrese el monto a financiar.'); return }

      if (plan === '1') {
        setResultado({ tipo: '1cuota', monto: m })
      } else if (isTasa0) {
        const cell = config.tasa0[cardBanco][cuotas]
        const base = calcularCargo(m, cell.rate)
        setResultado({ tipo: 'tasa0', tarjetaResult: { ...base, cuotas, valorPorCuota: base.totalACobrar / cuotas } })
      } else if (isPuntos) {
        setResultado({ tipo: 'puntos', puntosResult: calcularCargo(m, config.puntos[cardBanco].rate) })
      }
    }
  }

  // Comparativos
  const mVal = parseFloat(monto) || 0
  const usaComparativoPropia = mode === 'pos' && resultado?.tarjetaResult && !isTasa0 && isPropia

  const comparativoPOS = (() => {
    if (mode !== 'pos' || !resultado?.tarjetaResult || isTasa0) return []
    if (usaComparativoPropia) return getComparativoPropiaVsOtro(banco, propiaRed, mVal, config)
    return getComparativoTarjeta(cuotas, cardType, mVal, config)
  })()

  const comparativoTarjeta = (() => {
    if (mode !== 'tarjeta' || resultado?.tipo !== '1cuota') return []
    return getComparativoByCard(cardBanco, cardRed, resultado.monto, config)
  })()

  const tituloPOS = isTasa0
    ? `Comparativo Tasa 0 — ${cuotas} Cuotas`
    : isPropia
      ? `TC Propia ${propiaRed} vs TC Otro Banco`
      : `Comparativo 1 Cuota — ${cardLabel}`

  // ── Renders ────────────────────────────────────────────────────────────────

  if (configLoading) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center text-muted">
          <div className="spinner-border mb-3" role="status"></div>
          <p className="mb-0">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  if (page === 'admin') {
    return <AdminPanel config={config} onSave={handleAdminSave} onBack={() => setPage('main')} />
  }

  const canCalcular = mode === 'pos' ? (!!banco && !!plan) : (!!cardBanco && !!plan)

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-dark bg-primary shadow-sm">
        <div className="container-lg d-flex align-items-center w-100">
          <a href="http://192.168.1.77/alfaplus/admin/dashboard" className="btn btn-outline-light btn-sm me-3">
            Alfa PLUS
          </a>
          <span className="navbar-brand fw-bold fs-5 me-auto">
            <i className="bi bi-credit-card-2-front me-2"></i>Cotizador de Tarjetas
          </span>
          <button className="btn btn-outline-light btn-sm" onClick={() => setPage('admin')}>
            <i className="bi bi-gear-fill me-1"></i>Admin
          </button>
        </div>
      </nav>

      <div className="container-lg py-4">
        <div className="row g-4 align-items-start">

          {/* ── Formulario ── */}
          <div className="col-lg-5">
            <div className="card shadow-sm">
              <div className="card-header bg-white border-bottom py-3">
                <h6 className="mb-0 fw-semibold text-secondary text-uppercase" style={{ letterSpacing: '0.05em' }}>
                  <i className="bi bi-pencil-square me-2"></i>Datos de Cotización
                </h6>
              </div>
              <div className="card-body p-4">

                {/* Toggle */}
                <div className="btn-group w-100 mb-4" role="group">
                  <button type="button"
                    className={`btn ${mode === 'pos' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => onModeChange('pos')}>
                    <i className="bi bi-terminal me-1"></i>Por POS
                  </button>
                  <button type="button"
                    className={`btn ${mode === 'tarjeta' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => onModeChange('tarjeta')}>
                    <i className="bi bi-credit-card me-1"></i>Por Tarjeta
                  </button>
                </div>

                {/* ── Campos modo POS ── */}
                {mode === 'pos' && (<>
                  <div className="mb-3">
                    <label className="form-label fw-medium">Banco / POS</label>
                    <select className="form-select" value={banco} onChange={e => onBancoChange(e.target.value)}>
                      <option value="">— Seleccione banco —</option>
                      {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">Plan de Pago</label>
                    <select className="form-select" value={plan} onChange={e => onPlanChange(e.target.value)} disabled={!banco}>
                      {planOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  {plan === '1' && (<>
                    <div className="mb-3">
                      <label className="form-label fw-medium">Tipo de Tarjeta</label>
                      <select className="form-select" value={cardType} onChange={e => { setCardType(e.target.value); setResultado(null) }}>
                        {availableCardTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.label}</option>)}
                      </select>
                      {banco && <div className="form-text">Tasa: <strong>{fmtPct(config.oneCuota[banco]?.[cardType]?.rate ?? 0)}</strong> + IVA</div>}
                    </div>

                    {isPropia && (
                      <div className="mb-3">
                        <label className="form-label fw-medium">Red de TC Propia</label>
                        <div className="btn-group w-100" role="group">
                          <button type="button" className={`btn ${propiaRed === 'VISA' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setPropiaRed('VISA'); setResultado(null) }}>Visa</button>
                          <button type="button" className={`btn ${propiaRed === 'MC'   ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setPropiaRed('MC');   setResultado(null) }}>Mastercard</button>
                        </div>
                      </div>
                    )}
                  </>)}

                  {showTarjeta && (
                    <div className="mb-3">
                      <label className="form-label fw-medium">Monto a Financiar con Tarjeta</label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input type="number" className="form-control" placeholder="0.00" min="0" step="0.01"
                          value={monto} onChange={e => { setMonto(e.target.value); setResultado(null) }} />
                      </div>
                    </div>
                  )}

                  {isPuntos && (
                    <div className="mb-3">
                      <label className="form-label fw-medium">
                        Monto a Financiar con Puntos
                        <span className="badge bg-warning text-dark ms-2 fw-normal">{fmtPct(config.puntos[banco]?.rate ?? 0)} + IVA</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input type="number" className="form-control" placeholder="0.00" min="0" step="0.01"
                          value={montoPuntos} onChange={e => { setMontoPuntos(e.target.value); setResultado(null) }} />
                      </div>
                    </div>
                  )}
                </>)}

                {/* ── Campos modo Tarjeta ── */}
                {mode === 'tarjeta' && (<>
                  <div className="mb-3">
                    <label className="form-label fw-medium">Banco emisor de la tarjeta</label>
                    <select className="form-select" value={cardBanco} onChange={e => onCardBancoChange(e.target.value)}>
                      <option value="">— Seleccione banco —</option>
                      {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">Red de la tarjeta</label>
                    <div className="btn-group w-100" role="group">
                      <button type="button" className={`btn ${cardRed === 'VISA' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setCardRed('VISA'); setResultado(null) }}>Visa</button>
                      <button type="button" className={`btn ${cardRed === 'MC'   ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setCardRed('MC');   setResultado(null) }}>Mastercard</button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">Plan de Pago</label>
                    <select className="form-select" value={plan} onChange={e => onPlanChange(e.target.value)} disabled={!cardBanco}>
                      {planOptionsByCard.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  {plan !== '' && (
                    <div className="mb-3">
                      <label className="form-label fw-medium">Monto a Financiar</label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input type="number" className="form-control" placeholder="0.00" min="0" step="0.01"
                          value={monto} onChange={e => { setMonto(e.target.value); setResultado(null) }} />
                      </div>
                    </div>
                  )}
                </>)}

                {error && (
                  <div className="alert alert-danger py-2 mb-3">
                    <i className="bi bi-exclamation-triangle me-2"></i>{error}
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button className="btn btn-primary fw-semibold py-2 flex-grow-1" onClick={calcular} disabled={!canCalcular}>
                    <i className="bi bi-calculator me-2"></i>Calcular
                  </button>
                  <button className="btn btn-outline-secondary py-2" onClick={limpiar} title="Limpiar formulario">
                    <i className="bi bi-arrow-counterclockwise"></i>
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* ── Resultados ── */}
          <div className="col-lg-7">
            {resultado ? (
              <div className="d-flex flex-column gap-3">

                {/* POS */}
                {mode === 'pos' && (<>
                  {resultado.tarjetaResult && (
                    <ResultCard
                      title={isTasa0 ? `Tasa 0 — ${cuotas} Cuotas` : '1 Cuota'}
                      icon={isTasa0 ? 'bi-calendar-check' : 'bi-credit-card'}
                      colorClass="primary"
                      result={resultado.tarjetaResult}
                      banco={banco}
                      cardLabel={cardLabel}
                    />
                  )}
                  {resultado.puntosResult && (
                    <ResultCard
                      title="Compra con Puntos"
                      icon="bi-star-fill"
                      colorClass="warning"
                      result={resultado.puntosResult}
                      banco={banco}
                      cardLabel={null}
                    />
                  )}
                  {comparativoPOS.length > 1 && (
                    <ComparativoCard
                      titulo={tituloPOS}
                      filas={comparativoPOS}
                      bancoMarcado={banco}
                      marcaLabel="Seleccionado"
                      marcaBadge="bg-primary"
                      showCuota={false}
                      cuotas={1}
                    />
                  )}
                </>)}

                {/* Tarjeta */}
                {mode === 'tarjeta' && (<>
                  {resultado.tipo === '1cuota' && comparativoTarjeta.length > 0 && (
                    <ComparativoCard
                      titulo={`Mejores POS — Tarjeta ${cardBanco} ${cardRed} — 1 Cuota`}
                      filas={comparativoTarjeta}
                      bancoMarcado={cardBanco}
                      marcaLabel="TC Propia"
                      marcaBadge="bg-success"
                      showCuota={false}
                      cuotas={1}
                    />
                  )}
                  {resultado.tipo === 'tasa0' && resultado.tarjetaResult && (
                    <ResultCard
                      title={`Tasa 0 — ${cuotas} Cuotas`}
                      icon="bi-calendar-check"
                      colorClass="primary"
                      result={resultado.tarjetaResult}
                      banco={cardBanco}
                      cardLabel={null}
                    />
                  )}
                  {resultado.tipo === 'puntos' && resultado.puntosResult && (
                    <ResultCard
                      title="Compra con Puntos"
                      icon="bi-star-fill"
                      colorClass="warning"
                      result={resultado.puntosResult}
                      banco={cardBanco}
                      cardLabel={null}
                    />
                  )}
                </>)}

              </div>
            ) : (
              <div className="card shadow-sm">
                <div className="card-body text-center text-muted py-5">
                  <i className="bi bi-receipt fs-1 d-block mb-3 opacity-25"></i>
                  <p className="mb-0">Complete el formulario y presione <strong>Calcular</strong></p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Componentes ───────────────────────────────────────────────────────────────

function ResultCard({ title, icon, colorClass, result, banco, cardLabel }) {
  const isWarning = colorClass === 'warning'
  return (
    <div className="card shadow-sm">
      <div className={`card-header bg-${colorClass} ${isWarning ? 'text-dark' : 'text-white'} d-flex align-items-center py-3`}>
        <i className={`bi ${icon} me-2`}></i>
        <span className="fw-semibold">{title}</span>
        <span className={`ms-auto badge ${isWarning ? 'bg-dark' : 'bg-white text-primary'}`}>{banco}</span>
      </div>
      <div className="card-body p-4">
        <div className="d-flex flex-column gap-1">
          <Row label="Monto Financiado"                                value={fmt(result.monto)} />
          {cardLabel && <Row label="Tipo de Tarjeta"                  value={cardLabel} />}
          <Row label="Tasa Aplicada"                                   value={fmtPct(result.tasa)} />
          <Row label="Cargo por Tasa"                                  value={fmt(result.cargo)} />
          <Row label={`IVA (${(IVA * 100).toFixed(0)}%) sobre cargo`} value={fmt(result.ivaCargo)} />
          <hr className="my-2" />
          <Row label="Valor Financiero"                                value={fmt(result.valorFinanciero)} />
          <Row label="Total a Cobrar"                                  value={fmt(result.totalACobrar)} bold highlight />
          {result.valorPorCuota != null && (
            <Row label={`Valor por Cuota (${result.cuotas} pagos)`}   value={fmt(result.valorPorCuota)} bold highlight />
          )}
        </div>
      </div>
    </div>
  )
}

function ComparativoCard({ titulo, filas, bancoMarcado, marcaLabel, marcaBadge, showCuota, cuotas }) {
  const mejorVF = filas[0]?.valorFinanciero
  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white border-bottom py-3">
        <h6 className="mb-0 fw-semibold text-secondary text-uppercase" style={{ letterSpacing: '0.05em', fontSize: '0.75rem' }}>
          <i className="bi bi-bar-chart-line me-2"></i>{titulo}
        </h6>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th className="ps-3" style={{ width: '2rem' }}>#</th>
                <th>Banco POS</th>
                <th className="text-end">Tasa</th>
                <th className="text-end">Valor Financiero</th>
                <th className={`text-end ${!showCuota ? 'pe-3' : ''}`}>Total a Cobrar</th>
                {showCuota && <th className="text-end pe-3">Por Cuota</th>}
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => {
                const esMejor   = i === 0 && f.valorFinanciero === mejorVF
                const esMarcado = f.banco === bancoMarcado
                return (
                  <tr key={f.banco} className={esMejor ? 'table-success' : esMarcado ? 'table-warning' : ''}>
                    <td className="ps-3 fw-semibold text-muted">{i + 1}</td>
                    <td>
                      <span className="fw-medium">{f.banco}</span>
                      {esMejor   && <span className="badge bg-success ms-2" style={{ fontSize: '0.65rem' }}>Mejor opción</span>}
                      {esMarcado && <span className={`badge ${marcaBadge} ms-2`} style={{ fontSize: '0.65rem' }}>{marcaLabel}</span>}
                    </td>
                    <td className="text-end">{fmtPct(f.tasa)}</td>
                    <td className="text-end fw-medium">{fmt(f.valorFinanciero)}</td>
                    <td className={`text-end fw-semibold ${!showCuota ? 'pe-3' : ''}`}>{fmt(f.totalACobrar)}</td>
                    {showCuota && <td className="text-end pe-3 fw-semibold text-success">{fmt(f.totalACobrar / cuotas)}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold, highlight }) {
  return (
    <div className={`d-flex justify-content-between align-items-center px-2 py-1 rounded ${highlight ? 'bg-light' : ''}`}>
      <span className={bold ? 'fw-semibold' : 'text-muted'}>{label}</span>
      <span className={bold ? 'fw-bold fs-5 text-success' : 'fw-medium'}>{value}</span>
    </div>
  )
}
