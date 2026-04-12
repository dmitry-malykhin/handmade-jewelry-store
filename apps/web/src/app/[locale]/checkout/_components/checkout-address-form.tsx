'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { checkoutAddressSchema, type CheckoutAddressFormValues } from './checkout-address-schema'
import { CheckoutOrderSummary } from './checkout-order-summary'
import { CheckoutSteps } from './checkout-steps'

const CHECKOUT_COUNTRY_OPTIONS: { value: string; label: string }[] = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
]

interface CheckoutAddressFormProps {
  defaultValues?: Partial<CheckoutAddressFormValues>
  onNext: (values: CheckoutAddressFormValues) => void
}

export function CheckoutAddressForm({ defaultValues, onNext }: CheckoutAddressFormProps) {
  const t = useTranslations('checkoutPage')

  const form = useForm<CheckoutAddressFormValues>({
    resolver: zodResolver(checkoutAddressSchema),
    defaultValues: {
      email: '',
      fullName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      phone: '',
      ...defaultValues,
    },
  })

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <CheckoutSteps currentStep={1} />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onNext)} noValidate>
            {/* Contact */}
            <fieldset className="mb-8">
              <legend className="mb-4 text-lg font-semibold text-foreground">
                {t('sectionContact')}
              </legend>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fieldEmail')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            {/* Shipping address */}
            <fieldset className="mb-8 space-y-4">
              <legend className="mb-4 text-lg font-semibold text-foreground">
                {t('sectionShipping')}
              </legend>

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fieldFullName')}</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fieldAddressLine1')}</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="address-line1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('fieldAddressLine2')}
                      <span className="ml-1 text-sm text-muted-foreground">({t('optional')})</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="address-line2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fieldCity')}</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="address-level2" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('fieldState')}
                        <span className="ml-1 text-sm text-muted-foreground">
                          ({t('optional')})
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="address-level1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fieldPostalCode')}</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="postal-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fieldCountry')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CHECKOUT_COUNTRY_OPTIONS.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('fieldPhone')}
                      <span className="ml-1 text-sm text-muted-foreground">({t('optional')})</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" autoComplete="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <Button type="submit" size="lg" className="w-full">
              {t('continueToShippingMethod')}
            </Button>
          </form>
        </Form>
      </div>

      <CheckoutOrderSummary />
    </div>
  )
}
