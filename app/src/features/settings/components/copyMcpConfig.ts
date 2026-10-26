import { auth } from '../../../data/firebase'

export async function copyMcpConfig(): Promise<string> {
  const u = auth.currentUser
  const refreshToken = u?.refreshToken || ''
  const uid = u?.uid || ''
  const cfg = {
    mcpServers: {
      ticktick2: {
        command: 'node',
        args: ['C:/Users/Alex/Desktop/main-repo/projects/personal/ticktick/app/scripts/mcp-server.mjs'],
        env: {
          TICKTICK_REFRESH_TOKEN: refreshToken || '<вставьте_токен_или_используйте_TICKTICK_EMAIL_и_PASSWORD>',
          ...(uid ? { TICKTICK_UID: uid } : {}),
        },
      },
    },
  }
  const text = JSON.stringify(cfg, null, 2)
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return 'JSON-конфигурация MCP (с вашим токеном сессии) скопирована в буфер обмена!'
  }
  return text
}

