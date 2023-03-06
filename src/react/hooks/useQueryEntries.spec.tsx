/** @jest-environment jsdom */

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { wait } from 'async-toolbox'

import { InMemoryDataSource } from '../../dataSource/in-memory-data-source'
import { LocalSchemaProvider } from '../context'
import type { Entry } from '../../contentful/types'
import { useQueryEntries } from './useQueryEntries'

import fixture from '../../../__fixtures__/contentful-export-2021-05-07T16-34-28.json'

describe('useQueryEntries', () => {
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
      () => useQueryEntries('conference', { 'code[in]': ['CLC2019', 'CLC2021'] }),
      { wrapper }
    )
    
    await waitFor(() => {
      expect(result.current[1].loading).toEqual(false)
    })
    const entries = result.current[0]
    if (!entries) { throw new Error('Entries missing') }
    expect(entries.total).toEqual(2)
    expect(entries.items[0].sys.id).toEqual('3jxtEUoipivQ7TkUfxvPvI')
    expect(entries.items[0].fields.code).toEqual('CLC2019')

    expect(entries.items[1].sys.id).toEqual('doyAUR5XEVx4jK4NGvS8z')
    expect(entries.items[1].fields.code).toEqual('CLC2021')
  })

  it('should rerun when the query changes', async () => {
    const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

    const { result, rerender } = renderHook(
      ({id}: {id: string}) => useQueryEntries('conference', { 'sys.id': id }),
      {
        initialProps: {id: '3jxtEUoipivQ7TkUfxvPvI'},
        wrapper
      })
    
    await waitFor(() => {
      const [entries, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(entries?.items[0].sys.id).toEqual('3jxtEUoipivQ7TkUfxvPvI')
    })

    // act
    rerender({id: 'doyAUR5XEVx4jK4NGvS8z'})
    await waitFor(() => {
      const [entries, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(entries?.items[0].sys.id).toEqual('doyAUR5XEVx4jK4NGvS8z')
    })
  })

  it('should rerun the query when the entry is reindexed', async () => {
    const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

    const { result } = renderHook(() => useQueryEntries('conference'), { wrapper })

    await waitFor(() => {
      const [entries, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(entries?.total).toEqual(3)
      expect(entries?.items[0].fields.code).toEqual('CLC2019')
    })
    await wait(2)

    // act
    act(() => {
      dataSource.index({
        sys: {
          id: '3jxtEUoipivQ7TkUfxvPvI',
          type: 'Entry',
          'contentType': {
            'sys': {
              'type': 'Link',
              'linkType': 'ContentType',
              'id': 'conference'
            }
          },
          updatedAt: '2022-01-02T18:00:00.000Z'
        },
        fields: {
          code: {
            'en-US': 'CLCASDF'
          }
        }
      } as Entry<any>)
    })

    await waitFor(() => {
      const [entries, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(entries?.items[0].fields.code).toEqual('CLC2019')
    })
  })
})