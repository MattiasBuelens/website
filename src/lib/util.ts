/**
 * Paginates an array of data.
 */
export function paginate<T>(
  data: readonly T[],
  { page = 1, limit }: { page?: number; limit: number }
): readonly T[] {
  if (limit) {
    return data.slice((page - 1) * limit, page * limit)
  }

  return data
}

/**
 * Counts the number of pages.
 */
export function countPages<T>(data: readonly T[], limit: number): number {
  return Math.ceil(data.length / limit)
}

/**
 * Returns all numbers from `0` up to `length - 1`.
 */
export function rangeTo(length: number): number[] {
  return Array.from({ length }, (_, i) => i)
}
