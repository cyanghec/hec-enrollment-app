import { useState } from 'react'
import { COHORT_LABELS } from '../data/courses'
import { getDaysUntilDeadline, isDeadlinePassed, isDeadlineUrgent } from '../utils/eligibility'

export default function LoginScreen({ students, courses, settings, onStudentLogin, onAdminLogin }) {
  const [selectedStudent, setSelectedStudent] = useState('')

  // Find earliest upcoming course deadline
  const courseDeadlines = (courses || [])
    .filter(c => c.registrationDeadline)
    .map(c => ({ deadline: c.registrationDeadline, days: getDaysUntilDeadline(c.registrationDeadline) }))
  const upcoming = courseDeadlines.filter(d => d.days !== null && d.days >= 0).sort((a, b) => a.days - b.days)
  const nearest = upcoming[0]
  const allPassed = courseDeadlines.length > 0 && upcoming.length === 0

  const deadline = nearest?.deadline || (allPassed ? courseDeadlines[0]?.deadline : null)
  const daysLeft = nearest?.days ?? null
  const deadlinePassed = allPassed
  const deadlineUrgent = isDeadlineUrgent(deadline)

  const undecidedCount = students.filter(s => s.concentrationOptIn === null).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="topbar-logo">HEC</div>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: 600 }}>
          Tech &amp; AI Concentration
        </span>
      </div>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: 880 }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-block',
              background: 'var(--gold)',
              color: 'var(--navy)',
              padding: '4px 14px',
              borderRadius: 999,
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '1rem'
            }}>
              2027–28 Enrollment
            </div>
            <h1 style={{ color: 'white', fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '0.75rem' }}>
              Tech &amp; AI Concentration
            </h1>
          </div>

          {/* Deadline banner */}
          {deadline && !deadlinePassed && undecidedCount > 0 && (
            <div style={{
              maxWidth: 600,
              margin: '0 auto 1.5rem',
              padding: '12px 20px',
              borderRadius: 10,
              background: deadlineUrgent ? 'rgba(251, 191, 36, 0.15)' : 'rgba(96, 165, 250, 0.15)',
              border: `1px solid ${deadlineUrgent ? 'rgba(251, 191, 36, 0.3)' : 'rgba(96, 165, 250, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <span style={{ fontSize: '1.2rem' }}>{deadlineUrgent ? '⚠️' : '📅'}</span>
              <div>
                <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>
                  {daysLeft} day{daysLeft !== 1 ? 's' : ''} left to register interest
                </div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>
                  {undecidedCount} student{undecidedCount !== 1 ? 's' : ''} haven't responded yet
                </div>
              </div>
            </div>
          )}

          {deadline && deadlinePassed && undecidedCount > 0 && (
            <div style={{
              maxWidth: 600,
              margin: '0 auto 1.5rem',
              padding: '12px 20px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <span style={{ fontSize: '1.2rem' }}>🔴</span>
              <div>
                <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>
                  Registration deadline has passed
                </div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>
                  {undecidedCount} student{undecidedCount !== 1 ? 's' : ''} did not respond
                </div>
              </div>
            </div>
          )}

          <div className="grid-2" style={{ gap: '1.5rem' }}>
            {/* Student card */}
            <div style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 14,
              padding: '2rem',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🎓</div>
              <h2 style={{ color: 'white', fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Student Portal
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Indicate your interest, select courses, and manage your concentration registration.
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px', marginBottom: 6, display: 'block', fontWeight: 600 }}>
                  Demo — login as
                </label>
                <select
                  value={selectedStudent}
                  onChange={e => setSelectedStudent(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: selectedStudent ? 'white' : 'rgba(255,255,255,0.4)', borderRadius: 8, padding: '9px 12px', width: '100%', fontSize: '0.875rem' }}
                >
                  <option value="">Select a student...</option>
                  {['J26 16mo', 'S26 16mo', 'J27 12mo', 'J27 16mo'].map(cohort => (
                    <optgroup key={cohort} label={cohort + ' — ' + COHORT_LABELS[cohort]}>
                      {students.filter(s => s.cohort === cohort).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}{s.exchangeChanged ? ' ⚠️' : s.concentrationOptIn === null ? ' ?' : s.concentrationOptIn === false ? ' ✗' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-gold"
                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                disabled={!selectedStudent}
                onClick={() => onStudentLogin(selectedStudent)}
              >
                Enter Student Portal →
              </button>
            </div>

            {/* Admin card */}
            <div style={{
              background: 'rgba(200,169,81,0.12)',
              border: '1px solid rgba(200,169,81,0.3)',
              borderRadius: 14,
              padding: '2rem',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚙️</div>
              <h2 style={{ color: 'white', fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Admin Dashboard
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Manage cohorts, set course caps &amp; dates, review student interest and handle exchange flags.
              </p>

              <div style={{ marginBottom: '1.5rem' }}>
                {[
                  { icon: '👥', label: `${students.length} students enrolled` },
                  { icon: '✅', label: `${students.filter(s => s.concentrationOptIn === true).length} interested in concentration` },
                  { icon: '⚠️', label: `${students.filter(s => s.exchangeChanged).length} flags pending` },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                    <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{item.label}</span>
                  </div>
                ))}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '10px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
                onClick={onAdminLogin}
              >
                Enter Admin Dashboard →
              </button>
            </div>
          </div>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '2rem' }}>
            HEC Paris · Tech &amp; AI Concentration · Demo
          </p>
        </div>
      </div>
    </div>
  )
}
