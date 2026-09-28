import assert from 'node:assert/strict'
import { test } from 'node:test'

import { getPageTitle } from './pageTitle.js'

test('returns a specific browser title for each main route', () => {
  assert.equal(getPageTitle('/teacher'), 'EduCraft - Tổng quan lớp học')
  assert.equal(getPageTitle('/classes/class-1/assignments/new'), 'EduCraft - Tạo bài kiểm tra')
  assert.equal(getPageTitle('/classes/class-1/assignments/assignment-1'), 'EduCraft - Chi tiết bài kiểm tra')
  assert.equal(getPageTitle('/student/assignments/assignment-1'), 'EduCraft - Nộp bài')
  assert.equal(getPageTitle('/student/assignments/assignment-1/submit'), 'EduCraft - Nộp bài')
  assert.equal(getPageTitle('/admin/accounts'), 'EduCraft - Quản lý tài khoản')
})

test('falls back to a short product title for unknown paths', () => {
  assert.equal(getPageTitle('/unknown'), 'EduCraft')
})
