'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Category } from '@jewelry/shared'

const categoryFormSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase kebab-case only (e.g. sterling-silver)')
    .optional()
    .or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

interface CategoryFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: CategoryFormValues) => void
  isPending: boolean
  editingCategory?: Category | null
}

export function CategoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  editingCategory,
}: CategoryFormModalProps) {
  const t = useTranslations('admin')
  const isEditing = editingCategory !== null && editingCategory !== undefined

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '', slug: '', description: '' },
  })

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: editingCategory?.name ?? '',
        slug: editingCategory?.slug ?? '',
        description: editingCategory?.description ?? '',
      })
    }
  }, [isOpen, editingCategory, form])

  function handleSubmit(values: CategoryFormValues) {
    const payload = {
      name: values.name,
      ...(values.slug ? { slug: values.slug } : {}),
      // Explicit '' → null semantics: an empty textarea in edit mode clears
      // the description; using ?? would silently drop the clear intent.
      description: values.description ?? '',
    }
    onSubmit(payload)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('categoriesEditTitle') : t('categoriesCreateTitle')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('categoriesFieldName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('categoriesFieldNamePlaceholder')}
                      aria-label={t('categoriesFieldName')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('categoriesFieldSlug')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('categoriesFieldSlugPlaceholder')}
                      aria-label={t('categoriesFieldSlug')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('categoriesFieldDescription')}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder={t('categoriesFieldDescriptionPlaceholder')}
                      aria-label={t('categoriesFieldDescription')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                {t('categoriesCancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? t('categoriesSaving')
                  : isEditing
                    ? t('categoriesSaveChanges')
                    : t('categoriesCreate')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
