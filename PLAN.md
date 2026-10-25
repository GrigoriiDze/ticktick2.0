# PLAN.md — Этапы рефакторинга под APK

> Обновлён: 24.10.2026
> Текущий этап: **6 — Calendar, Habits, Kanban**

## Общая схема

```
APK -> Токены CSS -> Стили компонентов -> Web-сборка -> Desktop (exe) -> Mobile (APK)
```

Цель: клон выглядит и двигается как оригинальный TickTick (gridzetasks_2.0),
сохраняя собственную логику синхронизации, Google-вход и MCP-интеграцию.

---

## Этап 0 — Извлечение ресурсов APK [ГОТОВО]

- [x] Распаковать APK, декодировать через apktool -> apk_res/
- [x] Изучить темы (styles.xml, colors.xml, dimens.xml)
- [x] Изучить аниматоры (res/anim/, res/interpolator/)
- [x] Изучить layout: standard_task_list_item.xml, fragment_quick_add.xml

---

## Этап 1 — Дизайн-токены [ГОТОВО]

- [x] Создать app/src/tokens.css (точные цвета ARGB из APK)
  - Светлая: Theme.TickTick.Base.Default.Light
  - Тёмная: Theme.TickTick.Base.Default.Dark
  - Новые: --sheet, --popup, --faint, --hint, --done, --chip, --snack, --selected
- [x] Перевести Android-кривые в cubic-bezier
- [x] Зафиксировать длительности из res/anim (мс)
- [x] Зафиксировать размеры из dimens.xml и layout-файлов
- [x] Подключить tokens.css в styles.css через @import
- [x] Заменить хардкод длительностей в .sheet/.page/.pop на токены
- [x] Размеры .quick-task и .qt-note из layout-токенов

---

## Этап 2 — Строка задачи и список [ГОТОВО]

Цель: TaskList.tsx выглядит как standard_task_list_item.xml

- [x] Высота строки: --row-h 52px / --row-h-large 68px
- [x] Padding: --row-pad-start 15px, --row-pad-end 14px, --row-pad-y 10px
- [x] Чекбокс: --check-box 24px, цвет --line-strong
- [x] Заголовок задачи: --row-title 16px
- [x] Дата/подпись: --row-date 13px, цвет --muted
- [x] Полоска цвета проекта: --project-stripe 3px
- [x] Отступ подзадачи: --subtask-indent 30px
- [x] Цвет выделенной строки: --selected (акцент 10%)
- [x] Зачёркивание выполненной задачи: цвет --done

Файлы: TaskList.tsx, styles.css (секция .tasks li)

---

## Этап 3 — Панель быстрого добавления [ГОТОВО]

Цель: TaskQuickAdd.tsx = fragment_quick_add.xml

- [x] Радиус шторки: --radius-sheet 20px
- [x] Поле заголовка: font-size --qa-title (16px), lineHeight 1.2
- [x] Поле описания: font-size --qa-note (14px)
- [x] Padding: --qa-pad-x 16px
- [x] Высота ряда кнопок: --qa-buttons-h 48px
- [x] Макс. высота шторки: --qa-max-h 268px
- [x] Анимация: --dur-sheet-in 250ms + --ease-sheet
- [x] Подсказка: цвет --hint

Файлы: TaskQuickAdd.tsx, AddBar.tsx

---

## Этап 4 — Шторки и диалоги [ГОТОВО]

Цель: TaskSheet, ProjectSheet, PopMenu двигаются как нативные шторки

- [x] Фон шторки: --sheet (не --card)
- [x] Фон попапов: --popup
- [x] Радиус шторки: --radius-sheet 20px
- [x] Радиус диалога: --radius-dialog 20px
- [x] Радиус меню: --radius-window 8px
- [x] Scrim: --dur-scrim-in/out, rgba(0,0,0,0.5)
- [x] TaskSheet.tsx: --sheet вместо --card

Файлы: TaskSheet.tsx, ProjectSheet.tsx, PopMenu.tsx

---

## Этап 5 — TabBar и навигация [ГОТОВО]

- [x] Цвет неактивного таба: --tab-off
- [x] Анимация появления: --dur-tabbar-in 200ms, --ease-tabbar
- [x] Анимация скрытия: --dur-tabbar-out 300ms
- [x] FAB (кнопка +): --dur-tabbar-in, --ease-dec
- [x] Rail.tsx (боковая на десктопе): отдельно

Файлы: TabBar.tsx, Rail.tsx

---

## Этап 6 — Calendar, Habits, Kanban

- [ ] Calendar: выделение дней --selected, --accent
- [ ] Habits: прогресс --accent, пустые дни --chip
- [ ] Kanban: колонки --card, карточки --sheet
- [ ] Переходы между экранами: проверить .page реально

---

## Этап 7 — Web-сборка (Firebase Hosting)

- [ ] npm run build
- [ ] Проверить адаптивность (от 900px: Rail вместо TabBar)
- [ ] Проверить темы в браузере
- [ ] firebase deploy --only hosting

---

## Этап 8 — Desktop (Tauri .exe)

- [ ] npm run tauri build
- [ ] SettingsDesktop.tsx: --sheet/--popup
- [ ] Titlebar: нативный или кастомный
- [ ] Тест синхронизации офлайн -> онлайн

---

## Этап 9 — Mobile (Capacitor APK)

- [ ] npx cap sync android
- [ ] StatusBar цвета (--bar) на устройстве
- [ ] SafeArea отступы
- [ ] ./gradlew assembleDebug
- [ ] Сравнить с оригиналом на одном устройстве

---

## Прогресс

| Этап                        | Действий | Статус      |
|-----------------------------|----------|-------------|
| 0 — Извлечение APK          | 4        | ГОТОВО      |
| 1 — Токены CSS              | 7        | ГОТОВО      |
| 2 — Строка задачи           | 9        | ГОТОВО      |
| 3 — Панель добавления       | 8        | ГОТОВО      |
| 4 — Шторки/диалоги          | 8        | ГОТОВО      |
| 5 — TabBar                  | 5        | ГОТОВО      |
| 6 — Calendar/Habits/Kanban  | 4        | СЕЙЧАС      |
| 7 — Web-сборка              | 4        | впереди     |
| 8 — Desktop                 | 4        | впереди     |
| 9 — Mobile APK              | 5        | впереди     |
| Итого                       | 58       | 71% готово  |

---

## Ключевые решения

- Не модифицируем бинарный APK — только читаем ресурсы
- Единый источник токенов — tokens.css, импортируется первым в styles.css
- Три таргета из одного кода: Web / Tauri (.exe) / Capacitor (APK)
- Google Sign-In и Google Calendar — уже есть, не трогаем
