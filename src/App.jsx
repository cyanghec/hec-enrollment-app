import { useState, useEffect } from 'react'
import { MOCK_STUDENTS, MOCK_HISTORICAL_ENROLLMENTS } from './data/students'
import { COURSES } from './data/courses'
import { getEligibleCourseIds } from './utils/eligibility'
import LoginScreen from './components/LoginScreen'
import StudentPortal from './components/student/StudentPortal'
import AdminDashboard from './components/admin/AdminDashboard'
import './App.css'

const STORAGE_KEY = 'hec-enrollment-students'
const COURSES_KEY = 'hec-enrollment-courses'
const SETTINGS_KEY = 'hec-enrollment-settings'
const HIST_KEY    = 'hec-enrollment-hist'

const DEFAULT_SETTINGS = {}

let _nextAutoId = 900001
// Deterministic pseudo-random based on a string seed (for stable simulated timestamps)
function seededRand(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return ((h >>> 0) % 1000) / 1000
}
function normalizeStudent(s) {
  // Migrate legacy noteToAdmin → messages
  const messages = s.messages || (s.noteToAdmin
    ? [{ id: `msg-migrated-${Date.now()}`, from: 'student', text: s.noteToAdmin, timestamp: new Date().toISOString() }]
    : [])
  const { noteToAdmin, ...rest } = s
  // Auto-generate studentId for legacy data missing it
  const studentId = s.studentId || `S${_nextAutoId++}`
  // Auto-clean registeredCourses: remove ineligible, already-completed, or duplicate-name entries
  const completedIds = new Set(s.completedCourses || [])
  const completedNames = new Set(
    (s.completedCourses || []).map(id => COURSES.find(c => c.id === id)?.name).filter(Boolean)
  )
  // Students who haven't responded to the interest survey can't register
  if (s.concentrationOptIn === null) {
    return { enrolledCourses: [], enrollmentTimestamps: {}, notifications: [], studentId, messages, registrationTimestamps: {}, ...rest, registeredCourses: [] }
  }
  const eligibleIds = new Set(getEligibleCourseIds(s.cohort, s.onExchange))
  const cleanedRegistered = (s.registeredCourses || []).filter(id => {
    if (completedIds.has(id)) return false
    const courseName = COURSES.find(c => c.id === id)?.name
    if (courseName && completedNames.has(courseName)) return false
    if (!eligibleIds.has(id)) return false
    return true
  })

  // Simulate registration timestamps for registered courses that have none
  const existingTs = s.registrationTimestamps || {}
  const registrationTimestamps = { ...existingTs }
  cleanedRegistered.forEach(courseId => {
    if (!registrationTimestamps[courseId]) {
      // Spread registrations over the past 1–60 days, deterministically per student+course
      const daysAgo = Math.floor(seededRand(`${studentId}-${courseId}`) * 59) + 1
      const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      registrationTimestamps[courseId] = d.toISOString()
    }
  })
  return {
    enrolledCourses: [],
    enrollmentTimestamps: {},
    notifications: [],
    studentId,
    messages,
    registrationTimestamps,
    ...rest,
    registeredCourses: cleanedRegistered,
  }
}

function loadStudents() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    const raw = saved ? JSON.parse(saved) : MOCK_STUDENTS
    return raw.map(normalizeStudent)
  } catch { return MOCK_STUDENTS.map(normalizeStudent) }
}

function loadCourses() {
  try {
    const saved = localStorage.getItem(COURSES_KEY)
    if (!saved) return COURSES
    const parsed = JSON.parse(saved)
    // Always union stored eligibleCohorts with base COURSES so source-code additions are picked up
    return parsed.map(c => {
      const base = COURSES.find(b => b.id === c.id)
      if (!base?.eligibleCohorts) return c
      const merged = [...new Set([...(c.eligibleCohorts || []), ...base.eligibleCohorts])]
      return { ...c, eligibleCohorts: merged }
    })
  } catch { return COURSES }
}

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
  } catch { return DEFAULT_SETTINGS }
}

function loadHistoricalEnrollments() {
  try {
    const saved = localStorage.getItem(HIST_KEY)
    return saved ? JSON.parse(saved) : MOCK_HISTORICAL_ENROLLMENTS
  } catch { return MOCK_HISTORICAL_ENROLLMENTS }
}

export default function App() {
  const [view, setView] = useState('login')
  const [students, setStudents] = useState(loadStudents)
  const [courses, setCourses] = useState(loadCourses)
  const [settings, setSettings] = useState(loadSettings)
  const [historicalEnrollments, setHistoricalEnrollments] = useState(loadHistoricalEnrollments)
  const [currentStudentId, setCurrentStudentId] = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students))
  }, [students])

  useEffect(() => {
    localStorage.setItem(COURSES_KEY, JSON.stringify(courses))
  }, [courses])

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    localStorage.setItem(HIST_KEY, JSON.stringify(historicalEnrollments))
  }, [historicalEnrollments])

  const currentStudent = students.find(s => s.id === currentStudentId) || null

  function updateStudent(id, changes) {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s))
  }

  function addStudent(student) {
    setStudents(prev => [...prev, normalizeStudent(student)])
  }

  function updateCourse(id, changes) {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c))
  }

  function addCourse(course) {
    setCourses(prev => [...prev, course])
  }

  function updateSettings(changes) {
    setSettings(prev => ({ ...prev, ...changes }))
  }

  function sendMessage(studentId, text, from) {
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s
      const msg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        from,
        text,
        timestamp: new Date().toISOString(),
        read: false,
      }
      return { ...s, messages: [...(s.messages || []), msg] }
    }))
  }

  function enrollStudent(studentId, courseId) {
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s
      if ((s.enrolledCourses || []).includes(courseId)) return s
      const enrolledCourses = [...(s.enrolledCourses || []), courseId]
      const enrollmentTimestamps = { ...(s.enrollmentTimestamps || {}), [courseId]: new Date().toISOString() }
      return { ...s, enrolledCourses, enrollmentTimestamps }
    }))
  }

  function batchEnroll(studentIds, courseId) {
    setStudents(prev => prev.map(s => {
      if (!studentIds.includes(s.id)) return s
      if ((s.enrolledCourses || []).includes(courseId)) return s
      const enrolledCourses = [...(s.enrolledCourses || []), courseId]
      const enrollmentTimestamps = { ...(s.enrollmentTimestamps || {}), [courseId]: new Date().toISOString() }
      return { ...s, enrolledCourses, enrollmentTimestamps }
    }))
  }

  function removeStudentFromCourse(studentId, courseId, message) {
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s
      const enrolledCourses = (s.enrolledCourses || []).filter(id => id !== courseId)
      const enrollmentTimestamps = { ...(s.enrollmentTimestamps || {}) }
      delete enrollmentTimestamps[courseId]
      const course = courses.find(c => c.id === courseId)
      const notifications = [
        ...(s.notifications || []),
        ...(message ? [{
          id: `notif-${Date.now()}`,
          type: 'removed',
          courseId,
          courseName: course?.name || courseId,
          message,
          timestamp: new Date().toISOString(),
          read: false,
        }] : []),
      ]
      return { ...s, enrolledCourses, enrollmentTimestamps, notifications }
    }))
  }

  // Import 26-27 historical enrollment: add courseId to completedCourses for matched students
  function importHistoricalEnrollment(courseId, studentIds) {
    setHistoricalEnrollments(prev => ({
      ...prev,
      [courseId]: [...new Set([...(prev[courseId] || []), ...studentIds])],
    }))
    setStudents(prev => prev.map(s => {
      if (!studentIds.includes(s.studentId)) return s
      if ((s.completedCourses || []).includes(courseId)) return s
      return { ...s, completedCourses: [...(s.completedCourses || []), courseId] }
    }))
  }

  // Remove a student from a historical course enrollment
  function removeHistoricalEnrollment(courseId, studentId) {
    setHistoricalEnrollments(prev => ({
      ...prev,
      [courseId]: (prev[courseId] || []).filter(id => id !== studentId),
    }))
    setStudents(prev => prev.map(s => {
      if (s.studentId !== studentId) return s
      return { ...s, completedCourses: (s.completedCourses || []).filter(id => id !== courseId) }
    }))
  }

  function resetData() {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(COURSES_KEY)
    localStorage.removeItem(SETTINGS_KEY)
    localStorage.removeItem(HIST_KEY)
    setStudents(MOCK_STUDENTS.map(normalizeStudent))
    setCourses(COURSES)
    setSettings(DEFAULT_SETTINGS)
    setHistoricalEnrollments(MOCK_HISTORICAL_ENROLLMENTS)
  }

  if (view === 'student' && currentStudent) {
    return (
      <StudentPortal
        student={currentStudent}
        allStudents={students}
        courses={courses}
        settings={settings}
        updateStudent={(changes) => updateStudent(currentStudent.id, changes)}
        sendMessage={(text, from) => sendMessage(currentStudent.id, text, from)}
        onBack={() => setView('login')}
      />
    )
  }

  if (view === 'admin') {
    return (
      <AdminDashboard
        students={students}
        courses={courses}
        settings={settings}
        historicalEnrollments={historicalEnrollments}
        updateStudent={updateStudent}
        updateCourse={updateCourse}
        updateSettings={updateSettings}
        addStudent={addStudent}
        addCourse={addCourse}
        sendMessage={sendMessage}
        enrollStudent={enrollStudent}
        batchEnroll={batchEnroll}
        removeStudentFromCourse={removeStudentFromCourse}
        importHistoricalEnrollment={importHistoricalEnrollment}
        removeHistoricalEnrollment={removeHistoricalEnrollment}
        onBack={() => setView('login')}
        onReset={resetData}
      />
    )
  }

  return (
    <LoginScreen
      students={students}
      courses={courses}
      settings={settings}
      onStudentLogin={(id) => { setCurrentStudentId(id); setView('student') }}
      onAdminLogin={() => setView('admin')}
    />
  )
}
