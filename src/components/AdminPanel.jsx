import { useState } from 'react'
import { BANCOS, CUOTAS_TASA0 } from '../data/rates'
import { buildDefaultConfig, ADMIN_CODE } from '../data/adminConfig'

export default function AdminPanel({ config, onSave, onBack }) {
  const [code,      setCode]      = useState('')
  const [loggedIn,  setLoggedIn]  = useState(false)
  const [codeError, setCodeError] = useState(false)
  const [activeTab, setActiveTab] = useState('oneCuota')
  const [draft,     setDraft]     = useState(() => JSON.parse(JSON.stringify(config)))

  function handleLogin(e) {
    e.preventDefault()
    if (code === ADMIN_CODE) { setLoggedIn(true); setCodeError(false) }
    else setCodeError(true)
  }

  function setOneCuota(banco, ct, field, value) {
    setDraft(prev => ({
      ...prev,
      oneCuota: {
        ...prev.oneCuota,
        [banco]: { ...prev.oneCuota[banco], [ct]: { ...prev.oneCuota[banco][ct], [field]: value } }
      }
    }))
  }

  function setTasa0(banco, cuota, field, value) {
    setDraft(prev => ({
      ...prev,
      tasa0: {
        ...prev.tasa0,
        [banco]: { ...prev.tasa0[banco], [cuota]: { ...prev.tasa0[banco][cuota], [field]: value } }
      }
    }))
  }

  function setPuntos(banco, field, value) {
    setDraft(prev => ({
      ...prev,
      puntos: { ...prev.puntos, [banco]: { ...prev.puntos[banco], [field]: value } }
    }))
  }

  function resetDefault() {
    if (window.confirm('¿Restaurar todos los valores por defecto?')) setDraft(buildDefaultConfig())
  }

  const TABS = [
    { id: 'oneCuota', label: '1 Cuota' },
    { id: 'tasa0',    label: 'Tasa 0'  },
    { id: 'puntos',   label: 'Puntos'  },
  ]

  return (
    <div className="min-vh-100 bg-light">
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-dark shadow-sm">
        <div className="container-lg d-flex align-items-center w-100">
          <button className="btn btn-outline-light btn-sm me-3" onClick={onBack}>
            <i className="bi bi-arrow-left me-1"></i>Volver
          </button>
          <span className="navbar-brand fw-bold fs-5 mb-0">
            <i className="bi bi-shield-lock-fill me-2"></i>
            {loggedIn ? 'Panel de Administración' : 'Acceso Restringido'}
          </span>
        </div>
      </nav>

      <div className="container-lg py-4">

        {/* Login */}
        {!loggedIn && (
          <div className="row justify-content-center">
            <div className="col-sm-8 col-md-5 col-lg-4">
              <div className="card shadow-sm">
                <div className="card-body p-4">
                  <h5 className="card-title fw-semibold mb-4 text-center">
                    <i className="bi bi-lock-fill me-2 text-secondary"></i>Ingrese el código
                  </h5>
                  <form onSubmit={handleLogin} autoComplete="off">
                    <div className="mb-3">
                      <input
                        type="password"
                        className={`form-control form-control-lg text-center ${codeError ? 'is-invalid' : ''}`}
                        value={code}
                        onChange={e => { setCode(e.target.value); setCodeError(false) }}
                        autoFocus
                        placeholder="••••"
                        autoComplete="off"
                        data-form-type="other"
                      />
                      {codeError && <div className="invalid-feedback text-center">Código incorrecto.</div>}
                    </div>
                    <button className="btn btn-dark w-100 fw-semibold" type="submit">
                      <i className="bi bi-box-arrow-in-right me-2"></i>Ingresar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Panel */}
        {loggedIn && (
          <div className="card shadow-sm">
            {/* Tabs */}
            <div className="card-header bg-white">
              <ul className="nav nav-tabs card-header-tabs">
                {TABS.map(t => (
                  <li key={t.id} className="nav-item">
                    <button
                      className={`nav-link ${activeTab === t.id ? 'active fw-semibold' : ''}`}
                      onClick={() => setActiveTab(t.id)}
                    >
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-body p-3">
              {activeTab === 'oneCuota' && <OneCuotaTab draft={draft} set={setOneCuota} />}
              {activeTab === 'tasa0'    && <Tasa0Tab    draft={draft} set={setTasa0}    />}
              {activeTab === 'puntos'   && <PuntosTab   draft={draft} set={setPuntos}   />}
            </div>

            <div className="card-footer d-flex gap-2 justify-content-between align-items-center">
              <button className="btn btn-outline-danger btn-sm" onClick={resetDefault}>
                <i className="bi bi-arrow-counterclockwise me-1"></i>Restaurar defaults
              </button>
              <div className="d-flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={onBack}>Cancelar</button>
                <button className="btn btn-success btn-sm fw-semibold" onClick={() => { onSave(draft); onBack() }}>
                  <i className="bi bi-floppy me-1"></i>Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <div className="form-check form-switch d-flex justify-content-center mb-0">
      <input
        className="form-check-input"
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
    </div>
  )
}

function RateInput({ value, disabled, onChange }) {
  return (
    <input
      type="number"
      className="form-control form-control-sm text-center px-1"
      style={{ width: '70px', minWidth: '60px' }}
      value={value}
      min="0"
      step="0.01"
      disabled={disabled}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
    />
  )
}

function OneCuotaTab({ draft, set }) {
  const CTS = [
    { id: 'VISA',   label: 'TC Otro Banco Visa' },
    { id: 'MC',     label: 'TC Otro Banco MC'   },
    { id: 'PROPIA', label: 'TC Propia'           },
  ]
  return (
    <div className="table-responsive">
      <table className="table table-bordered table-sm align-middle text-center mb-0">
        <thead>
          <tr className="table-dark">
            <th className="text-start" style={{ minWidth: '110px' }}>Banco</th>
            {CTS.map(ct => <th key={ct.id} colSpan={2}>{ct.label}</th>)}
          </tr>
          <tr className="table-secondary small">
            <th></th>
            {CTS.map(ct => [
              <th key={`${ct.id}-a`}>Activo</th>,
              <th key={`${ct.id}-t`}>Tasa %</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {BANCOS.map(b => (
            <tr key={b}>
              <td className="text-start fw-medium">{b}</td>
              {['VISA', 'MC', 'PROPIA'].map(ct => {
                const cell = draft.oneCuota[b][ct]
                return [
                  <td key={`${ct}-e`}><Toggle checked={cell.enabled} onChange={v => set(b, ct, 'enabled', v)} /></td>,
                  <td key={`${ct}-r`}><RateInput value={cell.rate} disabled={!cell.enabled} onChange={v => set(b, ct, 'rate', v)} /></td>,
                ]
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Tasa0Tab({ draft, set }) {
  return (
    <div className="table-responsive">
      <table className="table table-bordered table-sm align-middle text-center mb-0">
        <thead>
          <tr className="table-dark">
            <th className="text-start" style={{ minWidth: '110px' }}>Banco</th>
            {CUOTAS_TASA0.map(c => <th key={c} colSpan={2}>{c}C</th>)}
          </tr>
          <tr className="table-secondary small">
            <th></th>
            {CUOTAS_TASA0.map(c => [
              <th key={`${c}-a`}>On</th>,
              <th key={`${c}-t`}>%</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {BANCOS.map(b => (
            <tr key={b}>
              <td className="text-start fw-medium">{b}</td>
              {CUOTAS_TASA0.map(c => {
                const cell = draft.tasa0[b][c]
                return [
                  <td key={`${c}-e`}><Toggle checked={cell.enabled} onChange={v => set(b, c, 'enabled', v)} /></td>,
                  <td key={`${c}-r`}><RateInput value={cell.rate} disabled={!cell.enabled} onChange={v => set(b, c, 'rate', v)} /></td>,
                ]
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PuntosTab({ draft, set }) {
  return (
    <div className="table-responsive">
      <table className="table table-bordered table-sm align-middle text-center mb-0" style={{ maxWidth: '350px' }}>
        <thead>
          <tr className="table-dark">
            <th className="text-start">Banco</th>
            <th>Activo</th>
            <th>Tasa %</th>
          </tr>
        </thead>
        <tbody>
          {BANCOS.map(b => {
            const cell = draft.puntos[b]
            return (
              <tr key={b}>
                <td className="text-start fw-medium">{b}</td>
                <td><Toggle checked={cell.enabled} onChange={v => set(b, 'enabled', v)} /></td>
                <td><RateInput value={cell.rate} disabled={!cell.enabled} onChange={v => set(b, 'rate', v)} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
