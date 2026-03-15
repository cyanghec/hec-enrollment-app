import React, { useState, useRef, useEffect } from 'react'
import { COURSES, COHORT_LABELS, WEEK_META, HISTORICAL_COURSES } from '../../data/courses'
import { getFlags, getEnrollmentCounts, getRegistrationCounts, getProgress, getDaysUntilDeadline, isDeadlinePassed } from '../../utils/eligibility'

const COHORTS = ['J26 16mo', 'S26 16mo', 'J27 12mo', 'J27 16mo']

const LEVEL_COLORS = {
  Conceptual: { bg: '#EFF6FF', color: '#1D4ED8' },
  Applied:    { bg: '#F0FDF4', color: '#15803D' },
  Technical:  { bg: '#FDF4FF', color: '#7E22CE' },
}

function optInLabel(val) {
  if (val === true) return { text: 'Interested', cls: 'badge-success' }
  if (val === false) return { text: 'Not interested', cls: 'badge-muted' }
  return { text: 'No response', cls: 'badge-warning' }
}

function concentrationBadge(student) {
  if (getProgress(student).earned) return { text: '✓ Obtained', cls: '', style: { background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE', fontWeight: 700 }, obtained: true }
  return { ...optInLabel(student.concentrationOptIn), style: undefined, obtained: false }
}

export default function AdminDashboard({ students, courses, settings, historicalEnrollments, updateStudent, updateCourse, updateSettings, addStudent, addCourse, sendMessage, removeStudentFromCourse, enrollStudent, batchEnroll, importHistoricalEnrollment, removeHistoricalEnrollment, onBack, onReset }) {
  const [tab, setTab] = useState('overview')
  const [filterCohort, setFilterCohort] = useState('all')
  const [filterOptIn, setFilterOptIn] = useState('all')
  const [filterExchange, setFilterExchange] = useState('all')
  const [filterFlag, setFilterFlag] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [courseTab, setCourseTab] = useState('current')
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [messageStudentId, setMessageStudentId] = useState(null)
  const [showRosterUpload, setShowRosterUpload] = useState(false)
  const [expandCourseId, setExpandCourseId] = useState(null)
  const [reviewedFlags, setReviewedFlags] = useState(new Set())

  const counts = getEnrollmentCounts(students)
  const regCounts = getRegistrationCounts(students)
  const allFlags = students.flatMap(s => getFlags(s).map(f => ({ ...f, student: s })))
  const flaggedStudents = students.filter(s => getFlags(s).length > 0)

  const optedIn = students.filter(s => s.concentrationOptIn === true).length
  const undecided = students.filter(s => s.concentrationOptIn === null).length
  const notInterested = students.filter(s => s.concentrationOptIn === false).length

  const totalUnreadFromStudents = students.reduce((sum, s) => s.cohort === 'J26 16mo' ? sum : sum + (s.messages || []).filter(m => m.from === 'student' && !m.read).length, 0)

  function resolveFlag(studentId) {
    updateStudent(studentId, { exchangeChanged: false })
  }

  const displayStudents = students
    .filter(s => filterCohort === 'all' || s.cohort === filterCohort)
    .filter(s => filterExchange === 'all' || (filterExchange === 'yes' ? s.onExchange : !s.onExchange))
    .filter(s => filterOptIn === 'all' || (
      filterOptIn === 'obtained' ? getProgress(s).earned :
      filterOptIn === 'yes' ? !getProgress(s).earned && s.concentrationOptIn === true :
      filterOptIn === 'no' ? !getProgress(s).earned && s.concentrationOptIn === false :
      !getProgress(s).earned && s.concentrationOptIn === null
    ))
    .filter(s => !filterFlag || (s.messages || []).filter(m => m.from === 'student' && !m.read).length > 0 || s.exchangeChanged || getFlags(s).length > 0)

  return (
    <div className="page">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">HEC</div>
          <span>Tech &amp; AI Concentration</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 4px' }}>·</span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>Admin</span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)', fontSize: '0.75rem' }} onClick={onReset}>
            Reset Demo
          </button>
          <button className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' }} onClick={onBack}>
            ← Back
          </button>
        </div>
      </div>

      <div className="content" style={{ maxWidth: 1280 }}>
        {/* Tabs */}
        <div className="tabs">
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'students', label: `👥 Students (${students.length})` },
            { id: 'courses', label: '🎓 Course Setup' },
            { id: 'messages', label: `💬 Messages${totalUnreadFromStudents > 0 ? ` (${totalUnreadFromStudents})` : ''}` },
          ].map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ──────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div>

            {/* ── Summary stat chips ── */}
            <div className="overview-stats">
              {[
                { n: students.length, label: 'Total students', color: 'var(--navy)', bg: '#EEF2FF', border: '#C7D2FE' },
                { n: optedIn,         label: 'Interested',     color: 'var(--success)', bg: 'var(--success-bg)', border: '#86EFAC' },
                { n: undecided,       label: 'Undecided',      color: 'var(--warning)', bg: 'var(--warning-bg)', border: '#FCD34D' },
                { n: notInterested,   label: 'Opted out',      color: 'var(--text-muted)', bg: 'var(--bg)', border: 'var(--border)' },
              ].map(s => (
                <div key={s.label} className="overview-stat" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <div style={{ fontSize: '2.25rem', fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.n}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: s.color, opacity: 0.85 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── Two-column grid ── */}
            <div className="grid-2 mb-3">

              {/* Cohort Interest */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Interest by Cohort</span>
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    {[['var(--success)', 'Interested'], ['var(--warning)', 'Undecided'], ['var(--border)', 'Opted out']].map(([c, l]) => (
                      <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
                {COHORTS.map(cohort => {
                  const cs = students.filter(s => s.cohort === cohort)
                  const yes = cs.filter(s => s.concentrationOptIn === true).length
                  const no  = cs.filter(s => s.concentrationOptIn === false).length
                  const und = cs.filter(s => s.concentrationOptIn === null).length
                  return (
                    <div key={cohort} style={{ marginBottom: '1.25rem', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, transition: 'background 0.15s' }}
                      onClick={() => { setTab('students'); setFilterCohort(cohort) }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      title={`View ${cohort} students`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                        <div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--navy)' }}>{cohort}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8 }}>{COHORT_LABELS[cohort]}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>{yes}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/{cs.length}</span></span>
                      </div>
                      <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', background: 'var(--border)', gap: 1 }}>
                        <div style={{ width: `${(yes/cs.length)*100}%`, background: 'var(--success)', transition: 'width 0.4s' }} title={`${yes} interested`} />
                        <div style={{ width: `${(und/cs.length)*100}%`, background: 'var(--warning)', opacity: 0.55 }} title={`${und} undecided`} />
                        <div style={{ width: `${(no/cs.length)*100}%`, background: 'var(--border)' }} title={`${no} opted out`} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Flags */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Flags</span>
                  {(() => {
                    const unreviewedCount = flaggedStudents.filter(s => !reviewedFlags.has(s.id)).length
                    return unreviewedCount > 0
                      ? <span className="badge badge-danger">{unreviewedCount} unreviewed</span>
                      : flaggedStudents.length > 0
                      ? <span className="badge badge-success">All reviewed</span>
                      : <span className="badge badge-success">All clear</span>
                  })()}
                </div>
                {flaggedStudents.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No flags ✓</p>
                ) : (
                  <div className="scroll-panel">
                    {flaggedStudents
                      .sort((a, b) => {
                        const aReviewed = reviewedFlags.has(a.id) ? 1 : 0
                        const bReviewed = reviewedFlags.has(b.id) ? 1 : 0
                        if (aReviewed !== bReviewed) return aReviewed - bReviewed
                        const order = { critical: 0, exchange: 1, conflict: 2, message: 3 }
                        const aMin = Math.min(...getFlags(a).map(f => order[f.type] ?? 9))
                        const bMin = Math.min(...getFlags(b).map(f => order[f.type] ?? 9))
                        return aMin - bMin
                      })
                      .map(s => {
                        const sFlags = getFlags(s)
                        const initials = s.name.split(' ').slice(0, 2).map(w => w[0]).join('')
                        const flagColors = { critical: 'badge-danger', exchange: 'badge-warning', conflict: 'badge-warning', message: 'badge-info' }
                        const isReviewed = reviewedFlags.has(s.id)
                        return (
                          <div key={s.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start', cursor: 'pointer', borderRadius: 6, opacity: isReviewed ? 0.45 : 1 }}
                            onClick={() => {
                              setReviewedFlags(prev => new Set([...prev, s.id]))
                              setFilterCohort(s.cohort)
                              setSelectedStudentId(s.id)
                              setTab('students')
                            }}
                            title={`View ${s.name} in Students`}
                          >
                            <div className="avatar" style={{ background: isReviewed ? '#E5E7EB' : '#DBEAFE', color: isReviewed ? '#9CA3AF' : 'var(--info)', fontSize: '0.7rem' }}>{isReviewed ? '✓' : initials}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isReviewed ? 'var(--text-muted)' : 'var(--navy)', textDecoration: isReviewed ? 'line-through' : 'none' }}>{s.name}</span>
                                <span className="badge badge-navy" style={{ fontSize: '0.62rem', marginLeft: 6, opacity: isReviewed ? 0.5 : 1 }}>{s.cohort}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {sFlags.map((f, i) => (
                                  <span key={i} className={`badge ${isReviewed ? 'badge-muted' : (flagColors[f.type] || 'badge-muted')}`} style={{ fontSize: '0.62rem' }} title={f.detail}>
                                    {f.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Course Demand ── */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Course Demand</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>sorted by fill rate</span>
              </div>
              {courses
                .filter(c => !c.mandatory)
                .sort((a, b) => ((counts[b.id]||0)/b.cap) - ((counts[a.id]||0)/a.cap))
                .map(c => {
                  const reg = regCounts[c.id] || 0
                  const enr = counts[c.id] || 0
                  const pct = Math.min(100, (reg / c.cap) * 100)
                  const isFull = reg >= c.cap
                  const isHigh = pct > 70
                  const fillColor = isFull ? 'var(--danger)' : isHigh ? 'var(--warning)' : 'var(--success)'
                  return (
                    <div key={c.id} className="demand-row" style={{ cursor: 'pointer' }}
                      onClick={() => { setExpandCourseId(c.id); setTab('courses') }}
                      title={`View ${c.name} in Course Setup`}
                    >
                      <div style={{ width: 220, flexShrink: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--navy)', marginBottom: 2 }}>{c.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.month}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 10, background: 'var(--border)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                          {reg > 0 && <div style={{ position: 'absolute', height: '100%', width: `${pct}%`, background: fillColor, borderRadius: 999, opacity: 0.3, transition: 'width 0.4s' }} />}
                          {enr > 0 && <div style={{ position: 'absolute', height: '100%', width: `${Math.min(100, (enr / c.cap) * 100)}%`, background: fillColor, borderRadius: 999, transition: 'width 0.4s' }} />}
                        </div>
                      </div>
                      <div style={{ width: 160, textAlign: 'right', fontSize: '0.78rem', flexShrink: 0, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{reg}</span> registered
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--success)' }}>{enr}</span>/{c.cap} enrolled
                        </span>
                      </div>
                      <div style={{ width: 64, flexShrink: 0, textAlign: 'right' }}>
                        {isFull
                          ? <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Full</span>
                          : isHigh
                          ? <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>High</span>
                          : <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Open</span>}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* ── STUDENTS ──────────────────────────────────────────────── */}
        {tab === 'students' && (
          <div>
            {/* Action buttons row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowRosterUpload(v => !v); setShowAddStudent(false) }}>
                {showRosterUpload ? '✕ Cancel Upload' : '⬆ Upload Roster'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setShowAddStudent(true); setShowRosterUpload(false) }}>+ Add Student</button>
            </div>

            {showRosterUpload && (
              <RosterUploadPanel
                existingStudents={students}
                onBulkAdd={(newStudents) => { newStudents.forEach(s => addStudent(s)); setShowRosterUpload(false) }}
                onClose={() => setShowRosterUpload(false)}
              />
            )}

            {showAddStudent && (
              <AddStudentForm
                students={students}
                onAdd={(s) => { addStudent(s); setShowAddStudent(false) }}
                onCancel={() => setShowAddStudent(false)}
              />
            )}

            <div className="card">
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Showing {displayStudents.length} of {students.length} students
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th style={{ fontSize: '0.78rem' }}>ID</th>
                      <th>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span>Cohort</span>
                          <select value={filterCohort} onChange={e => setFilterCohort(e.target.value)}
                            style={{ fontSize: '0.68rem', padding: '2px 4px', fontWeight: 400, border: '1px solid var(--border)', borderRadius: 4, background: filterCohort !== 'all' ? '#EFF6FF' : 'white' }}>
                            <option value="all">All</option>
                            {COHORTS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </th>
                      <th>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span>Exchange</span>
                          <select value={filterExchange} onChange={e => setFilterExchange(e.target.value)}
                            style={{ fontSize: '0.68rem', padding: '2px 4px', fontWeight: 400, border: '1px solid var(--border)', borderRadius: 4, background: filterExchange !== 'all' ? '#EFF6FF' : 'white' }}>
                            <option value="all">All</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>
                      </th>
                      <th>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span>Concentration</span>
                          <select value={filterOptIn} onChange={e => setFilterOptIn(e.target.value)}
                            style={{ fontSize: '0.68rem', padding: '2px 4px', fontWeight: 400, border: '1px solid var(--border)', borderRadius: 4, background: filterOptIn !== 'all' ? '#EFF6FF' : 'white' }}>
                            <option value="all">All</option>
                            <option value="obtained">✓ Obtained</option>
                            <option value="yes">Interested</option>
                            <option value="undecided">No response</option>
                            <option value="no">Not interested</option>
                          </select>
                        </div>
                      </th>
                      <th>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span>Courses</span>
                          <select value={filterFlag ? 'flags' : 'all'} onChange={e => setFilterFlag(e.target.value === 'flags')}
                            style={{ fontSize: '0.68rem', padding: '2px 4px', fontWeight: 400, border: '1px solid var(--border)', borderRadius: 4, background: filterFlag ? '#EFF6FF' : 'white' }}>
                            <option value="all">All</option>
                            <option value="flags">Has flags</option>
                          </select>
                        </div>
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayStudents.map(s => {
                      const oi = concentrationBadge(s)
                      const sFlags = getFlags(s)
                      const isExpanded = selectedStudentId === s.id
                      const isMessaging = messageStudentId === s.id
                      const unreadFromStudent = (s.messages || []).filter(m => m.from === 'student' && !m.read).length
                      return (
                        <React.Fragment key={s.id}>
                          <tr
                            onClick={() => { setSelectedStudentId(isExpanded ? null : s.id); setMessageStudentId(null) }}
                            style={{ cursor: 'pointer', background: isExpanded ? 'var(--info-bg)' : undefined }}
                          >
                            <td>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.email}</div>
                              {unreadFromStudent > 0 && s.cohort !== 'J26 16mo' && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--info)', marginTop: 2 }}>
                                  💬 {unreadFromStudent} unread
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.studentId || '—'}</td>
                            <td><span className="badge badge-navy" style={{ fontSize: '0.7rem' }}>{s.cohort}</span></td>
                            <td>
                              {s.onExchange
                                ? <span className="badge badge-warning">Exchange {s.exchangeChanged ? '⚠' : ''}</span>
                                : <span className="badge badge-muted">No</span>}
                            </td>
                            <td>
                              <span className={`badge ${oi.cls}`} style={{ fontSize: '0.7rem', ...oi.style }}>{oi.text}</span>
                            </td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {(() => {
                                const compNames = new Set(s.completedCourses.map(id => courses.find(c => c.id === id)?.name).filter(Boolean))
                                const nReg = s.registeredCourses.filter(id => !compNames.has(courses.find(c => c.id === id)?.name)).length
                                const nComp = s.completedCourses.length
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {nComp > 0 && <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ {nComp} completed</span>}
                                    {nReg > 0 && <span>{nReg} registered</span>}
                                    {nComp === 0 && nReg === 0 && <span>—</span>}
                                  </div>
                                )
                              })()}
                              {sFlags.length > 0 && <span className="badge badge-danger" style={{ fontSize: '0.65rem', marginLeft: 6 }}>🚩 {sFlags.length}</span>}
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                {s.exchangeChanged && (
                                  <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => resolveFlag(s.id)}>Resolve</button>
                                )}
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ fontSize: '0.72rem', padding: '3px 8px', color: isMessaging ? 'var(--info)' : undefined, borderColor: isMessaging ? 'var(--info)' : undefined }}
                                  onClick={() => { setMessageStudentId(isMessaging ? null : s.id); setSelectedStudentId(null) }}
                                  title="Chat with student"
                                >
                                  ✉
                                </button>
                                <select
                                  style={{ fontSize: '0.75rem', padding: '3px 6px', width: 'auto', color: s.concentrationOptIn === true ? 'var(--success)' : 'var(--text-muted)' }}
                                  value={s.concentrationOptIn === null ? 'null' : String(s.concentrationOptIn)}
                                  onChange={e => {
                                    const v = e.target.value
                                    updateStudent(s.id, { concentrationOptIn: v === 'null' ? null : v === 'true' })
                                  }}
                                >
                                  <option value="null">Undecided</option>
                                  <option value="true">Interested</option>
                                  <option value="false">Not interested</option>
                                </select>
                              </div>
                            </td>
                          </tr>

                          {/* Inline chat */}
                          {isMessaging && (
                            <tr style={{ background: '#EFF6FF' }}>
                              <td colSpan={7} style={{ padding: '12px 16px' }}>
                                <AdminChatThread student={s} sendMessage={sendMessage} updateStudent={updateStudent} />
                              </td>
                            </tr>
                          )}

                          {/* Inline student detail */}
                          {isExpanded && (
                            <tr style={{ background: 'var(--info-bg)' }}>
                              <td colSpan={7} style={{ padding: '0 16px 16px' }}>
                                <StudentDetailPanel
                                  student={s}
                                  courses={courses}
                                  onUpdateStudent={(changes) => updateStudent(s.id, changes)}
                                  onOpenChat={() => { setMessageStudentId(s.id); setSelectedStudentId(null) }}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── COURSE SETUP ──────────────────────────────────────────── */}
        {tab === 'courses' && (
          <div>
            {/* Sub-tab toggle */}
            <div style={{ display: 'flex', gap: 0, marginBottom: '1.25rem', borderBottom: '2px solid var(--border)' }}>
              {[
                { id: 'current',    label: '2027–28 Registration' },
                { id: 'historical', label: '2026–27 Historical' },
              ].map(t => (
                <button key={t.id}
                  onClick={() => { setCourseTab(t.id); setShowAddCourse(false) }}
                  style={{
                    padding: '8px 20px', fontSize: '0.85rem', fontWeight: courseTab === t.id ? 700 : 400,
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: courseTab === t.id ? '2px solid var(--navy)' : '2px solid transparent',
                    marginBottom: -2, color: courseTab === t.id ? 'var(--navy)' : 'var(--text-muted)',
                  }}
                >{t.label}</button>
              ))}
            </div>

            {courseTab === 'historical' && (
              <HistoricalCoursesPanel
                courses={HISTORICAL_COURSES}
                students={students}
                historicalEnrollments={historicalEnrollments}
                onImport={importHistoricalEnrollment}
                onRemove={removeHistoricalEnrollment}
              />
            )}

            {courseTab === 'current' && (
            <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Edit course details inline. Changes persist and affect what students see.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddCourse(v => !v)}>
                {showAddCourse ? '✕ Cancel' : '+ Add Course'}
              </button>
            </div>

            {showAddCourse && (
              <AddCourseForm
                onAdd={(c) => { addCourse(c); setShowAddCourse(false) }}
                onCancel={() => setShowAddCourse(false)}
              />
            )}

            {/* Dynamic week grouping */}
            {Object.entries(WEEK_META).map(([weekKey, meta]) => {
              const weekCourses = courses.filter(c => c.week === weekKey)
              if (weekCourses.length === 0) return null
              return (
                <div key={weekKey} className="card mb-2">
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="card-title">{meta.label}</span>
                      {!meta.exchangeSafe
                        ? <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Exchange window — blocked</span>
                        : <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>Exchange-safe</span>}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{weekCourses.length} course{weekCourses.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {weekCourses.map(course => {
                      const enrolled = counts[course.id] || 0
                      const registered = regCounts[course.id] || 0
                      const pct = (enrolled / course.cap) * 100
                      const isFull = enrolled >= course.cap
                      return (
                        <CourseSetupRow
                          key={course.id}
                          course={course}
                          enrolled={enrolled}
                          registered={registered}
                          pct={pct}
                          isFull={isFull}
                          onUpdate={(changes) => updateCourse(course.id, changes)}
                          students={students}
                          onRemoveStudent={(studentId, message) => removeStudentFromCourse(studentId, course.id, message)}
                          onEnrollStudent={(studentId) => enrollStudent(studentId, course.id)}
                          onBatchEnroll={(studentIds) => batchEnroll(studentIds, course.id)}
                          autoExpand={course.id === expandCourseId}
                          onAutoExpanded={() => setExpandCourseId(null)}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Any courses with unknown week keys (custom added) */}
            {courses.filter(c => !WEEK_META[c.week]).length > 0 && (
              <div className="card mb-2">
                <div className="card-header">
                  <span className="card-title">Other</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {courses.filter(c => !WEEK_META[c.week]).map(course => {
                    const enrolled = counts[course.id] || 0
                    const registered = regCounts[course.id] || 0
                    const pct = (enrolled / course.cap) * 100
                    const isFull = enrolled >= course.cap
                    return (
                      <CourseSetupRow
                        key={course.id}
                        course={course}
                        enrolled={enrolled}
                        registered={registered}
                        pct={pct}
                        isFull={isFull}
                        onUpdate={(changes) => updateCourse(course.id, changes)}
                        students={students}
                        onRemoveStudent={(studentId, message) => removeStudentFromCourse(studentId, course.id, message)}
                        onEnrollStudent={(studentId) => enrollStudent(studentId, course.id)}
                        onBatchEnroll={(studentIds) => batchEnroll(studentIds, course.id)}
                      />
                    )
                  })}
                </div>
              </div>
            )}
            </div>)}
          </div>
        )}

        {/* ── MESSAGES ──────────────────────────────────────────────── */}
        {tab === 'messages' && (
          <MessagesInbox students={students} courses={courses} sendMessage={sendMessage} updateStudent={updateStudent} />
        )}
      </div>
    </div>
  )
}

// ── Messages Inbox ──────────────────────────────────────────────────────
function MessagesInbox({ students, courses, sendMessage, updateStudent }) {
  const [selectedId, setSelectedId] = useState(null)

  // Students with messages, sorted by most recent message (J26 16mo excluded — concentration done)
  const withMessages = students
    .filter(s => s.cohort !== 'J26 16mo' && (s.messages || []).length > 0)
    .sort((a, b) => {
      const aLast = (a.messages || []).slice(-1)[0]?.timestamp || ''
      const bLast = (b.messages || []).slice(-1)[0]?.timestamp || ''
      return bLast.localeCompare(aLast)
    })

  const selected = students.find(s => s.id === selectedId)
  const unreadFromStudents = (s) => (s.messages || []).filter(m => m.from === 'student' && !m.read).length

  return (
    <div style={{ display: 'flex', gap: '1rem', minHeight: 400 }}>
      {/* Left: student list */}
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', paddingRight: '1rem' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          {withMessages.length} conversation{withMessages.length !== 1 ? 's' : ''}
        </div>
        {withMessages.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No messages yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {withMessages.map(s => {
              const unread = unreadFromStudents(s)
              const lastMsg = (s.messages || []).slice(-1)[0]
              const isSelected = selectedId === s.id
              return (
                <div key={s.id} onClick={() => setSelectedId(s.id)}
                  style={{
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    background: isSelected ? '#EFF6FF' : unread > 0 ? '#FFFBEB' : 'transparent',
                    border: isSelected ? '1px solid #93C5FD' : '1px solid transparent',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--navy)' }}>{s.name}</span>
                    {unread > 0 && <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>{unread}</span>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lastMsg ? `${lastMsg.from === 'admin' ? 'You: ' : ''}${lastMsg.text}` : ''}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Right: chat thread */}
      <div style={{ flex: 1 }}>
        {selected ? (
          <AdminChatThread student={selected} sendMessage={sendMessage} updateStudent={updateStudent} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Select a conversation
          </div>
        )}
      </div>
    </div>
  )
}

// ── Admin Chat Thread ───────────────────────────────────────────────────
function AdminChatThread({ student, sendMessage, updateStudent }) {
  const [msgText, setMsgText] = useState('')
  const messagesEndRef = useRef(null)
  const messages = student.messages || []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Mark student messages as read when admin views them
  useEffect(() => {
    const unread = messages.filter(m => m.from === 'student' && !m.read)
    if (unread.length > 0) {
      updateStudent(student.id, {
        messages: messages.map(m => m.from === 'student' && !m.read ? { ...m, read: true } : m)
      })
    }
  }, [student.id, messages.length])

  function handleSend() {
    if (!msgText.trim()) return
    sendMessage(student.id, msgText.trim(), 'admin')
    setMsgText('')
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)' }}>{student.name}</span>
          <span className="badge badge-navy" style={{ fontSize: '0.65rem' }}>{student.cohort}</span>
          {student.onExchange && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Exchange</span>}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{student.email}</div>
      </div>

      <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '0.75rem' }}>
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.from === 'admin' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '8px 14px', borderRadius: 12,
              background: m.from === 'admin' ? 'var(--navy)' : '#F1F5F9',
              color: m.from === 'admin' ? 'white' : 'var(--text)',
              fontSize: '0.85rem', lineHeight: 1.5,
            }}>
              <div>{m.text}</div>
              <div style={{ fontSize: '0.68rem', opacity: 0.6, marginTop: 4, textAlign: m.from === 'admin' ? 'right' : 'left' }}>
                {new Date(m.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
        <input
          value={msgText}
          onChange={e => setMsgText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Type a reply..."
          style={{ flex: 1, fontSize: '0.85rem' }}
        />
        <button className="btn btn-primary btn-sm" onClick={handleSend} disabled={!msgText.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}

// ── Date helpers ────────────────────────────────────────────────────────
function fmtDate(iso, opts = {}) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...opts })
}

function fmtDateRange(start, end) {
  if (!start) return ''
  if (!end || start === end) return fmtDate(start)
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  if (s.getFullYear() === e.getFullYear()) {
    if (s.getMonth() === e.getMonth()) {
      return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}–${e.getDate()}, ${e.getFullYear()}`
    }
    return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  return `${fmtDate(start)} – ${fmtDate(end)}`
}

// ── Inline date-range picker ─────────────────────────────────────────────
function DateRangeEdit({ startDate, endDate, onSave }) {
  const [editing, setEditing] = useState(false)
  const [start, setStart] = useState(startDate || '')
  const [end, setEnd] = useState(endDate || '')

  function save() { onSave({ startDate: start, endDate: end || start }); setEditing(false) }
  function cancel() { setStart(startDate || ''); setEnd(endDate || ''); setEditing(false) }

  const display = fmtDateRange(startDate, endDate)

  if (editing) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <input
          type="date"
          value={start}
          onChange={e => setStart(e.target.value)}
          autoFocus
          style={{ fontSize: '0.78rem', padding: '2px 5px', border: '1.5px solid var(--navy)', borderRadius: 6 }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>
        <input
          type="date"
          value={end}
          min={start}
          onChange={e => setEnd(e.target.value)}
          style={{ fontSize: '0.78rem', padding: '2px 5px', border: '1.5px solid var(--navy)', borderRadius: 6 }}
        />
        <button
          onClick={save}
          style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}
        >✓</button>
        <button
          onClick={cancel}
          style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer' }}
        >✕</button>
      </span>
    )
  }

  return (
    <span
      onClick={() => { setStart(startDate || ''); setEnd(endDate || ''); setEditing(true) }}
      title="Click to set dates"
      style={{ cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 2 }}
    >
      {display || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>click to set dates</span>}
    </span>
  )
}

// ── Inline editable text field helper ───────────────────────────────────
function InlineEdit({ value, onSave, style = {}, inputStyle = {}, multiline = false, placeholder = '' }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  function save() { onSave(val); setEditing(false) }
  function cancel() { setVal(value); setEditing(false) }

  if (editing) {
    const shared = {
      value: val,
      onChange: e => setVal(e.target.value),
      onBlur: save,
      onKeyDown: e => { if (e.key === 'Enter' && !multiline) save(); if (e.key === 'Escape') cancel() },
      autoFocus: true,
      style: { fontSize: 'inherit', padding: '2px 6px', borderRadius: 6, ...inputStyle },
    }
    return multiline
      ? <textarea {...shared} style={{ ...shared.style, resize: 'vertical', minHeight: 50 }} />
      : <input {...shared} placeholder={placeholder} />
  }

  return (
    <span
      onClick={() => { setVal(value); setEditing(true) }}
      title="Click to edit"
      style={{ cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 2, ...style }}
    >
      {value || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{placeholder || 'click to add'}</span>}
    </span>
  )
}

// ── Course Setup Row ────────────────────────────────────────────────────
function CourseSetupRow({ course, enrolled, registered, pct, isFull, onUpdate, students, onRemoveStudent, onEnrollStudent, onBatchEnroll, autoExpand, onAutoExpanded }) {
  const [editingCap, setEditingCap] = useState(false)
  const [capVal, setCapVal] = useState(String(course.cap))
  const [showPanel, setShowPanel] = useState(false)
  const rowRef = useRef(null)

  // Auto-expand when navigated from overview
  useEffect(() => {
    if (autoExpand) {
      setShowPanel(true)
      onAutoExpanded?.()
      setTimeout(() => rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [autoExpand])

  // cohort breakdown (registered interest)
  const breakdown = ['J26 16mo', 'S26 16mo', 'J27 12mo', 'J27 16mo'].map(cohort => ({
    cohort,
    count: students.filter(s => s.cohort === cohort && (s.registeredCourses.includes(course.id) || (s.enrolledCourses || []).includes(course.id))).length,
  })).filter(b => b.count > 0)

  const levelColors = LEVEL_COLORS[course.level] || LEVEL_COLORS.Applied
  const dlDays = getDaysUntilDeadline(course.registrationDeadline)
  const dlPassed = isDeadlinePassed(course.registrationDeadline)

  return (
    <div ref={rowRef} style={{ padding: '14px 16px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
      {/* Row top: name/meta on left, cap/enrolled on right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Course name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)' }}>
              <InlineEdit
                value={course.name}
                onSave={v => onUpdate({ name: v })}
                inputStyle={{ width: 260, fontWeight: 700 }}
                placeholder="Course name"
              />
            </span>
            {course.tag && <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{course.tag}</span>}
            {course.mandatory && <span className="badge badge-navy" style={{ fontSize: '0.65rem' }}>Mandatory</span>}
            <select
              value={course.level}
              onChange={e => onUpdate({ level: e.target.value })}
              style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999, border: '1px solid var(--border)', background: levelColors.bg, color: levelColors.color, fontWeight: 600, cursor: 'pointer' }}
            >
              <option value="Conceptual">Conceptual</option>
              <option value="Applied">Applied</option>
              <option value="Technical">Technical</option>
            </select>
          </div>

          {/* Meta row: professor · schedule · duration · syllabus */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>👤</span>
              <InlineEdit
                value={course.professor || ''}
                onSave={v => onUpdate({ professor: v })}
                inputStyle={{ width: 200 }}
                placeholder="Add professor"
              />
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>📅</span>
              <DateRangeEdit
                startDate={course.startDate}
                endDate={course.endDate}
                onSave={({ startDate, endDate }) => {
                  const label = fmtDateRange(startDate, endDate)
                  onUpdate({ startDate, endDate, month: label || course.month })
                }}
              />
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>⏱</span>
              <InlineEdit
                value={course.duration || ''}
                onSave={v => onUpdate({ duration: v })}
                inputStyle={{ width: 110 }}
                placeholder="e.g. 18 hours"
              />
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>📄</span>
              <InlineEdit
                value={course.syllabusUrl || ''}
                onSave={v => onUpdate({ syllabusUrl: v })}
                inputStyle={{ width: 260 }}
                placeholder="Add syllabus URL"
              />
              {course.syllabusUrl && (
                <a href={course.syllabusUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.72rem', color: 'var(--info)', textDecoration: 'none', fontWeight: 600 }}
                  onClick={e => e.stopPropagation()}>
                  ↗
                </a>
              )}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>🔒</span>
              <input
                type="date"
                value={course.registrationDeadline || ''}
                onChange={e => onUpdate({ registrationDeadline: e.target.value })}
                title="Registration deadline"
                style={{ fontSize: '0.78rem', padding: '2px 5px', border: '1.5px solid var(--border)', borderRadius: 6, background: course.registrationDeadline ? (dlPassed ? '#FEF2F2' : '#F0FDF4') : 'white' }}
              />
              {course.registrationDeadline && (
                <>
                  <span style={{ fontSize: '0.72rem', color: dlPassed ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                    {dlPassed ? 'Closed' : `${dlDays}d left`}
                  </span>
                  <button onClick={() => onUpdate({ registrationDeadline: '' })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '0 2px' }} title="Clear deadline">✕</button>
                </>
              )}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🎓</span>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Eligible cohorts:</span>
              {['S26 16mo', 'J27 12mo', 'J27 16mo'].map(cohort => {
                const checked = (course.eligibleCohorts || []).includes(cohort)
                return (
                  <label key={cohort} style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const current = course.eligibleCohorts || []
                        const next = checked
                          ? current.filter(c => c !== cohort)
                          : [...current, cohort]
                        onUpdate({ eligibleCohorts: next })
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: checked ? 'var(--navy)' : 'var(--text-muted)', fontWeight: checked ? 600 : 400 }}>
                      {cohort}
                    </span>
                  </label>
                )
              })}
            </span>
          </div>
        </div>

        {/* Cap + Enrolled */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 16, flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Cap</div>
            {editingCap ? (
              <input
                type="number"
                value={capVal}
                onChange={e => setCapVal(e.target.value)}
                onBlur={() => { onUpdate({ cap: parseInt(capVal) || course.cap }); setEditingCap(false) }}
                onKeyDown={e => { if (e.key === 'Enter') { onUpdate({ cap: parseInt(capVal) || course.cap }); setEditingCap(false) } if (e.key === 'Escape') setEditingCap(false) }}
                autoFocus
                style={{ width: 56, fontSize: '1rem', fontWeight: 700, textAlign: 'center', padding: '2px 4px' }}
              />
            ) : (
              <span
                onClick={() => { setCapVal(String(course.cap)); setEditingCap(true) }}
                style={{ fontSize: '1.15rem', fontWeight: 800, cursor: 'pointer', color: 'var(--navy)', textDecoration: 'underline dotted', textUnderlineOffset: 2, display: 'block' }}
                title="Click to edit cap"
              >{course.cap}</span>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Registered</div>
            <span
              onClick={() => setShowPanel(v => !v)}
              style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 2 }}
              title="Click to manage students"
            >
              {registered}
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Enrolled</div>
            <span
              onClick={() => setShowPanel(v => !v)}
              style={{ fontSize: '1.15rem', fontWeight: 800, color: isFull ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--success)', display: 'block', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 2 }}
              title="Click to manage students"
            >
              {enrolled}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{
          width: `${Math.min(100, pct)}%`,
          background: isFull ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--success)'
        }} />
      </div>

      {/* Footer row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {isFull
            ? <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Full — {enrolled - course.cap} over cap</span>
            : `${course.cap - enrolled} spot${course.cap - enrolled !== 1 ? 's' : ''} remaining`}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {breakdown.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {breakdown.map(b => (
                <span key={b.cohort} style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 999, color: 'var(--text-muted)' }}>
                  {b.cohort}: {b.count}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              const rows = [['Student ID', 'Name', 'Email', 'Cohort', 'Exchange', 'Status']]
              students.forEach(s => {
                const status = (s.enrolledCourses || []).includes(course.id) ? 'Enrolled'
                  : s.registeredCourses.includes(course.id) ? 'Registered'
                  : s.completedCourses.includes(course.id) ? 'Completed' : null
                if (status) rows.push([s.studentId, s.name, s.email, s.cohort, s.onExchange ? 'Yes' : 'No', status])
              })
              const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `${course.name.replace(/\s+/g, '-').toLowerCase()}${course.tag ? `-${course.tag.replace(/\s+/g, '-').toLowerCase()}` : ''}.csv`; a.click()
              URL.revokeObjectURL(url)
            }}
            style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}
            title="Export this course's enrollment as CSV"
          >
            ⬇ CSV
          </button>
          <button
            onClick={() => setShowPanel(v => !v)}
            style={{ fontSize: '0.7rem', padding: '2px 10px', background: showPanel ? 'var(--navy)' : 'transparent', color: showPanel ? 'white' : 'var(--navy)', border: '1px solid var(--navy)', borderRadius: 6, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
          >
            {showPanel ? '▲ Hide list' : `▼ ${registered} registered · ${enrolled} enrolled`}
          </button>
        </div>
      </div>

      {/* Student management panel */}
      {showPanel && (
        <CourseStudentPanel
          courseId={course.id}
          students={students}
          onRemove={onRemoveStudent}
          onEnroll={onEnrollStudent}
          onBatchEnroll={onBatchEnroll}
        />
      )}
    </div>
  )
}

// ── Time helper ─────────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Course Student Panel (Pending + Enrolled sections with filters & batch) ──
function CourseStudentPanel({ courseId, students, onRemove, onEnroll, onBatchEnroll }) {
  const [nameFilter, setNameFilter] = useState('')
  const [cohortFilter, setCohortFilter] = useState('all')
  const [exchangeFilter, setExchangeFilter] = useState('all')
  const [selected, setSelected] = useState(new Set())
  const [confirmId, setConfirmId] = useState(null)
  const [removeMsg, setRemoveMsg] = useState('')
  const [sortDir, setSortDir] = useState('asc') // 'asc' = earliest first, 'desc' = latest first

  // Pending = registered but not enrolled
  const pending = students.filter(s =>
    s.registeredCourses.includes(courseId) && !(s.enrolledCourses || []).includes(courseId)
  )
  // Enrolled = admin-approved
  const enrolled = students.filter(s => (s.enrolledCourses || []).includes(courseId))

  function applyFilters(list) {
    return list
      .filter(s => !nameFilter || s.name.toLowerCase().includes(nameFilter.toLowerCase()))
      .filter(s => cohortFilter === 'all' || s.cohort === cohortFilter)
      .filter(s => exchangeFilter === 'all' || (exchangeFilter === 'yes' ? s.onExchange : !s.onExchange))
  }

  const filteredPending = applyFilters(pending).sort((a, b) => {
    const tsA = a.registrationTimestamps?.[courseId] ? new Date(a.registrationTimestamps[courseId]).getTime() : 0
    const tsB = b.registrationTimestamps?.[courseId] ? new Date(b.registrationTimestamps[courseId]).getTime() : 0
    return sortDir === 'asc' ? tsA - tsB : tsB - tsA
  })
  const filteredEnrolled = applyFilters(enrolled)

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const ids = filteredPending.map(s => s.id)
    const allSelected = ids.every(id => selected.has(id))
    if (allSelected) {
      setSelected(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next })
    } else {
      setSelected(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next })
    }
  }

  function handleBatchEnroll() {
    const ids = [...selected].filter(id => filteredPending.some(s => s.id === id))
    if (ids.length === 0) return
    onBatchEnroll(ids)
    setSelected(new Set())
  }

  function doRemove(studentId, withMessage) {
    onRemove(studentId, withMessage ? removeMsg : '')
    setConfirmId(null)
    setRemoveMsg('')
  }

  const filterBar = (
    <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        value={nameFilter}
        onChange={e => setNameFilter(e.target.value)}
        placeholder="Search name..."
        style={{ fontSize: '0.78rem', padding: '4px 8px', width: 160, borderRadius: 6 }}
      />
      <select value={cohortFilter} onChange={e => setCohortFilter(e.target.value)}
        style={{ fontSize: '0.78rem', padding: '4px 6px', borderRadius: 6 }}>
        <option value="all">All Cohorts</option>
        {['J26 16mo', 'S26 16mo', 'J27 12mo', 'J27 16mo'].map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={exchangeFilter} onChange={e => setExchangeFilter(e.target.value)}
        style={{ fontSize: '0.78rem', padding: '4px 6px', borderRadius: 6 }}>
        <option value="all">All Exchange</option>
        <option value="yes">On Exchange</option>
        <option value="no">Not on Exchange</option>
      </select>
    </div>
  )

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      {filterBar}

      {/* ── Pending Registrations ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400E' }}>
            Pending Registrations ({filteredPending.length})
          </div>
          {selected.size > 0 && (
            <button
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.72rem', padding: '3px 12px' }}
              onClick={handleBatchEnroll}
            >
              Enroll Selected ({[...selected].filter(id => filteredPending.some(s => s.id === id)).length})
            </button>
          )}
        </div>
        {filteredPending.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '4px 0' }}>No pending registrations.</p>
        ) : (
          <div className="table-wrap">
            <table style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input type="checkbox"
                      checked={filteredPending.length > 0 && filteredPending.every(s => selected.has(s.id))}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Student</th>
                  <th>Cohort</th>
                  <th>Exchange</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                    Registered {sortDir === 'asc' ? '↑' : '↓'}
                  </th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.map(s => {
                  const ts = s.registrationTimestamps?.[courseId]
                  return (
                    <tr key={s.id}>
                      <td><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} /></td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{s.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.email}</div>
                      </td>
                      <td><span className="badge badge-navy" style={{ fontSize: '0.65rem' }}>{s.cohort}</span></td>
                      <td>
                        {s.onExchange
                          ? <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Exchange {s.exchangeChanged ? '⚠' : ''}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {ts ? timeAgo(ts) : '—'}
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.7rem', padding: '2px 10px' }}
                          onClick={() => onEnroll(s.id)}
                        >
                          Enroll
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Enrolled Students ── */}
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)', marginBottom: 8 }}>
          Enrolled ({filteredEnrolled.length})
        </div>
        {filteredEnrolled.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '4px 0' }}>No enrolled students yet.</p>
        ) : (
          <div className="table-wrap">
            <table style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Cohort</th>
                  <th>Exchange</th>
                  <th>Enrolled</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnrolled.map(s => {
                  const ts = (s.enrollmentTimestamps || {})[courseId]
                  const isConfirming = confirmId === s.id
                  return (
                    <React.Fragment key={s.id}>
                      <tr style={{ background: isConfirming ? 'var(--danger-bg)' : undefined }}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{s.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.email}</div>
                        </td>
                        <td><span className="badge badge-navy" style={{ fontSize: '0.65rem' }}>{s.cohort}</span></td>
                        <td>
                          {s.onExchange
                            ? <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Exchange {s.exchangeChanged ? '⚠' : ''}</span>
                            : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {ts ? timeAgo(ts) : '—'}
                        </td>
                        <td>
                          {isConfirming ? (
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => setConfirmId(null)}>Cancel</button>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.7rem', padding: '2px 10px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                              onClick={() => { setConfirmId(s.id); setRemoveMsg('') }}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                      {isConfirming && (
                        <tr style={{ background: 'var(--danger-bg)' }}>
                          <td colSpan={5} style={{ paddingTop: 0, paddingBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ fontSize: '0.78rem', color: 'var(--danger)', fontWeight: 600 }}>
                                Remove <strong>{s.name}</strong> from this course?
                              </div>
                              <textarea
                                value={removeMsg}
                                onChange={e => setRemoveMsg(e.target.value)}
                                placeholder="Optional message to student (leave blank to remove silently)..."
                                style={{ fontSize: '0.78rem', padding: '6px 10px', minHeight: 56, resize: 'vertical', borderColor: '#FCA5A5' }}
                              />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-danger btn-sm" style={{ fontSize: '0.75rem' }}
                                  onClick={() => doRemove(s.id, true)} disabled={!removeMsg.trim()}>
                                  Remove &amp; Notify
                                </button>
                                <button className="btn btn-ghost btn-sm"
                                  style={{ fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                  onClick={() => doRemove(s.id, false)}>
                                  Remove Silently
                                </button>
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}
                                  onClick={() => setConfirmId(null)}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Add Course Form ──────────────────────────────────────────────────────
function AddCourseForm({ onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [professor, setProfessor] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [duration, setDuration] = useState('18 hours')
  const [cap, setCap] = useState('30')
  const [week, setWeek] = useState('Feb')
  const [level, setLevel] = useState('Applied')
  const [format, setFormat] = useState('intensive')
  const [exchangeSafe, setExchangeSafe] = useState(true)
  const [mandatory, setMandatory] = useState(false)

  function submit() {
    if (!name.trim() || !startDate) return
    const id = `custom-${Date.now()}`
    const month = fmtDateRange(startDate, endDate || startDate)
    onAdd({
      id,
      name: name.trim(),
      tag: null,
      month,
      startDate,
      endDate: endDate || startDate,
      week,
      format,
      mandatory,
      exchangeSafe,
      cap: parseInt(cap) || 30,
      professor: professor.trim(),
      duration: duration.trim(),
      description: '',
      level,
      syllabusUrl: '',
    })
  }

  const inputSm = { fontSize: '0.875rem', padding: '8px 10px' }

  return (
    <div className="card mb-2" style={{ borderLeft: '4px solid var(--navy)' }}>
      <div className="card-header">
        <span className="card-title">Add New Course</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Fields marked * are required</span>
      </div>

      {/* Row 1: name, professor */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: '2 1 240px', margin: 0 }}>
          <label>Course Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. AI Strategy for Executives" style={inputSm} />
        </div>
        <div className="form-group" style={{ flex: '2 1 200px', margin: 0 }}>
          <label>Professor</label>
          <input value={professor} onChange={e => setProfessor(e.target.value)} placeholder="e.g. Prof. Cathy Yang" style={inputSm} />
        </div>
      </div>

      {/* Row 2: dates, duration, cap */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.875rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: '1 1 160px', margin: 0 }}>
          <label>Start Date *</label>
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); if (!endDate || e.target.value > endDate) setEndDate(e.target.value) }} style={inputSm} />
        </div>
        <div className="form-group" style={{ flex: '1 1 160px', margin: 0 }}>
          <label>End Date</label>
          <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} style={inputSm} />
        </div>
        <div className="form-group" style={{ flex: '1 1 120px', margin: 0 }}>
          <label>Duration</label>
          <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 18 hours" style={inputSm} />
        </div>
        <div className="form-group" style={{ flex: '0 1 80px', margin: 0 }}>
          <label>Cap *</label>
          <input type="number" value={cap} onChange={e => setCap(e.target.value)} min="1" style={inputSm} />
        </div>
      </div>

      {/* Date preview */}
      {startDate && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>📅</span>
          <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{fmtDateRange(startDate, endDate || startDate)}</span>
          <span>·</span>
          <span>{endDate && startDate !== endDate
            ? `${Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1} days`
            : '1 day'}</span>
        </div>
      )}

      {/* Row 3: slot, level, format, toggles */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: '1 1 160px', margin: 0 }}>
          <label>Slot (Week)</label>
          <select value={week} onChange={e => setWeek(e.target.value)} style={inputSm}>
            <option value="Feb">February Intensive</option>
            <option value="Mar">March Intensive</option>
            <option value="Oct">October Intensive</option>
            <option value="Dec">December Intensive</option>
            <option value="Jan-Mar">Jan–Mar Electives</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: '1 1 120px', margin: 0 }}>
          <label>Level</label>
          <select value={level} onChange={e => setLevel(e.target.value)} style={inputSm}>
            <option>Conceptual</option>
            <option>Applied</option>
            <option>Technical</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: '1 1 120px', margin: 0 }}>
          <label>Format</label>
          <select value={format} onChange={e => setFormat(e.target.value)} style={inputSm}>
            <option value="intensive">Intensive</option>
            <option value="elective">Elective</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', paddingBottom: 2 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text)', textTransform: 'none', letterSpacing: 0, margin: 0, cursor: 'pointer' }}>
            <input type="checkbox" checked={exchangeSafe} onChange={e => setExchangeSafe(e.target.checked)} />
            Exchange-safe
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text)', textTransform: 'none', letterSpacing: 0, margin: 0, cursor: 'pointer' }}>
            <input type="checkbox" checked={mandatory} onChange={e => setMandatory(e.target.checked)} />
            Mandatory
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={submit}
          disabled={!name.trim() || !startDate}
        >
          Add Course
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Student Detail Panel ─────────────────────────────────────────────────
function StudentDetailPanel({ student, courses, onUpdateStudent, onOpenChat }) {
  const completedFull = courses.filter(c => student.completedCourses.includes(c.id))
  const completedNames = new Set(completedFull.map(c => c.name))
  // Exclude any registered course whose name matches a completed course (e.g. AI Fundamentals cross-run)
  const registeredFull = courses.filter(c => student.registeredCourses.includes(c.id) && !completedNames.has(c.name))
  const isLegacy = student.cohort === 'J26 16mo'
  const flags = getFlags(student)
  const progress = getProgress(student)

  return (
    <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Student ID */}
      {student.studentId && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Student ID: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--navy)' }}>{student.studentId}</span>
        </div>
      )}

      {/* Progress strip */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 3 }}>Concentration Progress</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: progress.earned ? 'var(--success)' : 'var(--navy)' }}>
            {progress.completed} / {progress.required} courses
            {progress.earned ? ' ✓ Earned' : ''}
          </div>
          {!progress.hasMandatory && (
            <div style={{ fontSize: '0.72rem', color: 'var(--warning)', marginTop: 2 }}>⚠ Missing mandatory AI Fundamentals</div>
          )}
        </div>
        {student.onExchange && (
          <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>On Exchange</span>
        )}
      </div>

      {/* Prior-year completions */}
      {completedFull.length > 0 && (
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>
            {isLegacy ? `Concentration Completed (${completedFull.length})` : `Prior Year Completions (${completedFull.length})`}
            <span style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--success)' }}>— counts toward concentration</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {completedFull.map(c => (
              <div key={c.id} style={{ padding: '6px 10px', background: 'var(--success-bg)', border: '1px solid #86EFAC', borderRadius: 8, fontSize: '0.78rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{c.name} ✓</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{isLegacy ? 'Completed 2026–27' : 'Completed prior year'}</div>
                {c.mandatory && <span className="badge badge-navy" style={{ fontSize: '0.6rem', marginTop: 3, display: 'inline-block' }}>Mandatory</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2027–28 Registered Courses */}
      {registeredFull.length > 0 && (
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>
            Registered for 2027–28 ({registeredFull.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {registeredFull.map(c => (
              <div key={c.id} style={{ padding: '6px 10px', background: 'white', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.78rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{c.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.month}</div>
                {c.mandatory && <span className="badge badge-navy" style={{ fontSize: '0.6rem', marginTop: 3, display: 'inline-block' }}>Mandatory</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {registeredFull.length === 0 && completedFull.length === 0 && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No courses registered or completed yet.</div>
      )}

      {/* Flags */}
      {flags.filter(f => f.type !== 'note').length > 0 && (
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 6 }}>Flags</div>
          {flags.filter(f => f.type !== 'note').map((f, i) => (
            <div key={i} style={{ fontSize: '0.78rem', padding: '6px 10px', background: f.type === 'critical' ? 'var(--danger-bg)' : 'var(--warning-bg)', borderRadius: 6, marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: f.type === 'critical' ? 'var(--danger)' : 'var(--warning)' }}>{f.label}: </span>
              <span style={{ color: 'var(--text-muted)' }}>{f.detail}</span>
            </div>
          ))}
        </div>
      )}

      {/* Messages preview — suppressed for J26 16mo (concentration done, exchange in past) */}
      {student.cohort !== 'J26 16mo' && (student.messages || []).length > 0 && (
        <div style={{ fontSize: '0.78rem', padding: '8px 12px', background: 'white', borderRadius: 8, borderLeft: '3px solid var(--info)' }}>
          <div style={{ fontWeight: 600, color: 'var(--info)', marginBottom: 4 }}>💬 {(student.messages || []).length} message{(student.messages || []).length !== 1 ? 's' : ''}</div>
          <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.78rem' }}>
            Latest: {(student.messages || []).slice(-1)[0]?.text || ''}
          </p>
        </div>
      )}

      {/* Past admin notifications */}
      {student.notifications && student.notifications.filter(n => n.from === 'admin').length > 0 && (
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 6 }}>
            Sent Notifications
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {student.notifications.filter(n => n.from === 'admin').slice(-3).map((n, i) => (
              <div key={i} style={{ fontSize: '0.75rem', padding: '5px 10px', background: 'white', border: '1px solid var(--border)', borderRadius: 6 }}>
                <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>{timeAgo(n.ts)}</span>
                <span style={{ color: 'var(--text)' }}>{n.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open chat button */}
      <div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: '0.78rem' }}
          onClick={onOpenChat}
        >
          ✉ Open chat with student
        </button>
      </div>
    </div>
  )
}

// ── Roster Upload Panel ──────────────────────────────────────────────────
// ── Historical Courses Panel ─────────────────────────────────────────────
function HistoricalCoursesPanel({ courses, students, historicalEnrollments, onImport, onRemove }) {
  const [expandedId, setExpandedId] = useState(null)
  const [importingId, setImportingId] = useState(null)

  return (
    <div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        Import 2026–27 enrollment records for each course. Matched students (J26 16mo &amp; S26 16mo) will have their
        <strong> Concentration Completed</strong> list updated automatically.
      </p>
      {courses.map(course => {
        const enrolled = historicalEnrollments[course.id] || []
        const enrolledStudents = enrolled.map(sid => students.find(s => s.studentId === sid)).filter(Boolean)
        const isExpanded = expandedId === course.id
        const isImporting = importingId === course.id
        return (
          <div key={course.id} className="card mb-2">
            <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : course.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="card-title" style={{ fontSize: '0.9rem' }}>{course.name}</span>
                {course.tag && <span className="badge badge-muted" style={{ fontSize: '0.62rem' }}>{course.tag}</span>}
                {course.mandatory && <span className="badge badge-navy" style={{ fontSize: '0.62rem' }}>Mandatory</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{course.month}</span>
                {enrolled.length > 0
                  ? <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{enrolled.length} enrolled</span>
                  : <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>No data</span>}
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {isExpanded && (
              <div style={{ paddingTop: 8 }}>
                {/* Import section */}
                <div style={{ marginBottom: 12 }}>
                  {!isImporting ? (
                    <button className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}
                      onClick={e => { e.stopPropagation(); setImportingId(course.id) }}>
                      ⬆ Import enrollment CSV
                    </button>
                  ) : (
                    <HistoricalImportForm
                      courseId={course.id}
                      courseName={course.name}
                      existingIds={enrolled}
                      onImport={(ids) => { onImport(course.id, ids); setImportingId(null) }}
                      onCancel={() => setImportingId(null)}
                    />
                  )}
                </div>

                {/* Enrolled student list */}
                {enrolledStudents.length > 0 ? (
                  <div className="table-wrap" style={{ maxHeight: 240, overflow: 'auto' }}>
                    <table style={{ fontSize: '0.78rem' }}>
                      <thead>
                        <tr>
                          <th>Student</th><th>Student ID</th><th>Cohort</th><th style={{ width: 60 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrolledStudents.map(s => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{s.name}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.studentId}</td>
                            <td><span className="badge badge-navy" style={{ fontSize: '0.62rem' }}>{s.cohort}</span></td>
                            <td>
                              <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem', color: 'var(--danger)', padding: '1px 6px' }}
                                onClick={() => onRemove(course.id, s.studentId)}>Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No enrollment data imported yet.</p>
                )}

                {/* Students in CSV but not found */}
                {enrolled.filter(sid => !students.find(s => s.studentId === sid)).length > 0 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--warning)', marginTop: 6 }}>
                    ⚠ {enrolled.filter(sid => !students.find(s => s.studentId === sid)).length} imported ID(s) not matched to any student
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function HistoricalImportForm({ courseId, courseName, existingIds, onImport, onCancel }) {
  const fileRef = useRef(null)
  const [parsed, setParsed] = useState(null)
  const [loading, setLoading] = useState(false)

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return { ids: [], errors: ['File must have a header row and at least one data row.'] }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
    const idIdx = headers.findIndex(h => h === 'studentid' || h === 'student_id' || h === 'id')
    if (idIdx === -1) return { ids: [], errors: ['Missing required column: studentId'] }
    const ids = [], errors = []
    lines.slice(1).forEach((line, i) => {
      const cols = line.split(',').map(c => c.trim().replace(/['"]/g, ''))
      const sid = cols[idIdx] || ''
      if (!sid) { errors.push(`Row ${i + 2}: missing studentId`); return }
      if (!/^S\d{6}$/.test(sid)) { errors.push(`Row ${i + 2}: invalid ID "${sid}"`); return }
      if (existingIds.includes(sid)) return // already imported, skip silently
      ids.push(sid)
    })
    return { ids: [...new Set(ids)], errors }
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    const reader = new FileReader()
    reader.onload = (ev) => { setLoading(false); setParsed(parseCSV(ev.target.result)) }
    reader.readAsText(file)
  }

  return (
    <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 10 }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}>
        Import enrollment for {courseName}
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
        CSV must have a <code>studentId</code> column (S + 6 digits). One student per row.
      </p>
      {!parsed ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ fontSize: '0.78rem' }} />
          {loading && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Parsing…</span>}
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }} onClick={onCancel}>Cancel</button>
        </div>
      ) : (
        <>
          {parsed.errors.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {parsed.errors.map((e, i) => (
                <div key={i} style={{ fontSize: '0.72rem', color: 'var(--danger)', padding: '3px 6px', background: 'var(--danger-bg)', borderRadius: 4, marginBottom: 3 }}>⚠ {e}</div>
              ))}
            </div>
          )}
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
            Ready to import <strong style={{ color: 'var(--navy)' }}>{parsed.ids.length}</strong> new student ID{parsed.ids.length !== 1 ? 's' : ''}
            {parsed.errors.length > 0 && <span style={{ color: 'var(--warning)', marginLeft: 6 }}>({parsed.errors.length} rows skipped)</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}
              disabled={parsed.ids.length === 0}
              onClick={() => onImport(parsed.ids)}>
              ✓ Import {parsed.ids.length} student{parsed.ids.length !== 1 ? 's' : ''}
            </button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }}
              onClick={() => { setParsed(null); if (fileRef.current) fileRef.current.value = '' }}>
              ← Choose different file
            </button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }} onClick={onCancel}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Roster Upload Panel ──────────────────────────────────────────────────
function RosterUploadPanel({ onBulkAdd, onClose, existingStudents }) {
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  const VALID_COHORTS = ['J26 16mo', 'S26 16mo', 'J27 12mo', 'J27 16mo']
  const MANDATORY_MAP = {
    'J26 16mo': 'ai-fund-feb',
    'S26 16mo': 'ai-fund-feb',
    'J27 12mo': 'ai-fund-dec',
    'J27 16mo': null,
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return { rows: [], errors: ['File must have a header row and at least one data row.'] }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
    const nameIdx = headers.indexOf('name')
    const cohortIdx = headers.indexOf('cohort')
    const emailIdx = headers.indexOf('email')
    const exchangeIdx = headers.findIndex(h => h === 'onexchange' || h === 'exchange')
    const studentIdIdx = headers.findIndex(h => h === 'studentid' || h === 'student_id')

    const errors = []
    if (studentIdIdx === -1) errors.push('Missing required column: studentId')
    if (nameIdx === -1) errors.push('Missing required column: name')
    if (cohortIdx === -1) errors.push('Missing required column: cohort')
    if (errors.length > 0) return { rows: [], errors }

    const rows = []
    const rowErrors = []
    const seenIds = new Set()

    lines.slice(1).forEach((line, i) => {
      const cols = []
      let cur = '', inQ = false
      for (const ch of line + ',') {
        if (ch === '"') { inQ = !inQ }
        else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
        else cur += ch
      }
      const studentId = (cols[studentIdIdx] || '').trim()
      const name = cols[nameIdx] || ''
      const cohort = cols[cohortIdx] || ''
      const email = emailIdx >= 0 ? (cols[emailIdx] || '') : ''
      const onExchange = exchangeIdx >= 0 ? ['true', '1', 'yes'].includes((cols[exchangeIdx] || '').toLowerCase()) : false

      if (!studentId) { rowErrors.push(`Row ${i + 2}: missing studentId`); return }
      if (!/^S\d{6}$/.test(studentId)) { rowErrors.push(`Row ${i + 2}: invalid studentId "${studentId}" — must be S + 6 digits`); return }
      if (seenIds.has(studentId)) { rowErrors.push(`Row ${i + 2}: duplicate studentId "${studentId}" in file`); return }
      if (existingStudents && existingStudents.some(s => s.studentId === studentId)) { rowErrors.push(`Row ${i + 2}: studentId "${studentId}" already exists`); return }
      seenIds.add(studentId)
      if (!name) { rowErrors.push(`Row ${i + 2}: missing name`); return }
      if (!VALID_COHORTS.includes(cohort)) {
        rowErrors.push(`Row ${i + 2}: invalid cohort "${cohort}" — must be one of ${VALID_COHORTS.join(', ')}`)
        return
      }
      rows.push({ studentId, name, email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@hec.edu`, cohort, onExchange })
    })

    return { rows, errors: rowErrors }
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    const reader = new FileReader()
    reader.onload = (ev) => { setLoading(false); setPreview(parseCSV(ev.target.result)) }
    reader.readAsText(file)
  }

  function confirmUpload() {
    if (!preview || preview.rows.length === 0) return
    const newStudents = preview.rows.map(r => {
      const mandatory = r.cohort === 'J27 16mo'
        ? (r.onExchange ? 'ai-fund-feb' : 'ai-fund-dec')
        : MANDATORY_MAP[r.cohort]
      return {
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        studentId: r.studentId,
        name: r.name, email: r.email, cohort: r.cohort,
        concentrationOptIn: null,
        onExchange: r.onExchange, exchangeChanged: false,
        registeredCourses: mandatory ? [mandatory] : [],
        completedCourses: [],
        messages: [],
        notifications: [], registrationTimestamps: {},
      }
    })
    onBulkAdd(newStudents)
  }

  return (
    <div className="card mb-2" style={{ borderLeft: '4px solid var(--navy)' }}>
      <div className="card-header">
        <span className="card-title">⬆ Upload Roster</span>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Cancel</button>
      </div>

      {!preview ? (
        <>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
            Upload a CSV with columns: <strong>studentId</strong> (required), <strong>name</strong> (required), <strong>cohort</strong> (required), <em>email</em>, <em>onExchange</em>.<br />
            Student ID format: <code>S</code> + 6 digits (e.g., <code>S123456</code>).<br />
            Valid cohorts: <code>J26 16mo</code> · <code>S26 16mo</code> · <code>J27 12mo</code> · <code>J27 16mo</code>
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ fontSize: '0.85rem' }} />
            {loading && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Parsing…</span>}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
            💡 Example: <code>S200001,Alice Martin,J27 16mo,alice.martin@hec.edu,false</code>
          </p>
        </>
      ) : (
        <>
          {preview.errors.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              {preview.errors.map((e, i) => (
                <div key={i} style={{ fontSize: '0.78rem', color: 'var(--danger)', padding: '4px 8px', background: 'var(--danger-bg)', borderRadius: 6, marginBottom: 4 }}>
                  ⚠ {e}
                </div>
              ))}
            </div>
          )}
          {preview.rows.length > 0 ? (
            <>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Ready to import <strong>{preview.rows.length}</strong> student{preview.rows.length !== 1 ? 's' : ''}
                {preview.errors.length > 0 && <span style={{ color: 'var(--warning)', marginLeft: 6 }}>({preview.errors.length} rows skipped)</span>}
              </div>
              <div className="table-wrap" style={{ maxHeight: 200, overflow: 'auto', marginBottom: '0.75rem' }}>
                <table style={{ fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      <th>Student ID</th><th>Name</th><th>Cohort</th><th>Email</th><th>Exchange</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{r.studentId}</td>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td><span className="badge badge-navy" style={{ fontSize: '0.65rem' }}>{r.cohort}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{r.email}</td>
                        <td>{r.onExchange ? <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Yes</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary btn-sm" onClick={confirmUpload}>
                  ✓ Import {preview.rows.length} Student{preview.rows.length !== 1 ? 's' : ''}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = '' }}>
                  ← Choose Different File
                </button>
              </div>
            </>
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No valid rows found. Check the errors above and try a different file.
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Add Student Form ────────────────────────────────────────────────────
function AddStudentForm({ students, onAdd, onCancel }) {
  const [studentId, setStudentId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cohort, setCohort] = useState('J27 16mo')
  const [onExchange, setOnExchange] = useState(false)
  const [selectedCourses, setSelectedCourses] = useState([])
  const [courseSearch, setCourseSearch] = useState('')
  const [error, setError] = useState('')

  const validId = /^S\d{6}$/.test(studentId)
  const duplicateId = validId && students.some(s => s.studentId === studentId)

  const filteredCourses = COURSES.filter(c =>
    !selectedCourses.includes(c.id) &&
    (c.name.toLowerCase().includes(courseSearch.toLowerCase()) || c.id.toLowerCase().includes(courseSearch.toLowerCase()))
  )

  function toggleCourse(courseId) {
    setSelectedCourses(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId])
    setCourseSearch('')
  }

  function submit() {
    if (!name.trim()) { setError('Name is required'); return }
    if (!validId) { setError('Student ID must be S + 6 digits (e.g., S123456)'); return }
    if (duplicateId) { setError(`Student ID ${studentId} already exists`); return }
    setError('')
    const id = `custom-${Date.now()}`
    const mandatoryMap = {
      'J26 16mo': 'ai-fund-feb',
      'S26 16mo': 'ai-fund-feb',
      'J27 12mo': 'ai-fund-dec',
      'J27 16mo': onExchange ? 'ai-fund-feb' : 'ai-fund-dec',
    }
    onAdd({
      id,
      studentId,
      name: name.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@hec.edu`,
      cohort,
      concentrationOptIn: null,
      onExchange,
      exchangeChanged: false,
      registeredCourses: [mandatoryMap[cohort]],
      completedCourses: selectedCourses,
      messages: [],
    })
  }

  return (
    <div className="card mb-2" style={{ borderLeft: '4px solid var(--navy)' }}>
      <div className="card-header"><span className="card-title">Add Student</span></div>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <div className="form-group" style={{ flex: '0 0 120px', margin: 0 }}>
          <label>Student ID *</label>
          <input value={studentId} onChange={e => setStudentId(e.target.value.toUpperCase())} placeholder="S123456"
            style={{ fontFamily: 'monospace', borderColor: studentId && !validId ? 'var(--danger)' : duplicateId ? 'var(--danger)' : undefined }} />
          {studentId && !validId && <div style={{ color: 'var(--danger)', fontSize: '0.68rem', marginTop: 2 }}>S + 6 digits</div>}
          {duplicateId && <div style={{ color: 'var(--danger)', fontSize: '0.68rem', marginTop: 2 }}>ID already exists</div>}
        </div>
        <div className="form-group" style={{ flex: '1 1 180px', margin: 0 }}>
          <label>Full name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="First Last" />
        </div>
        <div className="form-group" style={{ flex: '1 1 200px', margin: 0 }}>
          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="auto-generated if blank" />
        </div>
        <div className="form-group" style={{ flex: '1 1 140px', margin: 0 }}>
          <label>Cohort *</label>
          <select value={cohort} onChange={e => setCohort(e.target.value)}>
            {['J26 16mo', 'S26 16mo', 'J27 12mo', 'J27 16mo'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: '0 0 auto', margin: 0, justifyContent: 'flex-end' }}>
          <label style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
            <input type="checkbox" checked={onExchange} onChange={e => setOnExchange(e.target.checked)} style={{ marginRight: 6 }} />
            On exchange
          </label>
        </div>
      </div>
      <div className="form-group" style={{ margin: '0 0 0.75rem 0' }}>
        <label>Completed Courses</label>
        {selectedCourses.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {selectedCourses.map(id => {
              const c = COURSES.find(c => c.id === id)
              return (
                <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'var(--success-bg)', border: '1px solid #86EFAC', borderRadius: 6, fontSize: '0.72rem', color: 'var(--navy)' }}>
                  {c?.name || id}
                  <span style={{ cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 700, marginLeft: 2 }} onClick={() => toggleCourse(id)}>×</span>
                </span>
              )
            })}
          </div>
        )}
        <input value={courseSearch} onChange={e => setCourseSearch(e.target.value)} placeholder="Search courses to add…" />
        {courseSearch && filteredCourses.length > 0 && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 6, marginTop: 4, maxHeight: 150, overflow: 'auto', background: 'white' }}>
            {filteredCourses.map(c => (
              <div key={c.id} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.78rem', borderBottom: '1px solid var(--border)' }}
                onClick={() => toggleCourse(c.id)}
                onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{c.name}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{c.month}</span>
              </div>
            ))}
          </div>
        )}
        {courseSearch && filteredCourses.length === 0 && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>No matching courses found</div>
        )}
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={!name.trim() || !validId || duplicateId}>Add Student</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
