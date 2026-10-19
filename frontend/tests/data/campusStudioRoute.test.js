import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { getCampusStudioSurface } from '../../src/data/campusStudioRoute.js'

test('Campus Studio shell covers every current Student and Teacher workspace', () => {
  assert.equal(getCampusStudioSurface('/student'), 'student-dashboard')
  assert.equal(getCampusStudioSurface('/student/assignments/assignment-1'), 'student-workspace')
  assert.equal(getCampusStudioSurface('/teacher'), 'teacher-dashboard')
  assert.equal(getCampusStudioSurface('/classes/class-1'), 'teacher-workspace')
  assert.equal(getCampusStudioSurface('/classes/class-1/assignments/new'), 'teacher-workspace')
  assert.equal(getCampusStudioSurface('/assignments/new'), 'teacher-workspace')
  assert.equal(
    getCampusStudioSurface('/classes/class-1/assignments/assignment-1'),
    'teacher-review',
  )

  for (const pathname of [
    '/admin',
    '/login',
    '/',
  ]) {
    assert.equal(getCampusStudioSurface(pathname), null, pathname)
  }
})

test('all current Teacher workspaces use the compact command bar instead of the legacy sidebar', async () => {
  const source = await readFile(new URL('../../src/components/AppShell.jsx', import.meta.url), 'utf8')

  assert.match(source, /isTeacher && isCampusStudio \? 'teacher-kinetic-shell'/)
  assert.match(source, /isTeacher \? 'teacher-shell teacher-kinetic-shell'/)
  assert.doesNotMatch(source, /isTeacherDashboardStudio/)
})

test('Student command bar keeps context and identity text readable on Ink Navy', async () => {
  const css = await readFile(new URL('../../src/styles/campus-studio.css', import.meta.url), 'utf8')
  const contextRule = css.match(/\.campus-studio-shell\.campus-studio-student-dashboard \.campus-studio-command-bar \.shell-role-label\s*\{([^}]+)\}/)?.[1]
  const identityRule = css.match(/\.campus-studio-shell\.campus-studio-student-dashboard \.campus-studio-command-bar \.shell-user-details (?:strong|small)[^{]*\{([^}]+)\}/)?.[1]

  assert.match(contextRule ?? '', /color:\s*rgb\(255 255 255 \/ (?:8[0-9]|9[0-9]|100)%\)/)
  assert.match(identityRule ?? '', /color:\s*(?:white|rgb\(255 255 255 \/ (?:8[0-9]|9[0-9]|100)%\))/)
})
