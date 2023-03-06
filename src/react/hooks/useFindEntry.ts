import { useEffect, useState } from 'react'
import type { Entry } from '../../contentful/types'
import { useDataSource } from '../context'

export function useFindEntry(id: string) {
  const [dataSource, updatedAt] = useDataSource()

  const [found, setFound] = useState<Entry<any>>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    const doIt = async () => {
      const result = await dataSource.getEntry(id)
      setFound(result)
    }

    setLoading(true)
    setError(undefined)
    doIt()
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }, [id, updatedAt])

  return [found, { loading, error }] as const
}