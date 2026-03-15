import { useState, useRef, useEffect } from 'react'
import { COHORT_LABELS } from '../../data/courses'
import { getEligibleCourseIds, getMandatoryCourse, hasExchangeConflict, getDaysUntilDeadline, isDeadlinePassed, isDeadlineUrgent, getUnreadCount } from '../../utils/eligibility'

const LEVEL_COLORS = {
  Conceptual: { bg: '#EFF6FF', color: '#1D4ED8' },
  Applied:    { bg: '#F0FDF4', color: '#15803D' },
  Technical:  { bg: '#FDF4FF', color: '#7E22CE' },
}

export default function StudentPortal({ student, courses, settings, updateStudent, sendMessage, onBack }) {
  const [tab, setTab] = useState('register')
  const [exchangeStatus, setExchangeStatus] = useState(student.onExchange ? 'yes' : 'no')
  const [saved, setSaved] = useState(false)

  const mandatoryId = student.concentrationOptIn === false ? null : getMandatoryCourse(student.cohort, student.onExchange)
  const eligibleIds = getEligibleCourseIds(student.cohort, student.onExchange)
  const completedCourses = courses.filter(c => student.completedCourses.includes(c.id))
  const completedNames = new Set(completedCourses.map(c => c.name))
  // Exclude courses whose name matches a completed course OR the mandatory course (e.g. ai-fund-feb shouldn't appear as elective when ai-fund-dec is mandatory)
  const mandatoryName = mandatoryId ? courses.find(c => c.id === mandatoryId)?.name : null
  const eligibleCourses = courses.filter(c => eligibleIds.includes(c.id) && !completedNames.has(c.name) && c.id !== mandatoryId && (mandatoryName == null || c.name !== mandatoryName))
  const enrolledCourses = courses.filter(c => (student.enrolledCourses || []).includes(c.id))
  const registeredCourses = courses.filter(c => student.registeredCourses.includes(c.id) && !(student.enrolledCourses || []).includes(c.id) && !completedNames.has(c.name))
  const totalProgress = student.completedCourses.length + (student.enrolledCourses || []).length

  // Per-course deadlines: find the nearest upcoming one for the banner
  const courseDeadlines = eligibleCourses.filter(c => c.registrationDeadline).map(c => ({ id: c.id, deadline: c.registrationDeadline, days: getDaysUntilDeadline(c.registrationDeadline) }))
  const upcomingDeadlines = courseDeadlines.filter(d => d.days !== null && d.days >= 0).sort((a, b) => a.days - b.days)
  const nearestDeadline = upcomingDeadlines[0]
  const deadline = nearestDeadline?.deadline
  const daysLeft = nearestDeadline?.days ?? null
  const deadlinePassed = false // nearest is always upcoming
  const deadlineUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7

  function isCourseDeadlinePassed(courseId) {
    const course = courses.find(c => c.id === courseId)
    return course?.registrationDeadline ? isDeadlinePassed(course.registrationDeadline) : false
  }

  function toggleCourse(courseId) {
    if (student.completedCourses.length >= 3) return
    if (courseId === mandatoryId) return
    if (student.completedCourses.includes(courseId)) return
    const courseName = courses.find(c => c.id === courseId)?.name
    if (courseName && completedNames.has(courseName)) return
    if (isCourseDeadlinePassed(courseId)) return
    const current = student.registeredCourses
    const isAdding = !current.includes(courseId)
    const updated = isAdding ? [...current, courseId] : current.filter(id => id !== courseId)
    const timestamps = { ...(student.registrationTimestamps || {}) }
    if (isAdding) timestamps[courseId] = new Date().toISOString()
    else delete timestamps[courseId]
    updateStudent({ registeredCourses: updated, registrationTimestamps: timestamps })
  }

  function dismissNotification(id) {
    updateStudent({ notifications: (student.notifications || []).map(n => n.id === id ? { ...n, read: true } : n) })
  }

  function saveUpdate() {
    const newOnExchange = exchangeStatus === 'yes'
    const changed = newOnExchange !== student.onExchange
    updateStudent({
      onExchange: newOnExchange,
      exchangeChanged: changed || student.exchangeChanged,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function setOptIn(val) {
    updateStudent({ concentrationOptIn: val })
  }

  const concentrationEarned = student.completedCourses.length >= 3

  // ── No response — interest survey ──────────────────────────────────
  if (student.concentrationOptIn === null) {
    return (
      <div className="page">
        <PortalTopbar onBack={onBack} />
        <div className="content" style={{ maxWidth: 640 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>{student.name}</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge badge-navy">{student.cohort}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{COHORT_LABELS[student.cohort]}</span>
              {student.onExchange && <span className="badge badge-warning">On Exchange</span>}
            </div>
          </div>

          {/* Deadline banner */}
          {deadline && !deadlinePassed && (
            <div className={`alert ${deadlineUrgent ? 'alert-warning' : 'alert-info'}`} style={{ marginBottom: '1.25rem' }}>
              <span className="alert-icon">{deadlineUrgent ? '⚠️' : '📅'}</span>
              <div>
                <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</strong> to indicate your interest in the Tech &amp; AI Concentration.
                {deadlineUrgent && <div style={{ fontSize: '0.85rem', marginTop: 4 }}>Don't miss the deadline — respond now to secure your spot.</div>}
              </div>
            </div>
          )}

          <div className="card" style={{ padding: '2.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎯</div>
              <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>
                {deadlinePassed ? 'Survey deadline passed' : 'Are you interested in the Tech & AI Concentration?'}
              </h2>
              <p style={{ color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
                {deadlinePassed
                  ? 'You did not respond before the deadline. You have been assumed opted out. Contact your programme office if you wish to reconsider.'
                  : 'The Tech & AI Concentration requires completing 3 courses (1 mandatory + 2 electives). Indicate your interest to see available courses and register.'}
              </p>
            </div>

            {student.completedCourses.length > 0 && (
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)', marginBottom: 8 }}>
                  You've already completed {student.completedCourses.length} course{student.completedCourses.length > 1 ? 's' : ''}:
                </div>
                {completedCourses.map(c => (
                  <div key={c.id} style={{ fontSize: '0.85rem', color: 'var(--text)', padding: '2px 0' }}>
                    ✓ {c.name} {c.tag ? `(${c.tag})` : ''}
                  </div>
                ))}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  {3 - student.completedCourses.length > 0
                    ? `${3 - student.completedCourses.length} more needed for the concentration.`
                    : 'You already meet the requirement!'}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="btn btn-gold" style={{ justifyContent: 'center', padding: '12px' }} onClick={() => setOptIn(true)}>
                Yes, I'm interested in the concentration
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: 'center' }} onClick={() => setOptIn(false)}>
                No, I don't want the concentration
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Opted in — full portal ────────────────────────────────────────────
  const unreadNotifs = (student.notifications || []).filter(n => !n.read)
  const unreadAdminMsgs = getUnreadCount(student, 'admin')

  return (
    <div className="page">
      <PortalTopbar onBack={onBack} />
      <div className="content">

        {/* Opted-out banner */}
        {student.concentrationOptIn === false && (
          <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
            <span className="alert-icon">📋</span>
            <div style={{ flex: 1 }}>
              You indicated you don't want to pursue the concentration — but you can still register for individual courses below. Note: <strong>AI Fundamentals is required</strong> to earn the concentration if you change your mind.
            </div>
            <button
              onClick={() => setOptIn(null)}
              style={{ background: 'none', border: '1px solid var(--info)', borderRadius: 6, cursor: 'pointer', color: 'var(--info)', fontSize: '0.75rem', padding: '3px 10px', flexShrink: 0, fontWeight: 600 }}
            >
              Reconsider
            </button>
          </div>
        )}

        {/* Admin notifications */}
        {unreadNotifs.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            {unreadNotifs.map(n => (
              <div key={n.id} className="alert alert-warning" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
                <span className="alert-icon">📣</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 3 }}>
                    You've been removed from <strong>{n.courseName}</strong>
                  </div>
                  {n.message && <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{n.message}</div>}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(n.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  onClick={() => dismissNotification(n.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--warning)', fontSize: '1rem', padding: '0 4px', flexShrink: 0 }}
                  title="Dismiss"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Deadline reminder for opted-in students */}
        {deadline && !deadlinePassed && totalProgress < 3 && (
          <div className={`alert ${deadlineUrgent ? 'alert-warning' : 'alert-info'}`} style={{ marginBottom: '1.25rem' }}>
            <span className="alert-icon">{deadlineUrgent ? '⚠️' : '📅'}</span>
            <div>
              <strong>Registration closes in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.</strong>
              {' '}Select your courses before the deadline.
            </div>
          </div>
        )}

        {/* Concentration earned banner */}
        {concentrationEarned && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #86EFAC', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🎓</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem' }}>Concentration Complete</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>You've completed {student.completedCourses.length} courses. You can still register for additional courses below.</div>
            </div>
          </div>
        )}

        {/* Profile header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>{student.name}</h1>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge badge-navy">{student.cohort}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{COHORT_LABELS[student.cohort]}</span>
              {student.onExchange && <span className="badge badge-warning">On Exchange</span>}
              {student.exchangeChanged && <span className="badge badge-danger">⚠ Exchange Updated</span>}
            </div>
          </div>

          {/* Registration tracker */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.5rem', minWidth: 200, textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 6 }}>
              Progress
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>
              {totalProgress}
              <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}> / 3 courses</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: totalProgress >= 3 ? 'var(--success)' : 'var(--text-muted)', marginTop: 6 }}>
              {student.completedCourses.length > 0 && `${student.completedCourses.length} completed · `}
              {(student.enrolledCourses || []).length > 0 && `${(student.enrolledCourses || []).length} enrolled · `}
              {registeredCourses.length > 0 && `${registeredCourses.length} pending · `}
              {totalProgress >= 3 ? '✓ Meets requirement' : `${Math.max(0, 3 - totalProgress)} more needed`}
            </div>
          </div>
        </div>

        {/* Exchange conflict alert */}
        {student.onExchange && [...student.registeredCourses, ...(student.enrolledCourses || [])].some(id => hasExchangeConflict(id, true)) && (
          <div className="alert alert-warning mb-2">
            <span className="alert-icon">⚠️</span>
            <div>
              <strong>Exchange conflict detected.</strong> Some selected courses fall during the Sep–Dec exchange window (Oct &amp; Dec intensives). Please update your selection or contact admin.
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          {[
            { id: 'register', label: '📋 Course Registration' },
            { id: 'messages', label: `💬 Messages${unreadAdminMsgs > 0 ? ` (${unreadAdminMsgs})` : ''}` },
            { id: 'details', label: '✏️ My Details' },
          ].map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Course Registration ─────────────────────────── */}
        {tab === 'register' && (
          <div>
            {/* Completed courses section */}
            {completedCourses.length > 0 && (
              <div className="mb-3">
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Completed Courses
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {completedCourses.map(course => (
                    <CourseCard key={course.id} course={course} completed />
                  ))}
                </div>
              </div>
            )}

            {/* Mandatory course */}
            {mandatoryId && !student.completedCourses.includes(mandatoryId) && (
              <div className="mb-3">
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Required Course
                </h3>
                {courses.filter(c => c.id === mandatoryId).map(course => (
                  <CourseCard key={course.id} course={course} selected mandatory
                    enrolled={(student.enrolledCourses || []).includes(course.id)}
                    pending={student.registeredCourses.includes(course.id) && !(student.enrolledCourses || []).includes(course.id)} />
                ))}
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                  {mandatoryId
                    ? `Available Courses — Select at least ${Math.max(0, 2 - Math.max(0, student.completedCourses.filter(id => id !== mandatoryId).length))}`
                    : 'Available Courses'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {student.registeredCourses.filter(id => id !== mandatoryId).length} selected
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {eligibleCourses.filter(c => c.id !== mandatoryId && !student.completedCourses.includes(c.id)).map(course => {
                  const isRegistered = student.registeredCourses.includes(course.id)
                  const isEnrolled = (student.enrolledCourses || []).includes(course.id)
                  const isConflict = hasExchangeConflict(course.id, student.onExchange)
                  const dlPassed = isCourseDeadlinePassed(course.id)
                  return (
                    <CourseCard
                      key={course.id}
                      course={course}
                      selected={isRegistered || isEnrolled}
                      enrolled={isEnrolled}
                      pending={isRegistered && !isEnrolled}
                      conflict={isConflict}
                      deadlinePassed={dlPassed && !isRegistered && !isEnrolled}
                      onToggle={isEnrolled || dlPassed ? undefined : () => toggleCourse(course.id)}
                    />
                  )
                })}
              </div>
            </div>

            {(registeredCourses.length > 0 || enrolledCourses.length > 0 || completedCourses.length > 0) && (
              <div className="card mt-2">
                <div className="card-header">
                  <span className="card-title">My Summary</span>
                  <span className="badge badge-navy">{totalProgress} course{totalProgress !== 1 ? 's' : ''} toward concentration</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {completedCourses.map(course => (
                    <div key={course.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F0FDF4', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: 'var(--success)' }}>✓</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{course.name}</span>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Completed</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{course.month}</span>
                    </div>
                  ))}
                  {enrolledCourses.map(course => (
                    <div key={course.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#EFF6FF', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: 'var(--info)' }}>✓</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{course.name}</span>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Enrolled</span>
                        {course.id === mandatoryId && <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>Required</span>}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{course.month}</span>
                    </div>
                  ))}
                  {registeredCourses.map(course => (
                    <div key={course.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#FFFBEB', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span>⏳</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{course.name}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: '#FEF3C7', color: '#92400E' }}>Pending</span>
                        {course.id === mandatoryId && <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>Required</span>}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{course.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Messages ────────────────────────────────────── */}
        {tab === 'messages' && (
          <div style={{ maxWidth: 560 }}>
            <ChatThread student={student} sendMessage={sendMessage} updateStudent={updateStudent} />
          </div>
        )}

        {/* ── TAB: My Details ────────────────────────────────────── */}
        {tab === 'details' && (
          <div style={{ maxWidth: 560 }}>
            <div className="card mb-2">
              <div className="card-header"><span className="card-title">Exchange Status</span></div>
              <div className="form-group">
                <label>Are you going on exchange?</label>
                <select value={exchangeStatus} onChange={e => setExchangeStatus(e.target.value)}>
                  <option value="no">No — staying on campus</option>
                  <option value="yes">Yes — going on exchange (Sep–Dec)</option>
                </select>
              </div>
              {exchangeStatus === 'yes' && (
                <div className="alert alert-warning">
                  <span className="alert-icon">⚠️</span>
                  <div>Exchange students should only attend <strong>Feb &amp; Mar</strong> intensive courses. Oct &amp; Dec courses will conflict with your exchange period.</div>
                </div>
              )}
            </div>

            <div className="card mb-2">
              <div className="card-header"><span className="card-title">Concentration Preference</span></div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                You're registered as <strong>interested</strong> in the Tech &amp; AI Concentration.
              </p>
              <button className="btn btn-ghost btn-sm" onClick={() => setOptIn(null)} style={{ color: 'var(--text-muted)' }}>
                Change my preference
              </button>
            </div>

            <button className="btn btn-primary" onClick={saveUpdate} style={{ marginRight: 10 }}>
              Save Changes
            </button>
            {saved && <span style={{ color: 'var(--success)', fontSize: '0.875rem', fontWeight: 600 }}>✓ Saved</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function PortalTopbar({ onBack }) {
  return (
    <div className="topbar">
      <div className="topbar-brand">
        <div className="topbar-logo">HEC</div>
        <span>Tech &amp; AI Concentration</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 4px' }}>·</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>Student Portal</span>
      </div>
      <div className="topbar-actions">
        <button className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' }} onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  )
}

function CourseCard({ course, selected, conflict, mandatory, completed, enrolled, pending, deadlinePassed, onToggle }) {
  const level = LEVEL_COLORS[course.level] || LEVEL_COLORS.Applied
  const bgColor = completed ? '#F0FDF4' : enrolled ? '#EFF6FF' : pending ? '#FFFBEB' : selected ? '#EFF6FF' : deadlinePassed ? '#F9FAFB' : 'var(--bg-card)'
  const borderColor = completed ? '#86EFAC' : enrolled ? '#93C5FD' : pending ? '#FCD34D' : selected ? '#93C5FD' : conflict ? '#FCA5A5' : 'var(--border)'
  const dlDays = getDaysUntilDeadline(course.registrationDeadline)
  const dlUrgent = dlDays !== null && dlDays >= 0 && dlDays <= 7
  return (
    <div
      onClick={!mandatory && !completed && !enrolled && !deadlinePassed && onToggle ? onToggle : undefined}
      style={{
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 12, padding: '1rem 1.25rem',
        cursor: mandatory || completed || enrolled || deadlinePassed || !onToggle ? 'default' : 'pointer',
        display: 'flex', alignItems: 'flex-start', gap: '1rem',
        transition: 'all 0.15s', opacity: deadlinePassed ? 0.5 : conflict ? 0.7 : completed ? 0.85 : 1,
      }}
    >
      <div style={{ fontSize: '1.25rem', marginTop: 2 }}>
        {completed ? '✅' : enrolled ? '✅' : selected ? '☑️' : '⬜'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: completed ? 'var(--success)' : 'var(--navy)' }}>{course.name}</span>
          {course.tag && <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{course.tag}</span>}
          {mandatory && <span className="badge badge-navy" style={{ fontSize: '0.65rem' }}>Required</span>}
          {completed && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Completed</span>}
          {enrolled && !completed && <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Enrolled</span>}
          {pending && !completed && !enrolled && <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: '#FEF3C7', color: '#92400E' }}>Pending</span>}
          {conflict && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>⚠ Exchange conflict</span>}
          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: level.bg, color: level.color }}>{course.level}</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>{course.description}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--navy)', fontWeight: 600 }}>📅 {course.month}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>👤 {course.professor}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⏱ {course.duration}</span>
          {course.syllabusUrl && (
            <a
              href={course.syllabusUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: '0.75rem', color: 'var(--info)', fontWeight: 600, textDecoration: 'none' }}
            >
              📄 View Syllabus
            </a>
          )}
          {course.registrationDeadline && (
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: deadlinePassed ? 'var(--danger)' : dlUrgent ? 'var(--warning)' : 'var(--text-muted)' }}>
              🔒 {deadlinePassed ? 'Registration closed' : `Deadline: ${new Date(course.registrationDeadline + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function ChatThread({ student, sendMessage, updateStudent }) {
  const [msgText, setMsgText] = useState('')
  const messagesEndRef = useRef(null)
  const messages = student.messages || []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Mark admin messages as read when viewing
  useEffect(() => {
    const unread = messages.filter(m => m.from === 'admin' && !m.read)
    if (unread.length > 0) {
      updateStudent({
        messages: messages.map(m => m.from === 'admin' && !m.read ? { ...m, read: true } : m)
      })
    }
  }, [messages.length])

  function handleSend() {
    if (!msgText.trim()) return
    sendMessage(msgText.trim(), 'student')
    setMsgText('')
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Messages with Admin</span>
        {messages.length > 0 && <span className="badge badge-muted">{messages.length}</span>}
      </div>

      <div style={{ maxHeight: 360, overflowY: 'auto', padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
            No messages yet. Send a message to the admin below.
          </p>
        )}
        {messages.map(m => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              justifyContent: m.from === 'student' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '80%',
              padding: '8px 14px',
              borderRadius: 12,
              background: m.from === 'student' ? 'var(--navy)' : '#F1F5F9',
              color: m.from === 'student' ? 'white' : 'var(--text)',
              fontSize: '0.85rem',
              lineHeight: 1.5,
            }}>
              <div>{m.text}</div>
              <div style={{
                fontSize: '0.68rem',
                opacity: 0.6,
                marginTop: 4,
                textAlign: m.from === 'student' ? 'right' : 'left',
              }}>
                {new Date(m.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
        <input
          value={msgText}
          onChange={e => setMsgText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Type a message..."
          style={{ flex: 1, fontSize: '0.85rem' }}
        />
        <button className="btn btn-primary btn-sm" onClick={handleSend} disabled={!msgText.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}
