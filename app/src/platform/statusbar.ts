import { Capacitor, registerPlugin } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { isDark, THEME_EVENT } from './theme'

/** Наш плагин для Android: цвет окна, строки состояния и кнопок навигации. Без него сверху и снизу белые полосы */
const WindowColors = registerPlugin<{ set(o: { color: string; dark: boolean }): Promise<void> }>('WindowColors')

/** Цвет системных панелей совпадает с фоном приложения, время и значки читаются и в светлой, и в тёмной теме */
export function syncStatusBar(): void {
  if (!Capacitor.isNativePlatform()) return
  const apply = () => {
    const dark = isDark()
    const bar = typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--bar').trim() : ''
    const color = bar || (dark ? '#1c1c1c' : '#ffffff')
    void WindowColors.set({ color, dark }).catch(() => undefined)
    void StatusBar.setBackgroundColor({ color }).catch(() => undefined)
    // Style.Dark означает светлые значки для тёмного фона, Style.Light наоборот
    void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => undefined)
  }
  apply()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply)
  window.addEventListener(THEME_EVENT, apply)
}
