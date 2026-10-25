# История ключевых решений

## 24.10.2026 — Рефакторинг под APK (токены и компоненты)

- **Токены извлечены напрямую из ресурсов APK TickTick (Theme.TickTick.Base.Default.Light/Dark, dimens.xml, res/anim)** в `app/src/tokens.css`.
- **Единый источник токенов:** `tokens.css` импортируется первым в `styles.css`.
- **Строка задачи (`standard_task_list_item.xml`):**
  - Размеры переведены на токены: высота строки `--row-h` (52px) и `--row-h-large` (68px), отступы `--row-pad-start` (15px), `--row-pad-end` (14px), `--row-pad-y` (10px), зазор между чекбоксом и текстом `--row-check-gap` (8px).
  - Чекбокс: размер `--check-box` (24px), граница в неактивном состоянии `--line-strong`, центрирование галочки под 24px.
  - Полоска проекта: `--project-stripe` (3px) вынесена в глобальный стиль с z-index: 2.
  - Подзадачи: класс `.subtask` в `TaskList.tsx` с отступом `calc(var(--row-pad-start) + var(--subtask-indent))` (30px).
  - Выделенная строка: фон `--selected` (10% акцента).
  - Зачёркивание выполненных задач: цвет текста и линии `--done`.

- **Панель быстрого добавления (`fragment_quick_add.xml`):**
  - Радиус верхней шторки: `--radius-sheet` (20px).
  - Поле названия задачи: font-size `--qa-title` (16px), line-height 1.2, цвет плейсхолдера `--hint`.
  - Поле описания: font-size `--qa-note` (14px), line-height 1.2, цвет плейсхолдера `--hint`.
  - Горизонтальные отступы: `--qa-pad-x` (16px).
  - Ряд кнопок действий: высота `--qa-buttons-h` (48px).
  - Ограничение высоты шторки: `--qa-max-h` (268px).
  - Анимация появления: `--dur-sheet-in` (250ms) + кривая `--ease-sheet`.

- **Шторки и диалоги:**
  - Фон шторок (`.sheet`, `.task-dialog`, `.tp-bottom`): `--sheet` (вместо `--card`).
  - Фон диалогов и попапов (`.dialog`, `.pop`): `--popup`.
  - Скругления: шторки `--radius-sheet` (20px), диалоги `--radius-dialog` (20px), всплывающие меню `--radius-window` (8px).
  - Затемнение фона (scrim): цвет `rgba(0, 0, 0, 0.5)`, длительности `--dur-scrim-in` (300ms) и `--dur-scrim-out` (200ms).

- **TabBar и навигация:**
  - Цвет неактивного таба: `--tab-off` (вместо `--icon-off`).
  - Анимация появления нижней панели: `@keyframes tabbar-in` с длительностью `--dur-tabbar-in` (200ms) и кривой `--ease-tabbar`.
  - Анимация скрытия: `@keyframes tabbar-out` с длительностью `--dur-tabbar-out` (300ms) и кривой `--ease-acc-dec`.
  - Кнопка добавления (FAB): анимация появления с длительностью `--dur-tabbar-in` и кривой `--ease-dec`.
  - Десктопная панель (Rail): вынесена отдельно для экранов от 900px, скрывая мобильный TabBar и FAB.
