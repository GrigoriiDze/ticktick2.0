// Выпуск версии: подписанный APK и version.json для проверки обновлений.
//
// Запуск из папки app:  npm run release -- "что нового одной строкой"
// Перед этим поднимите versionCode и versionName в android/app/build.gradle (номер должен расти).
// Потом одна команда выкладывает файлы на бесплатный Firebase Hosting:  firebase deploy --only hosting
import { execSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const app = resolve(import.meta.dirname, '..')
const root = resolve(app, '..')
const gradle = readFileSync(resolve(app, 'android/app/build.gradle'), 'utf8')
const versionCode = Number(/versionCode\s+(\d+)/.exec(gradle)?.[1])
const versionName = /versionName\s+"([^"]+)"/.exec(gradle)?.[1]
if (!versionCode || !versionName) throw new Error('Не нашёл versionCode и versionName в android/app/build.gradle')
if (!existsSync(resolve(app, 'android/keystore/keystore.properties'))) throw new Error('Нет ключа подписи android/keystore. Без него APK не подпишется')

if (!process.env.JAVA_HOME && existsSync('C:\\Users\\Alex\\.jdks\\jdk-21.0.12.1+1')) {
  process.env.JAVA_HOME = 'C:\\Users\\Alex\\.jdks\\jdk-21.0.12.1+1'
  process.env.PATH = `${process.env.JAVA_HOME}\\bin;${process.env.PATH}`
}

const notes = process.argv.slice(2).join(' ').trim()
const run = (cmd, cwd = app) => execSync(cmd, { cwd, stdio: 'inherit', env: process.env })

run('npm run build')
run('npx cap sync android')
run(process.platform === 'win32' ? '.\\gradlew.bat assembleRelease' : './gradlew assembleRelease', resolve(app, 'android'))

const built = resolve(app, 'android/app/build/outputs/apk/release/app-release.apk')
if (!existsSync(built)) throw new Error('Сборка не создала app-release.apk')

const out = resolve(root, 'hosting/update')
mkdirSync(out, { recursive: true })
copyFileSync(built, resolve(out, 'zadachi.apk'))
copyFileSync(built, resolve(out, 'zadachi.bin'))
const distApk = resolve(root, 'dist-apk')
mkdirSync(distApk, { recursive: true })
copyFileSync(built, resolve(distApk, `TickTick2-${versionName}.apk`))
const site = process.env.UPDATE_SITE ?? 'https://ticktick-47613.web.app'
writeFileSync(resolve(out, 'version.json'), JSON.stringify({ versionCode, versionName, apk: `${site}/update/zadachi.bin`, notes }, null, 2) + '\n')
console.log(`\nГотово: версия ${versionName} (${versionCode}). Файлы в hosting/update. Выложить: firebase deploy --only hosting`)
