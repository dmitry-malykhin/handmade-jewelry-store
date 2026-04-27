'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/auth.store'
import {
  createAddress,
  updateAddress,
  type SavedAddress,
  type UpsertAddressPayload,
} from '@/lib/api/addresses'
import { ApiError } from '@/lib/api/client'

interface AddressFormProps {
  address?: SavedAddress
  onSuccess: () => void
  onCancel: () => void
}

export function AddressForm({ address, onSuccess, onCancel }: AddressFormProps) {
  const t = useTranslations('account.addresses.form')
  const accessToken = useAuthStore((state) => state.accessToken)

  const [fullName, setFullName] = useState(address?.fullName ?? '')
  const [addressLine1, setAddressLine1] = useState(address?.addressLine1 ?? '')
  const [addressLine2, setAddressLine2] = useState(address?.addressLine2 ?? '')
  const [city, setCity] = useState(address?.city ?? '')
  const [state, setState] = useState(address?.state ?? '')
  const [postalCode, setPostalCode] = useState(address?.postalCode ?? '')
  const [country, setCountry] = useState(address?.country ?? 'US')
  const [phone, setPhone] = useState(address?.phone ?? '')
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError(null)

    if (!accessToken) {
      setValidationError(t('errorUnauthorized'))
      return
    }

    const payload: UpsertAddressPayload = {
      fullName: fullName.trim(),
      addressLine1: addressLine1.trim(),
      ...(addressLine2.trim() && { addressLine2: addressLine2.trim() }),
      city: city.trim(),
      ...(state.trim() && { state: state.trim() }),
      postalCode: postalCode.trim(),
      country: country.trim().toUpperCase(),
      ...(phone.trim() && { phone: phone.trim() }),
      isDefault,
    }

    setIsSubmitting(true)
    try {
      if (address) {
        await updateAddress(accessToken, address.id, payload)
        toast.success(t('updated'))
      } else {
        await createAddress(accessToken, payload)
        toast.success(t('created'))
      }
      onSuccess()
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t('errorGeneric')
      setValidationError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={address ? t('editTitle') : t('addTitle')}
      className="rounded-lg border border-border bg-card p-6"
    >
      <fieldset disabled={isSubmitting} className="space-y-4">
        <legend className="text-lg font-medium">{address ? t('editTitle') : t('addTitle')}</legend>

        <div className="space-y-2">
          <Label htmlFor="full-name">{t('fullNameLabel')}</Label>
          <Input
            id="full-name"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address-line-1">{t('addressLine1Label')}</Label>
          <Input
            id="address-line-1"
            autoComplete="address-line1"
            value={addressLine1}
            onChange={(event) => setAddressLine1(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address-line-2">{t('addressLine2Label')}</Label>
          <Input
            id="address-line-2"
            autoComplete="address-line2"
            value={addressLine2}
            onChange={(event) => setAddressLine2(event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="city">{t('cityLabel')}</Label>
            <Input
              id="city"
              autoComplete="address-level2"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">{t('stateLabel')}</Label>
            <Input
              id="state"
              autoComplete="address-level1"
              value={state}
              onChange={(event) => setState(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="postal-code">{t('postalCodeLabel')}</Label>
            <Input
              id="postal-code"
              autoComplete="postal-code"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">{t('countryLabel')}</Label>
            <Input
              id="country"
              autoComplete="country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              maxLength={2}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t('phoneLabel')}</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(event) => setIsDefault(event.target.checked)}
            className="size-4"
          />
          <span className="text-sm">{t('setAsDefault')}</span>
        </label>

        {validationError && (
          <p role="alert" className="text-sm text-destructive">
            {validationError}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('saving') : address ? t('updateButton') : t('createButton')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
        </div>
      </fieldset>
    </form>
  )
}
