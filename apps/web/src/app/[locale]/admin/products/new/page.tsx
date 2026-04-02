import type { Metadata } from 'next'
import { fetchCategories } from '@/lib/api/products'
import { CreateProductForm } from './_components/create-product-form'

export const metadata: Metadata = {
  title: 'New Product — Admin Panel',
  robots: { index: false, follow: false },
}

export default async function AdminNewProductPage() {
  // Fetch categories server-side — no loading state in form, instant render
  const categories = await fetchCategories()

  return (
    <main className="mx-auto max-w-3xl">
      <CreateProductForm categories={categories} />
    </main>
  )
}
