import { useEffect, useState } from 'react'
import type { Asset } from '../../contentful/types'
import { useDataSource } from '../context'

export function useFindAsset(id: string) {
  const [dataSource, updatedAt] = useDataSource()

  const [found, setFound] = useState<Asset>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    const doIt = async () => {
      const result = await dataSource.getAsset(id)
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