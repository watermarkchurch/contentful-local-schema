import eq from 'lodash/eq'
import { EffectCallback, useEffect, useRef } from 'react'

function useDeepCompareMemoize(value: any) {
  const ref = useRef(value) 
  // it can be done by using useMemo as well
  // but useRef is rather cleaner and easier

  if (!eq(value, ref.current)) {
    ref.current = value
  }

  return ref.current
}

export function useDeepCompareEffect(callback: EffectCallback, dependencies: React.DependencyList) {
  useEffect(
    callback,
    dependencies.map(useDeepCompareMemoize)
  )
}