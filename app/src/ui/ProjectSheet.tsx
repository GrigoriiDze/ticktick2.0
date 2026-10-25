import { useEffect, useState } from 'react'
import { defaultSite, formatBudget, navigatorUrl, phoneHref, plural, STAGES, type Site } from '../domain/sites'
import type { Project, ProjectGroup, SiteStage } from '../domain/types'
import type { ProjectPatch } from '../data/projects'

interface Props {
  leaving?: boolean
  project: Project
  groups: ProjectGroup[]
  taskCount: number
  onChange: (patch: ProjectPatch) => void
  onSiteField: (field: keyof Site, value: unknown) => void
  onDelete: () => void
  onDuplicate: () => void
  onClose: () => void
}

export function ProjectSheet({ project, groups, taskCount, onChange, onSiteField, onDelete, onDuplicate, onClose, leaving }: Props) {
  const [name, setName] = useState(project.name)
  useEffect(() => setName(project.name), [project.id, project.name])
  const site = project.site
  const navHref = site ? navigatorUrl(site.address) : null
  const telHref = site ? phoneHref(site.contactPhone) : null

  function commitName() {
    const text = name.trim()
    if (!text) setName(project.name)
    else if (text !== project.name) onChange({ name: text })
  }

  function toggleSite() {
    if (!site) {
      onChange({ site: defaultSite() })
      return
    }
    const filled = site.address || site.contactName || site.contactPhone || site.budget !== null || site.drawingsUrl
    if (filled && !window.confirm('Убрать карточку объекта? Адрес, телефон и бюджет будут удалены')) return
    onChange({ site: null })
  }

  function confirmDelete() {
    const what = taskCount ? ` и ${taskCount} ${plural(taskCount, ['задачу', 'задачи', 'задач'])}` : ''
    if (window.confirm(`Удалить список «${project.name}»${what}?`)) onDelete()
  }

  return (
    <>
      <div className={leaving ? 'scrim on leaving' : 'scrim on'} onClick={onClose} />
      <section className={leaving ? 'sheet tall leaving' : 'sheet tall'} role="dialog" aria-label="Список">
        <input
          className="sheet-title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          aria-label="Название списка"
        />

        {groups.length > 0 && (
          <label className="field">
            <span className="field-label">Папка</span>
            <select className="plain-select" value={project.groupId ?? ''} onChange={(e) => onChange({ groupId: e.target.value || null })} aria-label="Папка списка">
              <option value="">Вне папки</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="switch">
          <input type="checkbox" checked={site !== null} onChange={toggleSite} />
          <span>Это объект монтажа</span>
        </label>

        {site && (
          <div className="site">
            <TextField
              label="Адрес"
              value={site.address}
              onCommit={(v) => onSiteField('address', v)}
              action={navHref ? { text: 'В навигатор', href: navHref } : null}
            />
            <TextField label="Контакт на объекте" value={site.contactName} onCommit={(v) => onSiteField('contactName', v)} />
            <TextField
              label="Телефон"
              value={site.contactPhone}
              inputMode="tel"
              onCommit={(v) => onSiteField('contactPhone', v)}
              action={telHref ? { text: 'Позвонить', href: telHref } : null}
            />
            <TextField
              label="Бюджет, ₽"
              value={site.budget === null ? '' : String(site.budget)}
              inputMode="numeric"
              hint={formatBudget(site.budget)}
              onCommit={(v) => {
                const n = Number(v.replace(/\s/g, '').replace(',', '.'))
                onSiteField('budget', v.trim() === '' || Number.isNaN(n) ? null : n)
              }}
            />
            <TextField
              label="Чертежи, ссылка"
              value={site.drawingsUrl}
              inputMode="url"
              onCommit={(v) => onSiteField('drawingsUrl', v.trim())}
              action={/^https?:\/\//i.test(site.drawingsUrl) ? { text: 'Открыть', href: site.drawingsUrl } : null}
            />
            <div className="stages" role="radiogroup" aria-label="Этап">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  role="radio"
                  aria-checked={site.stage === s.id}
                  className={site.stage === s.id ? 'chip on' : 'chip'}
                  onClick={() => onSiteField('stage', s.id satisfies SiteStage)}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="secondary dup-list" onClick={onDuplicate}>
          Дублировать список как шаблон
        </button>

        <div className="sheet-actions">
          <button className="ghost danger" onClick={confirmDelete}>
            Удалить список
          </button>
          <button className="primary" onClick={onClose}>
            Готово
          </button>
        </div>
      </section>
    </>
  )
}

function TextField(props: {
  label: string
  value: string
  onCommit: (value: string) => void
  inputMode?: 'tel' | 'numeric' | 'url'
  hint?: string
  action?: { text: string; href: string } | null
}) {
  const [v, setV] = useState(props.value)
  useEffect(() => setV(props.value), [props.value])
  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      <span className="field-row">
        <input
          value={v}
          inputMode={props.inputMode}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => v !== props.value && props.onCommit(v)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        {props.action && (
          <a className="field-action" href={props.action.href} target="_blank" rel="noopener noreferrer">
            {props.action.text}
          </a>
        )}
      </span>
      {props.hint && <span className="field-hint">{props.hint}</span>}
    </label>
  )
}
