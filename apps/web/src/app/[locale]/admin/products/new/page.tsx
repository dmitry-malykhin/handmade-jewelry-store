import type { Metadata } from 'next'
import { fetchCategories } from '@/lib/api/products'
import { ProductForm } from '../_components/product-form'

export const metadata: Metadata = {
  title: 'New Product — Admin Panel',
  robots: { index: false, follow: false },
}

export default async function AdminNewProductPage() {
  const categories = await fetchCategories()

  return (
    <main className="mx-auto max-w-3xl">
      <ProductForm mode="create" categories={categories} />
    </main>
  )
}
