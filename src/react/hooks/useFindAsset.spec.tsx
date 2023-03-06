/** @jest-environment jsdom */

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { wait } from 'async-toolbox'

import { InMemoryDataSource } from '../../dataSource/in-memory-data-source'
import { LocalSchemaProvider } from '../context'
import { useFindAsset } from './useFindAsset'
import type { Asset } from '../../contentful/types'

import fixture from '../../../__fixtures__/contentful-export-2021-05-07T16-34-28.json'


describe('useFindAsset', () => {
  let dataSource: InMemoryDataSource

  beforeEach(async () => {
    const ds = new InMemoryDataSource()
    fixture.entries.forEach((e: any) => ds.index(e))
    fixture.assets.forEach((a: any) => ds.index(a))
    dataSource = ds
  })

  it('should find an asset that exists', async () => {
    const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

    // act
    const { result } = renderHook(() => useFindAsset('1QJlrZxpJrSqaLOg0i1tvt'), { wrapper })
    
    await waitFor(() => {
      expect(result.current[1].loading).toEqual(false)
    })
    const entry = result.current[0]
    if (!entry) { throw new Error('Entry not found') }
    expect(entry.sys.id).toEqual('1QJlrZxpJrSqaLOg0i1tvt')
    expect(entry.fields.title).toEqual('poppins')
  })

  it('should rerun the query when the id changes', async () => {
    const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

    const { result, rerender } = renderHook(
      ({id}: {id: string}) => useFindAsset(id),
      {
        initialProps: {id: '1QJlrZxpJrSqaLOg0i1tvt'},
        wrapper
      })
    
    await waitFor(() => {
      const [entry, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(entry?.sys?.id).toEqual('1QJlrZxpJrSqaLOg0i1tvt')
    })

    // act
    rerender({id: '36SvzmmQXUW5naOO1iN2oY'})
    await waitFor(() => {
      const [entry, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(entry?.sys?.id).toEqual('36SvzmmQXUW5naOO1iN2oY')
    })
  })

  it('should rerun the query when the asset is reindexed', async () => {
    const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

    const { result } = renderHook(() => useFindAsset('1QJlrZxpJrSqaLOg0i1tvt'), { wrapper })

    await waitFor(() => {
      const [entry, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(entry?.fields?.title).toEqual('poppins')
    })
    await wait(2)

    // act
    act(() => {
      dataSource.index({
        sys: {
          id: '1QJlrZxpJrSqaLOg0i1tvt',
          type: 'Asset',
          updatedAt: '2022-01-02T18:00:00.000Z'
        },
        fields: {
          title: {
            'en-US': 'poppins2'
          }
        }
      } as unknown as Asset)
    })

    await waitFor(() => {
      const [entry, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(entry?.fields?.title).toEqual('poppins2')
    })

  })
})