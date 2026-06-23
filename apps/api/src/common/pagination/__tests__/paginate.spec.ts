import { paginate } from '../paginate'

describe('paginate()', () => {
  it('returns first page with default pagination when options are empty', async () => {
    const items = Array.from({ length: 20 }, (_, index) => ({ id: index + 1 }))

    const result = await paginate(
      {},
      async () => items,
      async () => 100,
    )

    expect(result).toEqual({
      data: items,
      meta: { totalCount: 100, page: 1, limit: 20, totalPages: 5 },
    })
  })

  it('passes computed skip/take to findMany based on page and limit', async () => {
    const findManyMock = jest.fn().mockResolvedValue([])
    const countMock = jest.fn().mockResolvedValue(0)

    await paginate({ page: 3, limit: 15 }, findManyMock, countMock)

    expect(findManyMock).toHaveBeenCalledWith(30, 15)
  })

  it('returns empty data and totalPages=0 when count is zero', async () => {
    const result = await paginate(
      { page: 1, limit: 20 },
      async () => [],
      async () => 0,
    )

    expect(result.data).toEqual([])
    expect(result.meta).toEqual({ totalCount: 0, page: 1, limit: 20, totalPages: 0 })
  })

  it('rounds up totalPages for a partial last page', async () => {
    const result = await paginate(
      { page: 1, limit: 10 },
      async () => [],
      async () => 23,
    )

    expect(result.meta.totalPages).toBe(3)
  })

  it('honours per-call defaults when options omit page or limit', async () => {
    const findManyMock = jest.fn().mockResolvedValue([])
    const countMock = jest.fn().mockResolvedValue(0)

    await paginate({}, findManyMock, countMock, { page: 2, limit: 10 })

    expect(findManyMock).toHaveBeenCalledWith(10, 10)
  })

  it('calls findMany and count concurrently', async () => {
    let findManyResolved = false
    let countStartedBeforeFindManyResolved = false

    const findManyPromise = new Promise<number[]>((resolve) => {
      setTimeout(() => {
        findManyResolved = true
        resolve([])
      }, 30)
    })
    const countMock = jest.fn().mockImplementation(async () => {
      countStartedBeforeFindManyResolved = !findManyResolved
      return 0
    })

    await paginate({}, () => findManyPromise, countMock)

    expect(countStartedBeforeFindManyResolved).toBe(true)
  })
})
