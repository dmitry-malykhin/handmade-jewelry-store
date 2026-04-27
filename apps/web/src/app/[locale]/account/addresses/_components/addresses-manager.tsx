'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import {
  fetchMyAddresses,
  deleteAddress,
  setDefaultAddress,
  type SavedAddress,
} from '@/lib/api/addresses'
import { ApiError } from '@/lib/api/client'
import { AddressForm } from './address-form'

const MAX_ADDRESSES = 5

export function AddressesManager() {
  const t = useTranslations('account.addresses')
  const accessToken = useAuthStore((state) => state.accessToken)

  const [addresses, setAddresses] = useState<SavedAddress[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    fetchMyAddresses(accessToken)
      .then(setAddresses)
      .catch(() => setLoadError(t('loadError')))
  }, [accessToken, t])

  function refresh() {
    if (!accessToken) return
    fetchMyAddresses(accessToken)
      .then(setAddresses)
      .catch(() => undefined)
  }

  async function handleSetDefault(addressId: string) {
    if (!accessToken) return
    try {
      await setDefaultAddress(accessToken, addressId)
      toast.success(t('defaultUpdated'))
      refresh()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('updateError'))
    }
  }

  async function handleDelete(addressId: string) {
    if (!accessToken) return
    if (!confirm(t('deleteConfirm'))) return

    try {
      await deleteAddress(accessToken, addressId)
      toast.success(t('deleted'))
      refresh()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('deleteError'))
    }
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">{loadError}</p>
      </div>
    )
  }

  if (addresses === null) {
    return (
      <ul role="list" className="space-y-3" aria-busy="true">
        {[0, 1].map((index) => (
          <li key={index} className="h-32 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </ul>
    )
  }

  if (isCreating) {
    return (
      <AddressForm
        onSuccess={() => {
          setIsCreating(false)
          refresh()
        }}
        onCancel={() => setIsCreating(false)}
      />
    )
  }

  if (editingAddress) {
    return (
      <AddressForm
        address={editingAddress}
        onSuccess={() => {
          setEditingAddress(null)
          refresh()
        }}
        onCancel={() => setEditingAddress(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-base font-medium">{t('emptyTitle')}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t('emptyDescription')}</p>
        </div>
      ) : (
        <ul role="list" className="space-y-3">
          {addresses.map((address) => (
            <li key={address.id}>
              <article className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-medium text-foreground">{address.fullName}</h3>
                      {address.isDefault && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {t('defaultBadge')}
                        </span>
                      )}
                    </div>
                    <address className="mt-2 not-italic text-sm text-muted-foreground">
                      <p>{address.addressLine1}</p>
                      {address.addressLine2 && <p>{address.addressLine2}</p>}
                      <p>
                        {address.city}
                        {address.state && `, ${address.state}`} {address.postalCode}
                      </p>
                      <p>{address.country}</p>
                      {address.phone && <p className="mt-1">{address.phone}</p>}
                    </address>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button variant="outline" size="sm" onClick={() => setEditingAddress(address)}>
                    {t('edit')}
                  </Button>
                  {!address.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(address.id)}
                    >
                      {t('setDefault')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(address.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    {t('delete')}
                  </Button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <Button onClick={() => setIsCreating(true)} disabled={addresses.length >= MAX_ADDRESSES}>
        {t('addNew')}
      </Button>
      {addresses.length >= MAX_ADDRESSES && (
        <p className="text-sm text-muted-foreground">{t('maxReached', { max: MAX_ADDRESSES })}</p>
      )}
    </div>
  )
}
