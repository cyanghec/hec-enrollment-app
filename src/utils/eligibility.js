import { COURSES, COHORTS } from '../data/courses'

// Returns the mandatory AI Fundamentals course ID for a student
export function getMandatoryCourse(cohort, onExchange) {
  // J27 16mo on exchange (Sep–Dec 2027) misses the Dec run → must take Feb run
  if (cohort === 'J27 16mo' && onExchange) return 'ai-fund-feb'
  // All other cohorts: mandatory is the Dec run (ai-fund-dec)
  return 'ai-fund-dec'
}

// Returns array of eligible course IDs for a cohort + exchange combination
// (2027-28 registration only — completed 2026-27 courses tracked separately)
// Derived from course.eligibleCohorts + course.exchangeSafe fields.
// J26 16mo is excluded (completed concentration in 2026-27).
// J27 16mo on exchange: mandatory ai-fund-feb is injected (exchange substitute for ai-fund-dec).
export function getEligibleCourseIds(cohort, onExchange) {
  if (cohort === 'J26 16mo') return []

  const mandatory = getMandatoryCourse(cohort, onExchange)
  const ids = COURSES
    .filter(c =>
      (c.eligibleCohorts || []).includes(cohort) &&
      (!onExchange || c.exchangeSafe)
    )
    .map(c => c.id)

  // Ensure the mandatory course is always included (handles J27 16mo on exchange → ai-fund-feb)
  if (!ids.includes(mandatory)) {
    return [mandatory, ...ids]
  }
  return ids
}

// Returns full course objects for a student
export function getEligibleCourses(cohort, onExchange) {
  const ids = getEligibleCourseIds(cohort, onExchange)
  return COURSES.filter(c => ids.includes(c.id))
}

// Checks if a registered course conflicts with exchange
export function hasExchangeConflict(courseId, onExchange) {
  if (!onExchange) return false
  const course = COURSES.find(c => c.id === courseId)
  return course ? !course.exchangeSafe : false
}

// Returns progress info for a student (counts completed + enrolled, not pending registrations)
export function getProgress(student) {
  const mandatory = getMandatoryCourse(student.cohort, student.onExchange)
  const enrolled = (student.enrolledCourses || []).length
  const totalCount = student.completedCourses.length + enrolled
  const earned = student.completedCourses.length >= 3
  const hasMandatory = student.completedCourses.includes(mandatory) ||
                       (student.enrolledCourses || []).includes(mandatory)
  return {
    completed: student.completedCourses.length,
    enrolled,
    registered: student.registeredCourses.length,
    total: totalCount,
    required: 3,
    earned,
    hasMandatory,
    mandatoryCourseId: mandatory,
  }
}

// Count unread messages from a specific sender
export function getUnreadCount(student, from) {
  return (student.messages || []).filter(m => m.from === from && !m.read).length
}

// Returns flag info for a student
export function getFlags(student) {
  const flags = []
  const prog = getProgress(student)
  // J26 16mo exchange window is in the past — no exchange flags apply
  const exchangeFlagsApply = student.cohort !== 'J26 16mo' && !prog.earned
  if (exchangeFlagsApply) {
    if (student.exchangeChanged) {
      flags.push({
        type: 'exchange',
        label: 'Exchange status changed',
        detail: 'Student confirmed exchange after registration — review course conflicts.',
      })
    }
    if (student.onExchange) {
      const allCourses = [...student.registeredCourses, ...(student.enrolledCourses || [])]
      const conflicts = [...new Set(allCourses)].filter(id =>
        hasExchangeConflict(id, true)
      )
      if (conflicts.length > 0) {
        flags.push({
          type: 'conflict',
          label: `${conflicts.length} course conflict${conflicts.length > 1 ? 's' : ''}`,
          detail: 'Student has Oct/Dec courses during exchange window.',
        })
      }
    }
  }
  if (student.cohort !== 'J26 16mo') {
    const unreadFromStudent = getUnreadCount(student, 'student')
    if (unreadFromStudent > 0) {
      flags.push({
        type: 'message',
        label: `${unreadFromStudent} unread message${unreadFromStudent > 1 ? 's' : ''}`,
        detail: (student.messages || []).filter(m => m.from === 'student').slice(-1)[0]?.text || '',
      })
    }
  }
  return flags
}

// Compute enrollment count (admin-approved) per course across all students
export function getEnrollmentCounts(students) {
  const counts = {}
  students.forEach(student => {
    (student.enrolledCourses || []).forEach(courseId => {
      counts[courseId] = (counts[courseId] || 0) + 1
    })
  })
  return counts
}

// Compute registration count (student interest) per course across all students
export function getRegistrationCounts(students) {
  const counts = {}
  students.forEach(student => {
    student.registeredCourses.forEach(courseId => {
      counts[courseId] = (counts[courseId] || 0) + 1
    })
  })
  return counts
}

// Deadline helpers
export function getDaysUntilDeadline(deadline) {
  if (!deadline) return null
  const now = new Date()
  const dl = new Date(deadline + 'T23:59:59')
  const diff = dl - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isDeadlinePassed(deadline) {
  const days = getDaysUntilDeadline(deadline)
  return days !== null && days < 0
}

export function isDeadlineUrgent(deadline) {
  const days = getDaysUntilDeadline(deadline)
  return days !== null && days >= 0 && days <= 7
}
