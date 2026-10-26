import { useEffect, useState } from 'react'
import { ModalProvider } from './modal/ModalProvider'
import { Workspace } from './Workspace'
import { StorageService, STORAGE_KEYS } from '../platform/storage'
import { watchUser, type User } from '../platform/auth'
import { SignIn, Splash } from './SignIn'

function loadCachedUser(): User | undefined {
  const cached = StorageService.get<{ uid?: string; email?: string | null } | null>(STORAGE_KEYS.USER_CACHE, null)
  if (cached && typeof cached.uid === 'string' && cached.uid) {
    return { uid: cached.uid, email: cached.email ?? null } as User
  }
  return undefined
}

export function App() {
  const [user, setUser] = useState<User | null | undefined>(loadCachedUser)

  useEffect(
    () =>
      watchUser((u) => {
        setUser(u)
        if (u) StorageService.set(STORAGE_KEYS.USER_CACHE, { uid: u.uid, email: u.email })
        else StorageService.remove(STORAGE_KEYS.USER_CACHE)
      }),
    [],
  )

  if (user === undefined) return <Splash />
  if (user === null) return <SignIn />
  return (
    <ModalProvider>
      <Workspace user={user} />
    </ModalProvider>
  )
}
