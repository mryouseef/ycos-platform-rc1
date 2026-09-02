import assert from 'node:assert/strict'
import test from 'node:test'
import { isRequestTransitionAllowed, isConsultationTransitionAllowed, boundedTitle, boundedSummary } from '../src/p2/domain'

test('request: DRAFT -> SUBMITTED is allowed', () => assert.equal(isRequestTransitionAllowed('DRAFT', 'SUBMITTED'), true))
test('request: SUBMITTED -> REVIEW is allowed', () => assert.equal(isRequestTransitionAllowed('SUBMITTED', 'REVIEW'), true))
test('request: REVIEW -> ACCEPTED and REVIEW -> DECLINED are allowed', () => {
  assert.equal(isRequestTransitionAllowed('REVIEW', 'ACCEPTED'), true)
  assert.equal(isRequestTransitionAllowed('REVIEW', 'DECLINED'), true)
})
test('request: ACCEPTED -> CLOSED and DECLINED -> CLOSED are allowed', () => {
  assert.equal(isRequestTransitionAllowed('ACCEPTED', 'CLOSED'), true)
  assert.equal(isRequestTransitionAllowed('DECLINED', 'CLOSED'), true)
})
test('request: WITHDRAWN and CLOSED are terminal (no further transitions)', () => {
  assert.equal(isRequestTransitionAllowed('WITHDRAWN', 'SUBMITTED'), false)
  assert.equal(isRequestTransitionAllowed('CLOSED', 'REVIEW'), false)
})
test('request: cannot skip DRAFT directly to ACCEPTED (invalid lifecycle transition denied)', () => {
  assert.equal(isRequestTransitionAllowed('DRAFT', 'ACCEPTED'), false)
})
test('request: cannot re-submit an already SUBMITTED request', () => {
  assert.equal(isRequestTransitionAllowed('SUBMITTED', 'SUBMITTED'), false)
})

test('consultation: PROPOSED -> ACTIVE -> PAUSED -> ACTIVE -> COMPLETED -> CLOSED is a valid full path', () => {
  assert.equal(isConsultationTransitionAllowed('PROPOSED', 'ACTIVE'), true)
  assert.equal(isConsultationTransitionAllowed('ACTIVE', 'PAUSED'), true)
  assert.equal(isConsultationTransitionAllowed('PAUSED', 'ACTIVE'), true)
  assert.equal(isConsultationTransitionAllowed('ACTIVE', 'COMPLETED'), true)
  assert.equal(isConsultationTransitionAllowed('COMPLETED', 'CLOSED'), true)
})
test('consultation: COMPLETED and CLOSED are terminal for forward progress', () => {
  assert.equal(isConsultationTransitionAllowed('COMPLETED', 'ACTIVE'), false)
  assert.equal(isConsultationTransitionAllowed('CLOSED', 'ACTIVE'), false)
})
test('consultation: cannot skip PROPOSED directly to COMPLETED', () => {
  assert.equal(isConsultationTransitionAllowed('PROPOSED', 'COMPLETED'), false)
})

test('boundedTitle rejects empty, whitespace-only, and over-200-char values', () => {
  assert.equal(boundedTitle(''), false)
  assert.equal(boundedTitle('   '), false)
  assert.equal(boundedTitle('a'.repeat(201)), false)
  assert.equal(boundedTitle('Valid title'), true)
})
test('boundedSummary rejects empty and over-2000-char values', () => {
  assert.equal(boundedSummary(''), false)
  assert.equal(boundedSummary('a'.repeat(2001)), false)
  assert.equal(boundedSummary('Valid summary'), true)
})
