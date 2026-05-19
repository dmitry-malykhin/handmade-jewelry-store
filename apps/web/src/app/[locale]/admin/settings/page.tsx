import type { Metadata } from 'next'
import { SettingsForm } from './_components/settings-form'

export const metadata: Metadata = {
  title: 'Settings — Admin Panel',
  robots: { index: false, follow: false },
}

export default function AdminSettingsPage() {
  return (
    <main>
      <SettingsForm />
    </main>
  )
}
