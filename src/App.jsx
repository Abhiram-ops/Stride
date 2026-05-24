import { useState, useEffect } from 'react'

/* ─── CONFIG ──────────────────────────────────────────── */
const EXAM_DATE = new Date('2026-06-07T00:00:00')

const MODULES = [
  { id: 'listening',  name: 'Listening',  icon: '🎧', color: '#60a5fa', target: 7   },
  { id: 'reading',    name: 'Reading',    icon: '📖', color: '#34d399', target: 7   },
  { id: 'writing',    name: 'Writing',    icon: '✍️',  color: '#fbbf24', target: 6.5 },
  { id: 'speaking',   name: 'Speaking',   icon: '🎙️', color: '#f472b6', target: 6.5 },
  { id: 'vocabulary', name: 'Vocabulary', icon: '💡', color: '#a78bfa', target: 7   },
  { id: 'grammar',    name: 'Grammar',    icon: '📐', color: '#2dd4bf', target: 7   },
]

const STORAGE_KEY = 'ielts_tracker_data'

/* ─── HELPERS ─────────────────────────────────────────── */
const getDays = () => Math.max(0, Math.ceil((EXAM_DATE - new Date()) / 86400000))
const todayStr = () => new Date().toISOString().slice(0, 10)
const getLatest = (arr) => arr.length ? arr[arr.length - 1].score : null
const scoreColor = (s) => s === null ? '#666' : s >= 7 ? '#34d399' : s >= 5.5 ? '#fbbf24' : '#f87171'
const initData = () => Object.fromEntries(MODULES.map(m => [m.id, []]))

const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initData()
    const parsed = JSON.parse(raw)
    const merged = initData()
    MODULES.forEach(m => { if (Array.isArray(parsed[m.id])) merged[m.id] = parsed[m.id] })
    return merged
  } catch { return initData() }
}

const saveData = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* storage full */ }
}

/* ─── STYLES (inline for portability) ────────────────── */
const inputStyle = {
  width: '100%', background: '#1d1d2e',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9,
  padding: '9px 11px', fontSize: 13, color: '#eae8f5',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle = {
  fontSize: 10, color: '#6b6888', textTransform: 'uppercase',
  letterSpacing: '.07em', display: 'block', marginBottom: 5,
}
const cardStyle = {
  background: '#13131f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
}
const sectionLabel = {
  fontSize: 11, color: '#6b6888', textTransform: 'uppercase',
  letterSpacing: '.12em', marginBottom: 12,
}

/* ══════════════════════════════════════════════════════
   APP
══════════════════════════════════════════════════════ */
export default function App() {
  const [data,    setData]   = useState(loadData)
  const [tab,     setTab]    = useState('dashboard')
  const [logMod,  setLogMod] = useState(null)
  const [score,   setScore]  = useState('')
  const [date,    setDate]   = useState(todayStr)
  const [qty,     setQty]    = useState('')
  const [mins,    setMins]   = useState('')
  const [notes,   setNotes]  = useState('')
  const [filter,  setFilter] = useState('all')
  const [days,    setDays]   = useState(getDays)
  const [toast,   setToast]  = useState(null)

  useEffect(() => {
    const tick = setInterval(() => setDays(getDays()), 60000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => { saveData(data) }, [data])

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const openLog = (mid) => {
    setLogMod(mid)
    setScore(''); setDate(todayStr()); setQty(''); setMins(''); setNotes('')
  }
  const closeLog = () => setLogMod(null)

  const saveSession = () => {
    const s = parseFloat(score)
    if (isNaN(s) || s < 0 || s > 9) { flash('⚠️ Enter a score between 0 and 9'); return }
    const entry = {
      date:  date || todayStr(),
      score: s,
      qty:   parseInt(qty)  || 0,
      time:  parseInt(mins) || 0,
      notes: notes.trim(),
    }
    setData(prev => {
      const arr = [...prev[logMod], entry].sort((a, b) => a.date.localeCompare(b.date))
      return { ...prev, [logMod]: arr }
    })
    closeLog()
    flash('✓ Session saved!')
  }

  const deleteSession = (mid, idx) => {
    setData(prev => ({ ...prev, [mid]: prev[mid].filter((_, i) => i !== idx) }))
    flash('Session deleted')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `ielts-data-${todayStr()}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        const merged = initData()
        MODULES.forEach(m => { if (Array.isArray(parsed[m.id])) merged[m.id] = parsed[m.id] })
        setData(merged)
        flash('✓ Data imported!')
      } catch { flash('⚠️ Invalid file') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  /* derived */
  const allScores = MODULES.map(m => getLatest(data[m.id])).filter(v => v !== null)
  const overall   = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null
  const totSess   = MODULES.reduce((a, m) => a + data[m.id].length, 0)
  const totQty    = MODULES.reduce((a, m) => a + data[m.id].reduce((b, s) => b + (s.qty || 0), 0), 0)
  const weakMods  = MODULES
    .filter(m => { const s = getLatest(data[m.id]); return s !== null && s < m.target })
    .sort((a, b) => getLatest(data[a.id]) / a.target - getLatest(data[b.id]) / b.target)

  const history  = MODULES.flatMap(m => data[m.id].map((s, i) => ({ ...s, mid: m.id, mod: m, idx: i })))
                          .sort((a, b) => b.date.localeCompare(a.date))
  const filtered = filter === 'all' ? history : history.filter(r => r.mid === filter)
  const activeMod = MODULES.find(m => m.id === logMod)

  return (
    <div style={{ background: '#0c0c14', minHeight: '100vh', color: '#eae8f5' }}>

      {/* ── TOP BAR ── */}
      <header style={{ background: '#0e0e17', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: '#6b6888', marginBottom: 3 }}>
            IELTS Prep Tracker
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            June 7, 2026{' '}
            <span style={{ color: days <= 5 ? '#fbbf24' : '#6b6888', fontWeight: 400 }}>· {days} days left</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Export / Import */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportData} title="Export data as JSON" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#aaa', cursor: 'pointer' }}>
              ↓ Export
            </button>
            <label title="Import data from JSON" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#aaa', cursor: 'pointer' }}>
              ↑ Import
              <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#6b6888', textTransform: 'uppercase', letterSpacing: '.08em' }}>Overall Band</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#a78bfa', lineHeight: 1.1 }}>
              {overall ? overall.toFixed(1) : '—'}
            </div>
          </div>
        </div>
      </header>

      {/* ── STAT STRIP ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: '#111119', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { v: days,    l: 'Days left',  c: days <= 5 ? '#fbbf24' : '#eae8f5' },
          { v: overall ? overall.toFixed(1) : '—', l: 'Band est.', c: '#a78bfa' },
          { v: totSess, l: 'Sessions',   c: '#eae8f5' },
          { v: totQty,  l: 'Questions',  c: '#eae8f5' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '10px 16px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: '#6b6888', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <nav style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0e0e17', padding: '0 16px' }}>
        {['dashboard', 'history', 'insights', 'plan', 'tips'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none', border: 'none', padding: '11px 16px', fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit',
            color: tab === t ? '#a78bfa' : '#6b6888',
            borderBottom: tab === t ? '2px solid #a78bfa' : '2px solid transparent',
            fontWeight: tab === t ? 600 : 400,
          }}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 80px' }}>

        {/* ════ DASHBOARD ════ */}
        {tab === 'dashboard' && (
          <>
            <p style={sectionLabel}>Modules — click + Log after each session on ielts-testpro.com</p>

            {/* Module cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginBottom: 16 }}>
              {MODULES.map(m => {
                const s    = getLatest(data[m.id])
                const arr  = data[m.id]
                const pct  = s !== null ? Math.min(100, (s / m.target) * 100) : 0
                const diff = arr.length >= 2 ? arr[arr.length - 1].score - arr[arr.length - 2].score : null
                const open = logMod === m.id
                return (
                  <div key={m.id} style={{ ...cardStyle, padding: '14px 16px', borderColor: open ? m.color + '55' : 'rgba(255,255,255,0.08)', transition: 'border-color .2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{m.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{m.name}</div>
                          <div style={{ fontSize: 11, color: '#6b6888' }}>target {m.target} · {arr.length} session{arr.length !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: scoreColor(s), lineHeight: 1 }}>
                        {s !== null ? s.toFixed(1) : '—'}
                      </div>
                    </div>

                    <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, marginBottom: 10 }}>
                      <div style={{ height: '100%', width: pct + '%', background: m.color, borderRadius: 3, transition: 'width .4s' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: diff === null ? '#6b6888' : diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : '#6b6888' }}>
                        {diff === null ? 'no trend yet'
                          : diff > 0 ? `↑ +${diff.toFixed(1)} last session`
                          : diff < 0 ? `↓ ${diff.toFixed(1)} last session`
                          : '→ same as last'}
                      </span>
                      <button onClick={() => open ? closeLog() : openLog(m.id)} style={{
                        background: open ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${open ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 8, padding: '5px 13px', fontSize: 12,
                        color: open ? '#a78bfa' : '#ccc', cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                        {open ? '✕ close' : '+ Log'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── LOG FORM ── */}
            {logMod && activeMod && (
              <div style={{ ...cardStyle, padding: '18px 20px', borderColor: activeMod.color + '44', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: activeMod.color, flexShrink: 0 }} />
                  <strong style={{ fontSize: 15 }}>{activeMod.icon} Log session · {activeMod.name}</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Score (0–9)</label>
                    <input type="number" placeholder="e.g. 6.5" min="0" max="9" step="0.5"
                      value={score} onChange={e => setScore(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Questions done</label>
                    <input type="number" placeholder="e.g. 40" min="0"
                      value={qty} onChange={e => setQty(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Time (mins)</label>
                    <input type="number" placeholder="e.g. 45" min="0"
                      value={mins} onChange={e => setMins(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Notes — what was hard?</label>
                    <textarea rows={3} placeholder="e.g. struggled with inference questions, ran out of time on task 2…"
                      value={notes} onChange={e => setNotes(e.target.value)}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={saveSession} style={{ background: '#a78bfa', color: '#0c0c14', border: 'none', borderRadius: 9, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Save session
                  </button>
                  <button onClick={closeLog} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#6b6888', borderRadius: 9, padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── TREND CHART ── */}
            {totSess > 0 && <TrendChart data={data} />}

            {/* ── FOCUS AREAS ── */}
            <p style={{ ...sectionLabel, marginTop: 24 }}>Focus areas</p>
            {weakMods.length === 0 ? (
              <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: '#6b6888' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{totSess > 0 ? '🎯' : '📋'}</div>
                {totSess > 0 ? 'All modules on target — great work!' : 'Log your first session to see focus areas'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
                {weakMods.map(m => {
                  const s  = getLatest(data[m.id])
                  const fg = s < 5 ? '#f87171' : s < 6 ? '#fbbf24' : '#a78bfa'
                  return (
                    <div key={m.id} style={{ ...cardStyle, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 10, background: fg + '18', color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                        {s.toFixed(1)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.icon} {m.name}</div>
                        <div style={{ fontSize: 11, color: '#6b6888', marginTop: 2 }}>
                          {(m.target - s).toFixed(1)} below target · {Math.round((s / m.target) * 100)}% there
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ════ HISTORY ════ */}
        {tab === 'history' && (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {['all', ...MODULES.map(m => m.id)].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  background: filter === f ? 'rgba(167,139,250,0.12)' : 'transparent',
                  border: `1px solid ${filter === f ? 'rgba(167,139,250,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  color: filter === f ? '#a78bfa' : '#6b6888',
                  borderRadius: 20, padding: '4px 13px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {f === 'all' ? 'All' : MODULES.find(m => m.id === f)?.name}
                </button>
              ))}
            </div>

            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#6b6888' }}>
                  No sessions yet — go to Dashboard and tap + Log
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        {['Date', 'Module', 'Score', 'Questions', 'Time', 'Notes', ''].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 10, color: '#6b6888', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px 12px', color: '#6b6888', fontSize: 12 }}>{r.date}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ background: r.mod.color + '20', color: r.mod.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {r.mod.icon} {r.mod.name}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: scoreColor(r.score) }}>{r.score.toFixed(1)}</td>
                          <td style={{ padding: '8px 12px', color: '#6b6888' }}>{r.qty || '—'}</td>
                          <td style={{ padding: '8px 12px', color: '#6b6888' }}>{r.time ? r.time + 'm' : '—'}</td>
                          <td style={{ padding: '8px 12px', color: '#6b6888', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.notes}>{r.notes || '—'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <button onClick={() => deleteSession(r.mid, r.idx)} title="Delete session" style={{ background: 'none', border: 'none', color: '#f8717155', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════ INSIGHTS ════ */}
        {tab === 'insights' && <Insights data={data} overall={overall} days={days} />}
        {tab === 'plan' && <Plan />}
        {tab === 'tips' && <Tips />}

      </main>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, background: '#1d1d2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 18px', fontSize: 13, boxShadow: '0 8px 30px rgba(0,0,0,0.6)', color: '#eae8f5' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TREND CHART (SVG — no chart library needed)
══════════════════════════════════════════════════════ */
function TrendChart({ data }) {
  const allDates = [...new Set(MODULES.flatMap(m => data[m.id].map(s => s.date)))].sort().slice(-12)
  if (allDates.length < 1) return null

  const W = 620, H = 180
  const P = { t: 12, r: 10, b: 28, l: 28 }
  const cW = W - P.l - P.r
  const cH = H - P.t - P.b
  const xStep = allDates.length > 1 ? cW / (allDates.length - 1) : 0

  return (
    <div>
      <p style={{ ...sectionLabel, marginTop: 24 }}>Score trend</p>
      <div style={{ ...cardStyle, padding: 16, overflowX: 'auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginBottom: 12 }}>
          {MODULES.filter(m => data[m.id].length > 0).map(m => (
            <span key={m.id} style={{ fontSize: 11, color: m.color, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: m.color, display: 'inline-block' }} />
              {m.name}
            </span>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 280 }} aria-label="Score trend chart">
          {[0, 3, 6, 9].map(v => {
            const y = P.t + cH - (v / 9) * cH
            return (
              <g key={v}>
                <line x1={P.l} x2={P.l + cW} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                <text x={P.l - 5} y={y + 4} fill="#6b6888" fontSize={9} textAnchor="end">{v}</text>
              </g>
            )
          })}
          {allDates.map((d, i) => (
            <text key={d} x={P.l + i * xStep} y={H - 4} fill="#6b6888" fontSize={9} textAnchor="middle">{d.slice(5)}</text>
          ))}
          {MODULES.map(m => {
            let path = '', lastOk = false
            const dots = []
            allDates.forEach((dt, i) => {
              const s = data[m.id].find(x => x.date === dt)
              if (s) {
                const px = (P.l + i * xStep).toFixed(1)
                const py = (P.t + cH - (s.score / 9) * cH).toFixed(1)
                path += lastOk ? ` L${px},${py}` : `M${px},${py}`
                dots.push({ x: parseFloat(px), y: parseFloat(py) })
                lastOk = true
              } else { lastOk = false }
            })
            if (!dots.length) return null
            return (
              <g key={m.id}>
                <path d={path} fill="none" stroke={m.color} strokeWidth={2} strokeLinejoin="round" />
                {dots.map((pt, j) => <circle key={j} cx={pt.x} cy={pt.y} r={3.5} fill={m.color} />)}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   INSIGHTS TAB
══════════════════════════════════════════════════════ */
function Insights({ data, overall, days }) {
  const totalTime = MODULES.reduce((a, m) => a + data[m.id].reduce((b, s) => b + (s.time || 0), 0), 0)
  const allSess   = MODULES.flatMap(m => data[m.id].map(s => ({ ...s, mn: m.name })))
  const best      = [...allSess].sort((a, b) => b.score - a.score)[0]

  const tip = days <= 3  ? '🔥 Exam is almost here! Focus only on your weakest module.'
            : days <= 7  ? '⚡ Final stretch — do a full timed mock test today.'
            : days <= 14 ? '📈 Good time to drill weak spots with timed practice.'
                         : '📚 Steady prep wins. Aim for 2–3 sessions per module this week.'

  const statsCards = [
    { l: 'Overall band',    v: overall ? overall.toFixed(1) : '—', c: '#a78bfa' },
    { l: 'Days remaining',  v: days, c: days <= 5 ? '#fbbf24' : '#eae8f5' },
    { l: 'Total study time', v: totalTime ? `${Math.floor(totalTime / 60)}h ${totalTime % 60}m` : '—', c: '#34d399' },
    { l: 'Best session',    v: best ? `${best.score.toFixed(1)} · ${best.mn}` : '—', c: '#60a5fa' },
  ]

  return (
    <>
      <div style={{ ...cardStyle, padding: '14px 16px', marginBottom: 16, borderColor: days <= 7 ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)', fontSize: 13 }}>
        {tip}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
        {statsCards.map((s, i) => (
          <div key={i} style={{ ...cardStyle, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#6b6888', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{s.l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <p style={sectionLabel}>Module averages</p>
      <div style={{ ...cardStyle, padding: 16 }}>
        {MODULES.map(m => {
          const arr = data[m.id]
          const avg = arr.length ? arr.reduce((a, b) => a + b.score, 0) / arr.length : null
          const pct = avg !== null ? Math.min(100, (avg / m.target) * 100) : 0
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                  <span>{m.name}</span>
                  <span style={{ color: avg !== null ? (avg >= m.target ? '#34d399' : '#fbbf24') : '#6b6888' }}>
                    {avg !== null ? avg.toFixed(1) : '—'} / {m.target}
                  </span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: pct + '%', background: m.color, borderRadius: 3, transition: 'width .4s' }} />
                </div>
                <div style={{ fontSize: 10, color: '#6b6888', marginTop: 3 }}>
                  {arr.length} session{arr.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════
   PLAN DATA
══════════════════════════════════════════════════════ */
const P1_DAYS = [
  {date:'May 21',day:'Wed',tasks:[
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Take a full diagnostic mock test — all 4 sections',time:'2h'},
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Start Google Cybersecurity course — complete Module 1',time:'1h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Review existing SOP draft — note what is missing',time:'30m'},
  ]},
  {date:'May 22',day:'Thu',tasks:[
    {tag:'Writing',color:'#fbbf24',bg:'rgba(251,191,36,0.12)',text:'Task 1 — Cambridge 14 graph/chart. 10m plan + 35m write. Compare with model answer word by word',time:'45m'},
    {tag:'Writing',color:'#fbbf24',bg:'rgba(251,191,36,0.12)',text:'Task 2 — Essay: 10m plan (PEEL) + 40m write + 10m self-review against 4 scoring criteria',time:'1h'},
    {tag:'Speaking',color:'#f472b6',bg:'rgba(244,114,182,0.12)',text:'Part 1: Record 5 answers, play back, improve. Part 2: Cue card 2 full mins. Part 3: 3-4 sentence answers',time:'1h'},
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Module 2: Security domains intro — light session only',time:'30m'},
  ]},
  {date:'May 23',day:'Fri',tasks:[
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Writing Task 1: One graph response, timed 20 mins',time:'45m'},
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Writing Task 2: One essay timed 40 mins, self-review',time:'1h 15m'},
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Module 3: Network security basics',time:'1h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Research 3 target universities — note requirements',time:'30m'},
  ]},
  {date:'May 24',day:'Sat',tasks:[
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Speaking: Record Parts 1, 2, 3. Listen back critically',time:'1h'},
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Vocabulary: Learn 20 academic words + use in sentences',time:'1h'},
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Finish week 1 of course — complete graded quiz',time:'1h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Draft "Why this university" paragraph for top choice',time:'30m'},
  ]},
  {date:'May 25',day:'Sun',tasks:[
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Rest day — re-read your writing mistakes only',time:'45m'},
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Catch up or review week 1 material',time:'1h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Revise SOP opening paragraph — strong hook',time:'30m'},
  ]},
  {date:'May 26',day:'Mon',tasks:[
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Full mock test 2 — Reading + Listening timed',time:'2h'},
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Module 4: Linux basics',time:'1h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Braindump all achievements for CV',time:'30m'},
  ]},
  {date:'May 27',day:'Tue',tasks:[
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Writing: Rewrite essays using feedback',time:'1h'},
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Grammar: Identify 3 weakest areas, drill them',time:'1h'},
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Module 5: SQL + databases intro',time:'1h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Polish CV — format, bullets, action verbs',time:'30m'},
  ]},
  {date:'May 28',day:'Wed',tasks:[
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Speaking mock — full 15 min session, record and score',time:'1h'},
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Reading: Skim and scan drills. Finish passage in 18 mins',time:'1h'},
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Week 2 start — continue course modules',time:'1h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Research scholarship deadlines for target universities',time:'30m'},
  ]},
  {date:'May 29',day:'Thu',tasks:[
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Full mock test 3 — Writing + Speaking recorded',time:'2h'},
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Graded quiz for week 2',time:'1h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'SOP body: write academic background paragraph',time:'30m'},
  ]},
  {date:'May 30',day:'Fri',tasks:[
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Final full mock — all 4 sections, exam conditions',time:'2h 45m'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Light work only — review SOP notes',time:'30m'},
  ]},
  {date:'May 31',day:'Sat',tasks:[
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Review mock results — list every weak point',time:'1h'},
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Targeted drill on weakest section only',time:'1h'},
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Course modules — keep momentum',time:'1h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'SOP: write career goals paragraph',time:'30m'},
  ]},
  {date:'June 1',day:'Mon',tasks:[
    {tag:'Writing',color:'#fbbf24',bg:'rgba(251,191,36,0.12)',text:'Task 2 full essay — Cambridge 15 topic. Strict 50 mins total (10 plan + 40 write). Self-score against 4 criteria',time:'1h'},
    {tag:'Writing',color:'#fbbf24',bg:'rgba(251,191,36,0.12)',text:'Task 1 — bar chart or line graph. 20 mins timed. Compare with model answer, note vocabulary gaps',time:'30m'},
    {tag:'Speaking',color:'#f472b6',bg:'rgba(244,114,182,0.12)',text:'Part 2 cue card drill — 3 different topics, 2 mins each recorded. Play back and note filler words',time:'30m'},
  ]},
  {date:'June 2',day:'Tue',tasks:[
    {tag:'Writing',color:'#fbbf24',bg:'rgba(251,191,36,0.12)',text:'Task 2 rewrite — take your weakest essay so far and rewrite it from scratch using PEEL structure',time:'1h'},
    {tag:'Speaking',color:'#f472b6',bg:'rgba(244,114,182,0.12)',text:'Part 1 + Part 3 back to back — record full session, focus on extending every answer naturally',time:'45m'},
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Reading: 1 timed passage — Cambridge 16. Stay under 18 mins',time:'20m'},
  ]},
  {date:'June 3',day:'Wed',tasks:[
    {tag:'Writing',color:'#fbbf24',bg:'rgba(251,191,36,0.12)',text:'Full Writing section — Task 1 (20m) + Task 2 (40m) back to back, exam conditions. No breaks.',time:'1h'},
    {tag:'Speaking',color:'#f472b6',bg:'rgba(244,114,182,0.12)',text:'Full speaking mock — Parts 1, 2, 3 recorded. Score yourself on fluency, vocab, grammar, pronunciation',time:'45m'},
  ]},
  {date:'June 4',day:'Thu',tasks:[
    {tag:'Writing',color:'#fbbf24',bg:'rgba(251,191,36,0.12)',text:'Vocabulary drill — replace all weak words in your last essay. Reread examiner model answers from Cambridge 17',time:'45m'},
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Listening: 2 practice sets — note every mistake, do not skip the review',time:'45m'},
  ]},
  {date:'June 5',day:'Fri',tasks:[
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Final full mock — Cambridge 18, all 4 sections, strict exam conditions. Log score in Stride.',time:'2h 45m'},
  ]},
  {date:'June 6',day:'Sat',tasks:[
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'Exam eve — light review of your top 50 vocabulary words and 3 speaking topics only. Sleep by 10pm.',time:'30m'},
  ]},
  {date:'June 7',day:'Sat',tasks:[
    {tag:'IELTS',color:'#f87171',bg:'rgba(248,113,113,0.12)',text:'IELTS EXAM DAY — go get that 7+',time:'—'},
  ]},
]

const P2_DAYS = [
  {date:'June 8',day:'Sun',tasks:[
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Post-exam rest + catch up on cybersecurity modules',time:'2h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Braindump: finalise university list',time:'30m'},
  ]},
  {date:'June 9',day:'Mon',tasks:[
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Course modules — full focus now IELTS is done',time:'2h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Finalise university shortlist — max 5 targets',time:'1h 30m'},
  ]},
  {date:'June 10',day:'Tue',tasks:[
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Graded assessment + week 3 modules',time:'2h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'SOP full draft — all sections connected',time:'1h 30m'},
  ]},
  {date:'June 11',day:'Wed',tasks:[
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Security tools lab — hands-on practice',time:'2h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'CV final polish — get someone to review it',time:'1h 30m'},
  ]},
  {date:'June 12',day:'Thu',tasks:[
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Course modules — 1 module per day pace',time:'2h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'SOP revision — cut vague and filler sentences',time:'1h 30m'},
  ]},
  {date:'June 13',day:'Fri',tasks:[
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Week 3 quiz + review',time:'2h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Draft outreach email to professors if needed',time:'1h 30m'},
  ]},
  {date:'June 14',day:'Sat',tasks:[
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Catch-up day or advance to week 4',time:'2h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Set up application portal accounts',time:'1h 30m'},
  ]},
  {date:'June 15',day:'Sun',tasks:[
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Rest + light module review',time:'1h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Compile all documents — master checklist',time:'1h'},
  ]},
  {date:'June 16',day:'Mon',tasks:[
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Week 4 modules — final stretch',time:'2h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Submit first university application',time:'1h 30m'},
  ]},
  {date:'June 17',day:'Tue',tasks:[
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Course modules + graded quiz',time:'2h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Tailor SOP for university 2',time:'1h 30m'},
  ]},
  {date:'June 18',day:'Wed',tasks:[
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Final project or capstone if applicable',time:'2h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Submit university 2 application',time:'1h 30m'},
  ]},
  {date:'June 19',day:'Thu',tasks:[
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Course completion — final exam',time:'2h'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Apply to remaining universities',time:'1h 30m'},
  ]},
  {date:'June 20',day:'Fri',tasks:[
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Download and save certificate',time:'30m'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Final review of all applications submitted',time:'1h'},
  ]},
  {date:'June 21',day:'Sat',tasks:[
    {tag:'Cyber',color:'#34d399',bg:'rgba(52,211,153,0.12)',text:'Course done — add to LinkedIn and CV',time:'—'},
    {tag:'Uni',color:'#a78bfa',bg:'rgba(167,139,250,0.12)',text:'Profile complete — all applications in',time:'—'},
  ]},
]

/* ══════════════════════════════════════════════════════
   PLAN TAB
══════════════════════════════════════════════════════ */
const PLAN_KEY = 'stride_plan_done'

const loadDone = () => {
  try { const r = localStorage.getItem(PLAN_KEY); return r ? JSON.parse(r) : {} } catch { return {} }
}
const saveDone = (d) => {
  try { localStorage.setItem(PLAN_KEY, JSON.stringify(d)) } catch {}
}

function Plan() {
  const [activeDay, setActiveDay] = useState(null)
  const [done, setDone] = useState(loadDone)
  const todayDate = todayStr()

  const toggleTask = (e, key, ti) => {
    e.stopPropagation()
    const taskKey = `${key}-${ti}`
    setDone(prev => {
      const next = { ...prev, [taskKey]: !prev[taskKey] }
      saveDone(next)
      return next
    })
  }

  const phaseProgress = (days, phaseKey) => {
    const total = days.reduce((a, d) => a + d.tasks.length, 0)
    const completed = days.reduce((a, d, di) =>
      a + d.tasks.filter((_, ti) => done[`${phaseKey}-${di}-${ti}`]).length, 0)
    return { total, completed, pct: total ? Math.round((completed / total) * 100) : 0 }
  }

  const phases = [
    { label: 'Phase 1', title: 'IELTS crunch', dates: 'May 21 – June 7', days: P1_DAYS, key: 'p1',
      alloc: [{label:'IELTS practice',pct:55,color:'#f87171',time:'2h'},{label:'Cybersecurity',pct:28,color:'#34d399',time:'1h'},{label:'Uni profile',pct:14,color:'#a78bfa',time:'30m'}] },
    { label: 'Phase 2', title: 'Cyber + profile sprint', dates: 'June 8 – June 21', days: P2_DAYS, key: 'p2',
      alloc: [{label:'Cybersecurity',pct:55,color:'#34d399',time:'2h'},{label:'Uni profile',pct:42,color:'#a78bfa',time:'1h 30m'},{label:'IELTS review',pct:14,color:'#f87171',time:'30m'}] },
  ]

  const goalCards = [
    {icon:'📝', title:'IELTS 7+', meta:'4 skills · ielts-testpro.com', deadline:'Exam: June 7, 2026', dc:'#f87171'},
    {icon:'🔐', title:'Google Cybersecurity', meta:'Coursera beginner cert', deadline:'Deadline: June 21', dc:'#34d399'},
    {icon:'🎓', title:'Uni profile', meta:'SOP · CV · research', deadline:'Deadline: June 21', dc:'#a78bfa'},
  ]

  return (
    <div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:10, marginBottom:20}}>
        {goalCards.map((g,i) => (
          <div key={i} style={{background:'#13131f', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'12px 14px'}}>
            <div style={{fontSize:20, marginBottom:6}}>{g.icon}</div>
            <div style={{fontWeight:600, fontSize:13, marginBottom:2}}>{g.title}</div>
            <div style={{fontSize:11, color:'#6b6888', marginBottom:4}}>{g.meta}</div>
            <div style={{fontSize:11, fontWeight:600, color:g.dc}}>{g.deadline}</div>
          </div>
        ))}
      </div>

      {phases.map((phase, pi) => {
        const prog = phaseProgress(phase.days, `${pi}`)
        return (
        <div key={pi} style={{marginBottom:24}}>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
            <span style={{fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:20, background: pi===0?'rgba(248,113,113,0.12)':'rgba(52,211,153,0.12)', color: pi===0?'#f87171':'#34d399'}}>{phase.label}</span>
            <div>
              <div style={{fontSize:14, fontWeight:600}}>{phase.title}</div>
              <div style={{fontSize:11, color:'#6b6888'}}>{phase.dates}</div>
            </div>
            <div style={{marginLeft:'auto', textAlign:'right'}}>
              <div style={{fontSize:11, color:'#6b6888', marginBottom:3}}>{prog.completed}/{prog.total} tasks · {prog.pct}%</div>
              <div style={{width:80, height:4, background:'rgba(255,255,255,0.07)', borderRadius:2}}>
                <div style={{height:'100%', width:prog.pct+'%', background: pi===0?'#f87171':'#34d399', borderRadius:2, transition:'width .4s'}} />
              </div>
            </div>
          </div>

          <div style={{marginBottom:10}}>
            {phase.alloc.map((a,i) => (
              <div key={i} style={{display:'flex', alignItems:'center', gap:8, marginBottom:5}}>
                <span style={{fontSize:11, color:'#6b6888', width:120, flexShrink:0}}>{a.label}</span>
                <div style={{flex:1, height:5, background:'rgba(255,255,255,0.07)', borderRadius:3}}>
                  <div style={{height:'100%', width:a.pct+'%', background:a.color, borderRadius:3}} />
                </div>
                <span style={{fontSize:11, color:'#6b6888', width:36, textAlign:'right'}}>{a.time}</span>
              </div>
            ))}
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(86px,1fr))', gap:6, marginBottom:10}}>
            {phase.days.map((d, di) => {
              const key = `${pi}-${di}`
              const tags = [...new Set(d.tasks.map(t => t.tag))]
              const isActive = activeDay === key
              const allDone = d.tasks.every((_,ti) => done[`${key}-${ti}`])
              return (
                <div key={di} onClick={() => setActiveDay(isActive ? null : key)}
                  style={{background: isActive?'#1d1d2e':'#13131f', border:`1px solid ${allDone?'rgba(52,211,153,0.45)':isActive?'rgba(167,139,250,0.45)':'rgba(255,255,255,0.08)'}`, borderRadius:10, padding:'8px 9px', cursor:'pointer', transition:'border-color .15s'}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:2}}>
                    <div style={{fontSize:10, color:'#6b6888'}}>{d.date}</div>
                    {allDone && <span style={{fontSize:10, color:'#34d399'}}>✓</span>}
                  </div>
                  <div style={{fontSize:12, fontWeight:600, marginBottom:5}}>{d.day}</div>
                  <div style={{display:'flex', flexDirection:'column', gap:3}}>
                    {tags.map(tag => {
                      const t = d.tasks.find(x => x.tag === tag)
                      return (
                        <div key={tag} style={{display:'flex', alignItems:'center', gap:4}}>
                          <div style={{width:6, height:6, borderRadius:'50%', background:t.color, flexShrink:0}} />
                          <span style={{fontSize:10, color:'#6b6888'}}>{tag}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {activeDay && activeDay.startsWith(pi+'-') && (() => {
            const di = parseInt(activeDay.split('-')[1])
            const d = phase.days[di]
            const key = `${pi}-${di}`
            return (
              <div style={{background:'#13131f', border:'1px solid rgba(167,139,250,0.3)', borderRadius:14, padding:'14px 16px', marginBottom:10}}>
                <div style={{fontSize:14, fontWeight:600, marginBottom:12, display:'flex', alignItems:'center', gap:8}}>
                  📅 {d.date} — {d.day}
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:8}}>
                  {d.tasks.map((t, ti) => {
                    const isDone = !!done[`${key}-${ti}`]
                    return (
                    <div key={ti} style={{display:'flex', alignItems:'flex-start', gap:10, background: isDone?'rgba(52,211,153,0.06)':'rgba(255,255,255,0.03)', borderRadius:10, padding:'8px 10px', border:`0.5px solid ${isDone?'rgba(52,211,153,0.2)':'transparent'}`}}>
                      <button onClick={(e) => toggleTask(e, key, ti)} title="Mark done" style={{width:20, height:20, borderRadius:'50%', border:`1.5px solid ${isDone?'#34d399':'rgba(255,255,255,0.2)'}`, background:isDone?'#34d399':'transparent', color:'#0c0c14', fontSize:11, cursor:'pointer', flexShrink:0, marginTop:2}}>
                        {isDone?'✓':''}
                      </button>
                      <span style={{fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:20, background:t.bg, color:t.color, flexShrink:0, whiteSpace:'nowrap', opacity: isDone?0.5:1}}>{t.tag}</span>
                      <div style={{opacity: isDone?0.5:1}}>
                        <div style={{fontSize:13, lineHeight:1.5}}>{t.text}</div>
                        <div style={{fontSize:11, color:'#6b6888', marginTop:2}}>{t.time}</div>
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            )
          })()}

          {pi === 0 && <div style={{height:1, background:'rgba(255,255,255,0.06)', margin:'20px 0'}} />}
        </div>
        )
      })}

      <div style={{background:'#13131f', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'14px 16px'}}>
        <div style={{fontSize:13, fontWeight:600, marginBottom:6}}>Daily check-in</div>
        <div style={{fontSize:12, color:'#6b6888', lineHeight:1.7}}>Message Claude every morning saying <strong style={{color:'#eae8f5'}}>"Day check-in"</strong> and get your exact tasks, progress check, and a push if you're falling behind.</div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TIPS TAB
══════════════════════════════════════════════════════ */
const TIPS_DATA = [
  {
    id: 'writing-t1',
    section: 'Writing',
    title: 'Task 1 — Graphs & Charts',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.12)',
    icon: '📊',
    tips: [
      { heading: 'Never start with "The graph shows…"', body: 'Examiners see it 100 times a day. Paraphrase the title completely. Try: "It is evident from the data that…" or "The chart illustrates a clear trend in…"' },
      { heading: '4-paragraph structure — always', body: '① Intro (paraphrase title) ② Overview (2 main trends — NO data here) ③ Detail paragraph 1 ④ Detail paragraph 2. The overview is worth the most — never skip it.' },
      { heading: 'Compare, don\'t just describe', body: 'Instead of describing each line separately, link them: "While X rose sharply over the period, Y remained relatively stable." This alone pushes you from band 6 to 7.' },
      { heading: 'Word count sweet spot', body: '150 words minimum. 170–185 is ideal. Going over 200 wastes time you need for Task 2.' },
      { heading: 'Vary your language for numbers', body: 'Increase → surge, climb, shoot up, rise steadily. Decrease → plummet, decline, drop sharply, fall gradually. Stable → plateau, level off, remain constant.' },
    ]
  },
  {
    id: 'writing-t2',
    section: 'Writing',
    title: 'Task 2 — Essays',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.12)',
    icon: '✍️',
    tips: [
      { heading: 'Spend 10 mins planning — non-negotiable', body: 'Students who skip planning write themselves into a corner by paragraph 2. Note your position, 2 main points, 1 example each. 10 mins planning saves 20 mins of rambling.' },
      { heading: 'PEEL every body paragraph', body: 'Point → Explain → Example → Link back to question. One idea per paragraph, fully developed. Two shallow paragraphs score worse than one deep one.' },
      { heading: '4 scoring criteria — equal weight', body: 'Task Achievement · Coherence & Cohesion · Lexical Resource · Grammar Range & Accuracy. Most people only think about vocabulary. Coherence (how ideas connect) is where most band 6s lose marks.' },
      { heading: 'Word count sweet spot', body: '250 words minimum. 270–290 is ideal. Never go under 250 — automatic band reduction. Don\'t go over 320 — quality drops, examiner notices.' },
      { heading: 'Hedging language — examiners love this', body: '"It could be argued that…" / "There is a strong case for…" / "While some may contend that… it is widely accepted that…" This shows academic register and pushes Lexical Resource score up.' },
      { heading: 'Avoid these common mistakes', body: '✗ Starting conclusion with "In a nutshell" (too informal). ✗ Using "nowadays" 4 times. ✗ Writing your real opinion in "discuss both views" essays. ✗ Forgetting to answer the actual question in the conclusion.' },
    ]
  },
  {
    id: 'speaking-p1',
    section: 'Speaking',
    title: 'Part 1 — Introduction & Interview',
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.12)',
    icon: '🎙️',
    tips: [
      { heading: 'Always extend your answer', body: 'Never give one-word answers. Formula: Answer + Reason + Example. "I enjoy reading — mainly because it helps me unwind after a busy day. For instance, I usually read for 30 minutes before bed."' },
      { heading: 'Fluency beats accuracy', body: 'A smooth answer with one grammar mistake scores higher than a perfectly correct robotic one. Keep talking, don\'t freeze up to find the perfect word.' },
      { heading: 'Cut these phrases immediately', body: '✗ "So basically…" ✗ "As per my knowledge…" ✗ "I think that in my opinion…" ✗ "Good question!" — All of these scream rehearsed and drop your score.' },
      { heading: 'Vary your tense', body: 'Examiners check grammar range. Mix present simple, present perfect, past simple naturally: "I\'ve always enjoyed…", "When I was younger I used to…", "These days I tend to…"' },
    ]
  },
  {
    id: 'speaking-p2',
    section: 'Speaking',
    title: 'Part 2 — Long Turn (Cue Card)',
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.12)',
    icon: '🗣️',
    tips: [
      { heading: 'Use 1 minute prep time for bullet points only', body: 'Note 5 keywords — not full sentences. Then speak around each for 20–25 seconds. Full sentences in notes = you\'ll just read them out, which kills fluency score.' },
      { heading: 'Speak for the full 2 minutes', body: 'Stop before 1 min 45s = examiner marks you down. Go past 2 min = examiner cuts you off mid-sentence, which is fine. Aim to still be talking when they stop you.' },
      { heading: 'Structure it like a story', body: 'When/Where → What happened → Who was involved → How it made you feel → Why it matters to you. This naturally fills 2 minutes and sounds coherent.' },
      { heading: 'If you go blank, zoom out', body: 'If you forget what to say, zoom out to a related idea: "…and this actually reminds me of something broader about how people in India…" Buys you 10 seconds and keeps fluency intact.' },
    ]
  },
  {
    id: 'speaking-p3',
    section: 'Speaking',
    title: 'Part 3 — Discussion',
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.12)',
    icon: '💬',
    tips: [
      { heading: 'Think out loud to buy time', body: '"That\'s quite a complex issue — I\'d say…" / "It depends on the context, but generally speaking…" Sounds natural, gives you 3–4 seconds, and shows discourse management.' },
      { heading: 'Give 3-4 sentence answers minimum', body: 'Part 3 is about depth. Position → Reason → Example → Concession (or alternative view). "While some people argue X, I believe Y because… For instance… That said, Z is also worth considering."' },
      { heading: 'Use discourse markers', body: '"Furthermore…" / "On the other hand…" / "What\'s particularly interesting is…" / "To a large extent…" These push your Coherence score up significantly.' },
      { heading: 'Don\'t be afraid to disagree', body: 'Examiners are not judging your opinions — they\'re judging your English. Taking a strong position and defending it clearly scores higher than giving a vague "it depends" answer.' },
    ]
  },
  {
    id: 'vocab',
    section: 'Vocabulary',
    title: 'High-Score Vocabulary Swaps',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.12)',
    icon: '💡',
    tips: [
      { heading: 'Replace weak verbs', body: 'increase → surge, escalate, soar | decrease → plummet, dwindle, contract | show → illustrate, demonstrate, highlight | think → contend, argue, maintain, assert' },
      { heading: 'Replace weak adjectives', body: 'important → crucial, pivotal, fundamental, paramount | big → substantial, considerable, significant | small → marginal, negligible, modest | good → beneficial, advantageous, favourable' },
      { heading: 'Academic sentence starters', body: '"It is widely acknowledged that…" / "A growing body of evidence suggests…" / "The extent to which X influences Y is debatable…" / "Contrary to popular belief…"' },
      { heading: 'Collocations that examiners reward', body: 'tackle a problem (not solve) | raise awareness (not increase) | have a profound impact (not big effect) | address an issue (not fix) | draw a conclusion (not make)' },
    ]
  },
  {
    id: 'cambridge',
    section: 'Strategy',
    title: 'Cambridge Books — How to Use Them',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.12)',
    icon: '📚',
    tips: [
      { heading: 'Books 11–18 only for your prep', body: 'Books 1–10 have slightly outdated question types. Books 11–18 match the current 2026 exam pattern exactly. Start at 14, finish at 18.' },
      { heading: 'Writing & Speaking topics repeat', body: 'Listening and Reading passages never repeat. But Writing Task 2 essay topics and Speaking cue card topics DO get reused. Practising Cambridge essays = real chance of seeing the same topic.' },
      { heading: 'Best free online access', body: 'practice9.co has Cambridge 11–20 digitised in computer-based format — identical to the real CBT interface. Use Simulation mode, not Practice mode.' },
      { heading: 'After every mock — 3-step review', body: '① Note every wrong answer and why. ② Look up the vocabulary you didn\'t know. ③ Log your band score in Stride. No review = wasted test.' },
    ]
  },
]

function Tips() {
  const [active, setActive] = useState('writing-t1')
  const sections = [...new Set(TIPS_DATA.map(t => t.section))]
  const activeCard = TIPS_DATA.find(t => t.id === active)

  return (
    <div>
      <div style={{ fontSize: 11, color: '#6b6888', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 12 }}>
        Exam tips — tap any card to expand
      </div>

      {sections.map(sec => (
        <div key={sec} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#6b6888', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            {sec}
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
            {TIPS_DATA.filter(t => t.section === sec).map(card => (
              <div key={card.id} onClick={() => setActive(active === card.id ? null : card.id)}
                style={{ background: active === card.id ? '#1d1d2e' : '#13131f', border: `1px solid ${active === card.id ? card.color + '55' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: '11px 13px', cursor: 'pointer', transition: 'all .15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{card.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{card.title}</span>
                </div>
                <div style={{ fontSize: 11, color: '#6b6888' }}>{card.tips.length} tips inside</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {activeCard && (
        <div style={{ background: '#13131f', border: `1px solid ${activeCard.color}44`, borderRadius: 14, padding: '16px 18px', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>{activeCard.icon}</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{activeCard.title}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeCard.tips.map((tip, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px', borderLeft: `3px solid ${activeCard.color}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5, color: activeCard.color }}>{tip.heading}</div>
                <div style={{ fontSize: 13, color: '#b0adc8', lineHeight: 1.65 }}>{tip.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
