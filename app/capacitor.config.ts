import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'dev.grigorii.tasks',
  appName: 'TickTick 2.0',
  webDir: 'dist',
  android: {
    // Приложение и данные только по https, без смешанного содержимого
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_task',
      iconColor: '#2563EB',
    },
    FirebaseAuthentication: {
      // Состояние входа держит только веб-библиотека Firebase, нативная часть лишь получает токен Google
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
}

export default config
