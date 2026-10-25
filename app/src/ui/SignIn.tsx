import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { authErrorText, registerWithEmail, resetPassword, signInWithEmail, signInWithGoogle } from '../platform/auth'

export function Logo({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path d="M49 12A38 38 0 1 0 88 51" fill="none" stroke="#4772fa" strokeWidth="9" strokeLinecap="round" />
      <path d="M31 52L45 65L72 30" fill="none" stroke="#ffb400" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Экран загрузки: только знак по центру, как у эталона */
export function Splash() {
  return (
    <div className="splash">
      <Logo />
    </div>
  )
}

const BLUE = '#4772fa'
const RED = '#ff5a6a'
const YELLOW = '#ffb400'
const GREEN = '#3cc9a0'

/** Общая основа картинки: пятно, карточка с кольцами сверху */
function Frame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 320 300" className="onb-art" aria-hidden="true">
      <path d="M52 130C40 78 105 32 170 42C238 52 292 24 303 112C313 192 272 252 190 264C108 276 64 204 52 130Z" className="onb-blob" />
      <circle cx="42" cy="52" r="14" className="onb-dot" />
      <circle cx="272" cy="282" r="7" className="onb-dot" />
      <g>
        <rect x="58" y="46" width="204" height="176" rx="10" fill="#fff" />
        <path d="M58 56a10 10 0 0 1 10-10h184a10 10 0 0 1 10 10v14H58z" fill={BLUE} />
        {[84, 117, 150, 183, 216].map((x) => (
          <circle key={x} cx={x} cy="58" r="5" fill="none" stroke="#cfe0ff" strokeWidth="1.6" />
        ))}
        {children}
      </g>
    </svg>
  )
}

const line = (x: number, y: number, w: number, c = '#dfe4f1') => <rect x={x} y={y} width={w} height="6" rx="3" fill={c} />

const SLIDES: { text: string; art: ReactNode }[] = [
  {
    text: 'Все дела в одном списке, ничего не потеряется',
    art: (
      <Frame>
        {[92, 124, 156, 188].map((y, i) => (
          <g key={y}>
            <circle cx="82" cy={y} r="9" fill={i < 2 ? BLUE : 'none'} stroke={i < 2 ? BLUE : '#c3cbe0'} strokeWidth="2" />
            {i < 2 && <path d={`M77.5 ${y}l3 3 6-6.5`} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
            {line(102, y - 7, 120 - i * 14, i < 2 ? '#cdd6ec' : '#b9c4e4')}
            {line(102, y + 3, 70 - i * 6)}
          </g>
        ))}
        <path d="M236 20v32M236 20h26l-6 8 6 8h-26" fill={RED} stroke={RED} strokeWidth="3" strokeLinejoin="round" />
      </Frame>
    ),
  },
  {
    text: 'Расписание на неделю в календаре',
    art: (
      <Frame>
        {[0, 1, 2, 3].map((r) => (
          <path key={r} d={`M70 ${96 + r * 31}h180`} stroke="#dfe4f1" strokeWidth="1.5" />
        ))}
        {[0, 1, 2, 3, 4].map((c) => (
          <path key={c} d={`M${70 + c * 36} 80v126`} stroke="#dfe4f1" strokeWidth="1.5" />
        ))}
        <rect x="142" y="127" width="36" height="31" fill="#6a93ff" />
        <rect x="76" y="86" width="26" height="6" rx="3" fill={BLUE} />
        <rect x="76" y="162" width="26" height="6" rx="3" fill={GREEN} />
        <rect x="184" y="100" width="26" height="6" rx="3" fill={RED} />
        <circle cx="228" cy="190" r="10" fill="none" stroke={RED} strokeWidth="4" />
        <path d="M206 34l9 9 18-20" fill="none" stroke={RED} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </Frame>
    ),
  },
  {
    text: 'Напоминания приходят вовремя, даже без интернета',
    art: (
      <Frame>
        <path d="M160 92c-22 0-34 16-34 38v18l-10 14h88l-10-14v-18c0-22-12-38-34-38z" fill={YELLOW} />
        <path d="M160 92c-22 0-34 16-34 38v18l-10 14h44z" fill="#ffc933" />
        <circle cx="160" cy="84" r="6" fill={YELLOW} />
        <path d="M148 172a12 12 0 0 0 24 0z" fill={RED} />
        <path d="M110 108c-6 8-8 16-8 26M210 108c6 8 8 16 8 26M96 100c-9 11-12 22-12 36M224 100c9 11 12 22 12 36" fill="none" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" />
        {line(120, 196, 80, '#cdd6ec')}
      </Frame>
    ),
  },
  {
    text: 'Матрица Эйзенхауэра: сначала важное и срочное',
    art: (
      <Frame>
        <rect x="72" y="82" width="82" height="62" rx="6" fill="#ffe3e6" />
        <rect x="160" y="82" width="90" height="62" rx="6" fill="#dbe6ff" />
        <rect x="72" y="150" width="82" height="62" rx="6" fill="#fff1cc" />
        <rect x="160" y="150" width="90" height="62" rx="6" fill="#eceff6" />
        {line(82, 96, 50, RED)}
        {line(82, 110, 34, '#ffb3bb')}
        {line(172, 96, 54, BLUE)}
        {line(172, 110, 38, '#a9c1ff')}
        {line(82, 164, 46, YELLOW)}
        {line(82, 178, 30, '#ffdd88')}
        {line(172, 164, 50, '#aab2c6')}
        {line(172, 178, 34, '#c9cfdd')}
      </Frame>
    ),
  },
  {
    text: 'Телефон и компьютер всегда показывают одно и то же',
    art: (
      <Frame>
        <rect x="74" y="88" width="96" height="66" rx="6" fill="#eef2fb" stroke="#c3cbe0" strokeWidth="2" />
        <path d="M108 154v14h28v-14M98 168h48" stroke="#c3cbe0" strokeWidth="3" strokeLinecap="round" />
        {line(84, 100, 50, BLUE)}
        {line(84, 114, 70)}
        {line(84, 128, 40)}
        <rect x="196" y="102" width="40" height="76" rx="8" fill="#eef2fb" stroke="#c3cbe0" strokeWidth="2" />
        {line(204, 120, 24, BLUE)}
        {line(204, 134, 24)}
        {line(204, 148, 16)}
        <path d="M176 120a16 16 0 0 1 18-8M194 112l-6-4M194 112l-4 7" fill="none" stroke={GREEN} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M190 146a16 16 0 0 1-18 8M172 154l6 4M172 154l4-7" fill="none" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </Frame>
    ),
  },
]

const SLIDE_MS = 4500

function Carousel() {
  const [i, setI] = useState(0)
  const [tick, setTick] = useState(0)
  const startX = useRef<number | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => setI((v) => (v + 1) % SLIDES.length), SLIDE_MS)
    return () => window.clearTimeout(id)
  }, [i, tick])

  const go = (n: number) => {
    setI((n + SLIDES.length) % SLIDES.length)
    setTick((t) => t + 1)
  }

  return (
    <div
      className="onb-carousel"
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (startX.current === null) return
        const dx = e.clientX - startX.current
        startX.current = null
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1))
      }}
    >
      <div className="onb-slides">
        {SLIDES.map((s, n) => (
          <div key={n} className={'onb-slide' + (n === i ? ' on' : n < i ? ' before' : '')} aria-hidden={n !== i}>
            {s.art}
            <p>{s.text}</p>
          </div>
        ))}
      </div>
      <div className="onb-dots">
        {SLIDES.map((_, n) => (
          <button key={n} className={'onb-dot-btn' + (n === i ? ' on' : '')} aria-label={`Слайд ${n + 1}`} onClick={() => go(n)} />
        ))}
      </div>
    </div>
  )
}

function GoogleG() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}

export function SignIn() {
  const [mode, setMode] = useState<'home' | 'email'>('home')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      await action()
    } catch (e) {
      setError(authErrorText(e))
    } finally {
      setBusy(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    void run(() => (creating ? registerWithEmail(email, password) : signInWithEmail(email, password)))
  }

  if (mode === 'home') {
    return (
      <div className="onb">
        <Carousel />
        <div className="onb-actions">
          <button className="onb-btn" onClick={() => setMode('email')} disabled={busy}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4.2" fill={BLUE} />
              <path d="M3.5 21c0-4.4 3.8-7 8.5-7s8.5 2.6 8.5 7z" fill={BLUE} />
            </svg>
            Войти с помощью email
          </button>
          <button className="onb-btn" onClick={() => void run(signInWithGoogle)} disabled={busy}>
            <GoogleG />
            Войти с помощью Google
          </button>
          <button
            className="onb-more"
            onClick={() => {
              setCreating(true)
              setMode('email')
            }}
          >
            Создать аккаунт
          </button>
          {info && <p className="muted onb-note">{info}</p>}
          {error && <p className="error onb-note">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="onb onb-form">
      <button
        className="onb-close"
        aria-label="Назад"
        onClick={() => {
          setMode('home')
          setCreating(false)
          setError(null)
          setInfo(null)
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <form className="onb-fields" onSubmit={submit}>
        <Logo size={72} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Почта" autoComplete="email" inputMode="email" required />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          autoComplete={creating ? 'new-password' : 'current-password'}
          minLength={6}
          required
        />
        <button className="onb-submit" type="submit" disabled={busy}>
          {creating ? 'Создать аккаунт' : 'Войти'}
        </button>
        {!creating && (
          <button
            className="onb-more"
            type="button"
            disabled={busy}
            onClick={() => {
              if (!email.trim()) {
                setError('Впишите почту, на неё придёт письмо для нового пароля')
                return
              }
              void run(async () => {
                await resetPassword(email)
                setInfo(`Письмо для нового пароля отправлено на ${email.trim()}`)
              })
            }}
          >
            Забыли пароль?
          </button>
        )}
        <button className="onb-more" type="button" onClick={() => setCreating(!creating)}>
          {creating ? 'У меня уже есть аккаунт' : 'Создать аккаунт'}
        </button>
        {info && <p className="muted onb-note">{info}</p>}
        {error && <p className="error onb-note">{error}</p>}
      </form>
    </div>
  )
}
