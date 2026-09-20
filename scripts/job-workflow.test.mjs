import { test } from 'node:test'
import assert from 'node:assert/strict'
import { transition } from '../src/lib/job-workflow.js'
const c = { id: 'customer' }, p = { id: 'provider' }, admin = { id: 'admin', admin: true }
const make = () => ({ customer_id: c.id, provider_user_id: p.id, data: { status: 'invited', started: {}, events: [] } })
const apply = (j, who, action, body = {}) => { j.data = transition(j, who, action, body, '2026-09-20T10:00:00Z'); return j }
const start = () => apply(apply(apply(make(), p, 'accept'), c, 'start'), p, 'start')
const review = { rating: 1, reviewer_name: 'Customer Name', comment: 'Work was left unfinished and I could not contact the provider.' }
test('only the invited provider accepts, and both participants confirm independently', () => {
  const j = make()
  assert.throws(() => apply(j, c, 'accept'))
  assert.throws(() => apply(j, { id: 'stranger' }, 'accept'))
  apply(j, p, 'accept'); apply(j, c, 'start'); assert.equal(j.data.status, 'accepted')
  apply(j, p, 'start'); assert.equal(j.data.status, 'in_progress')
  assert.throws(() => apply(j, p, 'start'))
})
test('completion requires the other participant and both start confirmations', () => {
  const j = apply(apply(make(), p, 'accept'), c, 'start')
  apply(j, c, 'request_completion')
  assert.throws(() => apply(j, c, 'confirm_completion'))
  assert.throws(() => apply(j, p, 'confirm_completion'))
  apply(j, p, 'start'); assert.equal(j.data.status, 'completion_requested')
  apply(j, p, 'confirm_completion'); assert.equal(j.data.status, 'completed')
})
test('provider cannot veto a review by withholding completion', () => {
  const j = apply(start(), c, 'request_completion'); apply(j, c, 'review', review)
  assert.equal(j.data.review.status, 'published'); assert.equal(j.data.review.confirmed_job, true)
  assert.throws(() => apply(j, p, 'review', review))
})
test('stopped and abandoned work can be reviewed', () => {
  for (const action of ['stop', 'abandon', 'dispute']) {
    const j = apply(start(), c, action, { reason: 'Work ended without completion.' }); apply(j, c, 'review', review)
    assert.equal(j.data.review.status, 'published')
  }
})
test('unconfirmed start requires private evidence and admin approval', () => {
  const j = apply(apply(apply(make(), p, 'accept'), c, 'start'), c, 'abandon', { reason: 'Provider left before finishing.' })
  assert.throws(() => apply(j, c, 'review', review))
  apply(j, c, 'review', { ...review, evidence: 'Invoice and messages show the work began.' })
  assert.equal(j.data.review.status, 'pending')
  assert.throws(() => apply(j, p, 'approve_review', { reason: 'Trying to bypass review.' }))
  apply(j, admin, 'approve_review', { reason: 'Invoice checked against the job records.' })
  assert.equal(j.data.review.confirmed_job, true)
})
test('review edits preserve history and cannot evade moderation', () => {
  const j = apply(start(), c, 'stop', { reason: 'Work stopped before completion.' }); apply(j, c, 'review', review)
  apply(j, admin, 'hide_review', { reason: 'Review evidence is being checked.' })
  apply(j, c, 'review', { ...review, rating: 3 })
  assert.equal(j.data.review.status, 'pending')
  assert.equal(j.data.events.filter(e => e.action === 'review').length, 2)
})
test('provider can reply and appeal without automatically hiding a review', () => {
  const j = apply(start(), c, 'request_completion'); apply(j, c, 'review', review)
  apply(j, p, 'reply', { reply: 'Please contact us to resolve this.' }); apply(j, p, 'appeal', { reason: 'Please investigate the supporting job records.' })
  assert.equal(j.data.review.status, 'published'); assert.equal(j.data.appeal.status, 'pending')
})
test('photo consent binds exact photos, resets on replacement and can be withdrawn', () => {
  const j = apply(apply(start(), c, 'request_completion'), p, 'confirm_completion')
  const photos = { caption: 'Finished kitchen', photos: ['https://example.com/photo.jpg'] }
  assert.throws(() => apply(j, c, 'request_portfolio', photos))
  apply(j, p, 'request_portfolio', photos)
  assert.throws(() => apply(j, p, 'allow_portfolio'))
  apply(j, c, 'allow_portfolio'); assert.equal(j.data.portfolio.consent, 'granted')
  apply(j, p, 'request_portfolio', { ...photos, photos: ['https://example.com/replaced.jpg'] }); assert.equal(j.data.portfolio.consent, 'pending')
  apply(j, c, 'allow_portfolio'); apply(j, c, 'deny_portfolio'); assert.equal(j.data.portfolio.consent, 'denied')
  assert.throws(() => apply(j, p, 'request_portfolio', { ...photos, photos: ['javascript:alert(1)'] }))
})
test('review rating and text validation rejects crafted input', () => {
  const j = apply(start(), c, 'request_completion')
  for (const rating of [0, 6, 1.5, 'invalid']) assert.throws(() => apply(j, c, 'review', { ...review, rating }))
  assert.throws(() => apply(j, c, 'review', { ...review, comment: 'short' }))
})
