import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isDesktopTelegram, openTelegramWindow, toggleTelegramFullscreen, closeTelegramWindow } from './telegram-window.ts'

test('desktop platforms are recognized without mistaking mobile Telegram for desktop', () => {
  for (const platform of ['tdesktop', 'windows', 'macos', 'linux', 'weba', 'webk', 'web']) assert.equal(isDesktopTelegram(platform), true)
  for (const platform of ['android', 'ios', 'android_x', 'unknown', undefined]) assert.equal(isDesktopTelegram(platform), false)
})

test('opening a supported desktop Mini App requests Telegram fullscreen for immediate wide view', () => {
  const calls = []
  const webApp = { ready: () => calls.push('ready'), expand: () => calls.push('expand'), requestFullscreen: () => calls.push('fullscreen'), platform: 'tdesktop', isVersionAtLeast: (version) => version === '8.0' }
  assert.equal(openTelegramWindow(webApp), true)
  assert.deepEqual(calls, ['ready', 'expand', 'fullscreen'])
})

test('older desktop clients fall back to expansion without throwing', () => {
  const calls = []
  assert.equal(openTelegramWindow({ ready: () => calls.push('ready'), expand: () => calls.push('expand'), platform: 'tdesktop', isVersionAtLeast: () => false }), true)
  assert.deepEqual(calls, ['ready', 'expand'])
})

test('opening mobile Mini App remains expanded, with no desktop controls', () => {
  const calls = []
  assert.equal(openTelegramWindow({ ready: () => calls.push('ready'), expand: () => calls.push('expand'), platform: 'ios' }), false)
  assert.deepEqual(calls, ['ready', 'expand'])
})

test('fullscreen control is explicit, reversible, and safe on unsupported hosts', () => {
  const calls = []
  const webApp = { requestFullscreen: () => calls.push('enter'), exitFullscreen: () => calls.push('exit'), isFullscreen: false }
  assert.equal(toggleTelegramFullscreen(webApp), true)
  webApp.isFullscreen = true
  assert.equal(toggleTelegramFullscreen(webApp), true)
  assert.deepEqual(calls, ['enter', 'exit'])
  assert.equal(toggleTelegramFullscreen({ requestFullscreen: () => { throw Error('WebAppMethodUnsupported') } }), false)
  assert.equal(toggleTelegramFullscreen({}), false)
})

test('close uses Telegram host; no fake minimize action is exposed', () => {
  let closed = false
  assert.equal(closeTelegramWindow({ close: () => { closed = true } }), true)
  assert.equal(closed, true)
  assert.equal(closeTelegramWindow({}), false)
})
