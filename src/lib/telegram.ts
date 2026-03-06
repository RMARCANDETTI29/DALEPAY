import WebApp from '@twa-dev/sdk'

export const isTelegram = (): boolean => {
  try {
    return !!WebApp.initData && WebApp.initData.length > 0
  } catch {
    return false
  }
}

export const initTelegram = () => {
  if (!isTelegram()) return

  try {
    WebApp.ready()
    WebApp.expand()
    WebApp.enableClosingConfirmation()
    document.body.classList.add('tg-theme')

    const bg = WebApp.themeParams?.bg_color
    if (bg) {
      document.documentElement.style.setProperty('--color-bg', bg)
    }
    const text = WebApp.themeParams?.text_color
    if (text) {
      document.documentElement.style.setProperty('--color-text', text)
    }
    const hint = WebApp.themeParams?.hint_color
    if (hint) {
      document.documentElement.style.setProperty('--color-text-secondary', hint)
    }
    const button = WebApp.themeParams?.button_color
    if (button) {
      document.documentElement.style.setProperty('--color-primary', button)
    }
  } catch {
    // Not in Telegram environment
  }
}

export const showMainButton = (text: string, onClick: () => void) => {
  if (!isTelegram()) return
  try {
    WebApp.MainButton.setText(text)
    WebApp.MainButton.show()
    WebApp.MainButton.onClick(onClick)
  } catch {}
}

export const hideMainButton = () => {
  if (!isTelegram()) return
  try {
    WebApp.MainButton.hide()
  } catch {}
}

export const hapticFeedback = (type: 'success' | 'error' | 'warning' = 'success') => {
  if (!isTelegram()) return
  try {
    WebApp.HapticFeedback.notificationOccurred(type)
  } catch {}
}

export { WebApp }
