'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuthStore } from '@/store/auth.store'
import {
  createCategory,
  deleteCategory,
  fetchAdminCategories,
  updateCategory,
} from '@/lib/api/categories'
import type { Category, CategoryWithCount } from '@jewelry/shared'
import { ApiError } from '@/lib/api/client'
import { CategoryFormModal } from './category-form-modal'
import { DeleteCategoryDialog } from './delete-category-dialog'

interface CategoryFormPayload {
  name: string
  slug?: string
}

export function CategoriesTable() {
  const t = useTranslations('admin')
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)

  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryWithCount | null>(null)

  const { data: categories, isPending: isCategoriesLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => fetchAdminCategories(accessToken ?? ''),
    enabled: accessToken !== null,
  })

  const createMutation = useMutation({
    mutationFn: (payload: CategoryFormPayload) => createCategory(payload, accessToken ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      toast.success(t('categoriesCreateSuccess'))
      setIsFormModalOpen(false)
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t('categoriesCreateError')
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: CategoryFormPayload) =>
      updateCategory(editingCategory?.id ?? '', payload, accessToken ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      toast.success(t('categoriesUpdateSuccess'))
      setIsFormModalOpen(false)
      setEditingCategory(null)
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t('categoriesUpdateError')
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCategory(categoryToDelete?.id ?? '', accessToken ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      toast.success(t('categoriesDeleteSuccess'))
      setCategoryToDelete(null)
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t('categoriesDeleteError')
      toast.error(message)
    },
  })

  function handleOpenCreate() {
    setEditingCategory(null)
    setIsFormModalOpen(true)
  }

  function handleOpenEdit(category: Category) {
    setEditingCategory(category)
    setIsFormModalOpen(true)
  }

  function handleFormSubmit(payload: CategoryFormPayload) {
    if (editingCategory) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const isFormPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 id="categories-heading" className="text-2xl font-semibold text-foreground">
          {t('categoriesTitle')}
        </h1>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 size-4" aria-hidden="true" />
          {t('categoriesNewButton')}
        </Button>
      </div>

      {isCategoriesLoading ? (
        <p className="text-sm text-muted-foreground">{t('categoriesLoading')}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('categoriesColName')}</TableHead>
                <TableHead>{t('categoriesColSlug')}</TableHead>
                <TableHead className="text-right">{t('categoriesColProducts')}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    {t('categoriesEmpty')}
                  </TableCell>
                </TableRow>
              )}
              {categories?.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium text-foreground">{category.name}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {category.slug}
                    </code>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {category._count.products}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(category)}
                        aria-label={t('categoriesEditAriaLabel', { name: category.name })}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCategoryToDelete(category)}
                        aria-label={t('categoriesDeleteAriaLabel', { name: category.name })}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CategoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false)
          setEditingCategory(null)
        }}
        onSubmit={handleFormSubmit}
        isPending={isFormPending}
        editingCategory={editingCategory}
      />

      <DeleteCategoryDialog
        category={categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
      />
    </>
  )
}
