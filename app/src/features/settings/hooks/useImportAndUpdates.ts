import { useState } from 'react'
import { auth, db } from '../../../data/firebase'
import { describeBundle, exportAccountBundle, parseBundle, type ImportBundle } from '../../../import/bundle'
import { checkForUpdate, type UpdateInfo } from '../../../platform/updates'
import type { SettingsProps } from '../types'

export function useImportAndUpdates(onImport: SettingsProps['onImport']) {
  const [bundle, setBundle] = useState<ImportBundle | null>(null)
  const [imp, setImp] = useState<string | null>(null)
  const [impBusy, setImpBusy] = useState(false)

  async function pickFile(file: File | undefined) {
    setBundle(null)
    if (!file) return
    try {
      const b = parseBundle(await file.text())
      setBundle(b)
      setImp(`В файле: ${describeBundle(b)}`)
    } catch (e) {
      setImp((e as Error).message)
    }
  }

  async function runBundle() {
    if (!bundle) return
    setImpBusy(true)
    setImp('Записываю, это может занять минуту. Не закрывайте приложение')
    try {
      const r = await onImport(bundle, (done, total) => setImp(`Записано ${done} из ${total}`))
      const filesAdded = r.files?.added ? `, файлов ${r.files.added}` : ''
      setImp(`Готово. Добавлено задач ${r.tasks.added}, списков ${r.projects.added}, привычек ${r.habits.added}${filesAdded}.`)
      setBundle(null)
    } catch (e) {
      setImp((e as Error).message || 'Не удалось записать')
    } finally {
      setImpBusy(false)
    }
  }

  async function exportBackup() {
    const uid = auth.currentUser?.uid
    if (!uid) {
      setImp('Сначала войдите в аккаунт')
      return
    }
    setImpBusy(true)
    setImp('Готовлю резервную копию всех данных и файлов...')
    try {
      const b = await exportAccountBundle(db, uid)
      const json = JSON.stringify(b, null, 2)
      const day = new Date().toISOString().slice(0, 10)
      const fileName = `ticktick2-backup-${day}.json`
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      setImp(`Экспорт завершён (${fileName}): ${describeBundle(b)}`)
    } catch (e) {
      setImp((e as Error).message || 'Не удалось экспортировать данные')
    } finally {
      setImpBusy(false)
    }
  }

  const [upd, setUpd] = useState<{ text: string; update: UpdateInfo | null } | null>(null)
  const [checking, setChecking] = useState(false)

  async function check() {
    setChecking(true)
    try {
      const r = await checkForUpdate()
      setUpd({
        text: r.update
          ? `Вышла версия ${r.update.versionName}: ${r.update.notes || 'Обновление готово'}`
          : `Установлена последняя версия ${r.current.versionName}`,
        update: r.update,
      })
    } catch (e) {
      setUpd({ text: (e as Error).message || 'Не удалось проверить обновления', update: null })
    } finally {
      setChecking(false)
    }
  }

  return {
    bundle,
    imp,
    impBusy,
    pickFile,
    runBundle,
    exportBackup,
    upd,
    checking,
    check,
    checkUpdates: check,
  }
}


