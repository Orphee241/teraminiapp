import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isDesktopTelegram, openTelegramWindow, toggleTelegramFullscreen, closeTelegramWindow, configureTelegramBackButton } from './telegram-window.ts'

test('desktop platforms are recognized without mistaking mobile Telegram for desktop', () => {
  for (const platform of ['tdesktop', 'windows', 'macos', 'linux', 'weba', 'webk', 'web']) assert.equal(isDesktopTelegram(platform), true)
  for (const platform of ['android', 'ios', 'android_x', 'unknown', undefined]) assert.equal(isDesktopTelegram(platform), false)
})

test('opening a supported desktop Mini App requests Telegram fullscreen for immediate wide view', () => {
  const calls = []
  const webApp = { ready: () => calls.push('ready'), expand: () => calls.push('expand'), requestSafeArea: () => calls.push('safe-area'), requestContentSafeArea: () => calls.push('content-safe-area'), requestFullscreen: () => calls.push('fullscreen'), platform: 'tdesktop', isVersionAtLeast: (version) => version === '8.0' }
  assert.equal(openTelegramWindow(webApp), true)
  assert.deepEqual(calls, ['ready', 'expand', 'fullscreen', 'safe-area', 'content-safe-area'])
})

test('older desktop clients fall back to expansion without throwing', () => {
  const calls = []
  assert.equal(openTelegramWindow({ ready: () => calls.push('ready'), expand: () => calls.push('expand'), platform: 'tdesktop', isVersionAtLeast: () => false }), true)
  assert.deepEqual(calls, ['ready', 'expand'])
})

test('opening mobile Mini App requests native fullscreen when supported', () => {
  const calls = []
  assert.equal(openTelegramWindow({ ready: () => calls.push('ready'), expand: () => calls.push('expand'), requestFullscreen: () => calls.push('fullscreen'), platform: 'ios', isVersionAtLeast: () => true }), false)
  assert.deepEqual(calls, ['ready', 'expand', 'fullscreen'])
})

test('native Telegram BackButton is shown only for a nested screen and is cleaned up', () => {
  const calls = []
  const backButton = { show: () => calls.push('show'), hide: () => calls.push('hide'), onClick: fn => calls.push(['on', fn]), offClick: fn => calls.push(['off', fn]) }
  const onBack = () => undefined
  const cleanup = configureTelegramBackButton({ BackButton: backButton }, true, onBack)
  cleanup()
  assert.equal(calls[0], 'show')
  assert.equal(calls[1][0], 'on')
  assert.equal(calls[2][0], 'off')
  assert.equal(calls[3], 'hide')
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
