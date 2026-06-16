const express = require('express')
const fs      = require('fs')
const path    = require('path')

const app         = express()
const DATA_DIR    = path.join(__dirname, 'data')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const DIST        = path.join(__dirname, 'dist')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

app.use(express.json())

// Serve built frontend
app.use(express.static(DIST))

// GET /api/config — return saved config or null (client uses default)
app.get('/api/config', (req, res) => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      res.json(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')))
    } else {
      res.json(null)
    }
  } catch {
    res.json(null)
  }
})

// POST /api/config — save config to file
app.post('/api/config', (req, res) => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(req.body, null, 2))
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'No se pudo guardar la configuración.' })
  }
})

// SPA fallback — all other routes return index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'))
})

const PORT = process.env.PORT || 2525
app.listen(PORT, () => {
  console.log(`Cotizador corriendo en http://localhost:${PORT}`)
})
