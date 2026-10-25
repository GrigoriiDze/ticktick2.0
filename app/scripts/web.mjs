// Веб-версия для Firebase Hosting: собирает приложение и кладёт его в hosting/ (папка update с APK не трогается).
// Запуск из папки app:  npm run web   Потом из корня проекта:  firebase deploy --only hosting
import { execSync } from 'node:child_process'
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const app = resolve(import.meta.dirname, '..')
const host = resolve(app, '..', 'hosting')

execSync('npm run build', { cwd: app, stdio: 'inherit', env: process.env })

// Старую сборку убираем целиком, кроме update (там APK для телефона)
for (const name of readdirSync(host)) if (name !== 'update') rmSync(resolve(host, name), { recursive: true, force: true })
cpSync(resolve(app, 'dist'), host, { recursive: true })
if (!existsSync(resolve(host, 'index.html'))) throw new Error('В hosting нет index.html, сборка не скопировалась')
console.log('\nГотово: веб-версия в hosting/. Выложить из корня проекта: firebase deploy --only hosting')
