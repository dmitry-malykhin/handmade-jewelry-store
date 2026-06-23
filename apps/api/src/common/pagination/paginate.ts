export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface PaginationMeta {
  totalCount: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResult<T> {
  data: T[]
  meta: PaginationMeta
}

export interface PaginationDefaults {
  page: number
  limit: number
}

const DEFAULT_PAGINATION: PaginationDefaults = { page: 1, limit: 20 }

export async function paginate<T>(
  options: PaginationOptions,
  findMany: (skip: number, take: number) => Promise<T[]>,
  count: () => Promise<number>,
  defaults: PaginationDefaults = DEFAULT_PAGINATION,
): Promise<PaginatedResult<T>> {
  const page = options.page ?? defaults.page
  const limit = options.limit ?? defaults.limit
  const skip = (page - 1) * limit

  const [data, totalCount] = await Promise.all([findMany(skip, limit), count()])

  return {
    data,
    meta: {
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}
