import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomePage from '../page'

type MockWebApp = {
  initData: string
  ready: ReturnType<typeof vi.fn>
  expand: ReturnType<typeof vi.fn>
  onEvent: ReturnType<typeof vi.fn>
  offEvent: ReturnType<typeof vi.fn>
  BackButton: { hide: ReturnType<typeof vi.fn>; show: ReturnType<typeof vi.fn>; onClick: ReturnType<typeof vi.fn>; offClick: ReturnType<typeof vi.fn> }
}

function telegramWebApp(initData = 'signed-init-data'): MockWebApp {
  return {
    initData,
    ready: vi.fn(),
    expand: vi.fn(),
    onEvent: vi.fn(),
    offEvent: vi.fn(),
    BackButton: { hide: vi.fn(), show: vi.fn(), onClick: vi.fn(), offClick: vi.fn() },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  delete window.Telegram
})

function installLocalStorage() {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: { getItem: vi.fn(() => null), setItem: vi.fn() },
  })
}

describe('HomePage runtime and profile bootstrap', () => {
  it('keeps the first render neutral while Telegram profile bootstrap is unresolved', () => {
    installLocalStorage()
    window.Telegram = { WebApp: telegramWebApp() as unknown as NonNullable<typeof window.Telegram>['WebApp'] }
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => undefined))

    render(<HomePage />)

    expect(screen.getAllByLabelText('Chargement')[0]).toBeInTheDocument()
    expect(screen.queryByText('Ouvrir l’App')).not.toBeInTheDocument()
  })

  it('shows a retryable bootstrap error instead of onboarding after a failed profile response', async () => {
    installLocalStorage()
    window.Telegram = { WebApp: telegramWebApp() as unknown as NonNullable<typeof window.Telegram>['WebApp'] }
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('Unavailable', { status: 503 }))

    render(<HomePage />)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Impossible de charger votre profil'))
    expect(screen.queryByRole('heading', { name: 'Votre pays' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})
