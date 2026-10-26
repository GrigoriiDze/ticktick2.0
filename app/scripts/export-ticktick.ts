// Готовит файл с задачами из базы десктопного TickTick для импорта в приложении (Настройки, Импорт).
// Базу только читаем, лучше с копии файла.
//
// Запуск из папки app:  npx tsx scripts/export-ticktick.ts <TickTick.db> <куда сохранить.json>
import { writeFileSync } from 'node:fs'
import { buildImport } from './build-import'
import { readDesktopDb } from './ticktick-db'

const [dbPath, out] = process.argv.slice(2)
if (!dbPath || !out) {
  console.error('Нужны путь к TickTick.db и путь для файла')
  process.exit(1)
}
const bundle = buildImport(readDesktopDb(dbPath))
writeFileSync(out, JSON.stringify(bundle))
console.log(`Готово: задач ${bundle.tasks.length}, списков ${bundle.projects.length}, папок ${bundle.groups.length}, колонок ${bundle.columns.length}, привычек ${bundle.habits.length}, отметок ${bundle.checkins.length}, файлов ${bundle.files?.length ?? 0}`)
