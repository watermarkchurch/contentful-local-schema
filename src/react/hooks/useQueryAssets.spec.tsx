/** @jest-environment jsdom */

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { wait } from 'async-toolbox'

import { InMemoryDataSource } from '../../dataSource/in-memory-data-source'
import { LocalSchemaProvider } from '../context'
import type { Asset, SyncAsset } from '../../contentful/types'
import { useQueryAssets } from './useQueryAssets'

import fixture from '../../../__fixtures__/contentful-export-2021-05-07T16-34-28.json'

describe('useQueryAssets', () => {
  let dataSource: InMemoryDataSource

  beforeEach(async () => {
    const ds = new InMemoryDataSource()
    fixture.entries.forEach((e: any) => ds.index(e))
    fixture.assets.forEach((a: any) => ds.index(a))
    dataSource = ds
  })

  it('should find entries that exist', async () => {
    const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

    // act
    const { result } = renderHook(
      () => useQueryAssets({ 'title[in]': ['poppins', 'avatar'] }),
      { wrapper }
    )
    
    await waitFor(() => {
      expect(result.current[1].loading).toEqual(false)
    })
    const assets = result.current[0]
    if (!assets) { throw new Error('Assets missing') }
    expect(assets.total).toEqual(2)
    expect(assets.items[0].sys.id).toEqual('1QJlrZxpJrSqaLOg0i1tvt')
    expect(assets.items[0].fields.title).toEqual('poppins')

    expect(assets.items[1].sys.id).toEqual('4pQ9K1TbfMjzu5o4BKelK4')
    expect(assets.items[1].fields.title).toEqual('avatar')
  })

  it('should rerun when the query changes', async () => {
    const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

    const { result, rerender } = renderHook(
      ({id}: {id: string}) => useQueryAssets({ 'sys.id': id }),
      {
        initialProps: {id: '1QJlrZxpJrSqaLOg0i1tvt'},
        wrapper
      })
    
    await waitFor(() => {
      const [assets, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(assets?.total).toEqual(1)
      expect(assets?.items[0].sys.id).toEqual('1QJlrZxpJrSqaLOg0i1tvt')
    })

    // act
    rerender({id: '36SvzmmQXUW5naOO1iN2oY'})
    await waitFor(() => {
      const [assets, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(assets?.total).toEqual(1)
      expect(assets?.items[0].sys.id).toEqual('36SvzmmQXUW5naOO1iN2oY')
    })
  })

  it('should rerun the query when the entry is reindexed', async () => {
    const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

    const { result } = renderHook(() => useQueryAssets(), { wrapper })

    await waitFor(() => {
      const [assets, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(assets?.total).toEqual(268)
      expect(assets?.items[0].fields.title).toEqual('poppins')
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
      } as unknown as SyncAsset)
    })

    await waitFor(() => {
      const [assets, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(assets?.items[0].fields.title).toEqual('poppins2')
    })
  })
})
