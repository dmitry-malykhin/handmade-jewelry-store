import { http, HttpResponse } from 'msw'

const API_BASE = 'http://localhost:4000'

/**
 * Default MSW handlers — baseline responses for all tests.
 * Individual tests can override with server.use() for specific scenarios.
 */
export const handlers = [
  // Products — placeholder for W4
  http.get(`${API_BASE}/products`, () => {
    return HttpResponse.json([
      {
        id: 'prod-1',
        slug: 'sterling-silver-ring',
        title: 'Sterling Silver Ring',
        price: 49.99,
        image: '/images/ring.jpg',
        stock: 10,
      },
      {
        id: 'prod-2',
        slug: 'gold-necklace',
        title: 'Gold Necklace',
        price: 129.99,
        image: '/images/necklace.jpg',
        stock: 5,
      },
    ])
  }),

  // Single product
  http.get(`${API_BASE}/products/:slug`, ({ params }) => {
    return HttpResponse.json({
      id: 'prod-1',
      slug: params.slug,
      title: 'Sterling Silver Ring',
      price: 49.99,
      image: '/images/ring.jpg',
      stock: 10,
    })
  }),
]
