/** @jest-environment jsdom */

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { wait } from 'async-toolbox'

import { InMemoryDataSource } from '../../dataSource/in-memory-data-source'
import { LocalSchemaProvider } from '../context'
import { useFindEntry } from './useFindEntry'
import type { Entry } from '../../contentful/types'

import fixture from '../../../__fixtures__/contentful-export-2021-05-07T16-34-28.json'


describe('useFindEntry', () => {
  let dataSource: InMemoryDataSource

  beforeEach(async () => {
    const ds = new InMemoryDataSource()
    fixture.entries.forEach((e: any) => ds.index(e))
    fixture.assets.forEach((a: any) => ds.index(a))
    dataSource = ds
  })

  it('should find an entry that exists', async () => {
    const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

    // act
    const { result } = renderHook(() => useFindEntry('3jxtEUoipivQ7TkUfxvPvI'), { wrapper })
    
    await waitFor(() => {
      expect(result.current[1].loading).toEqual(false)
    })
    const entry = result.current[0]
    if (!entry) { throw new Error('Entry not found') }
    expect(entry.sys.id).toEqual('3jxtEUoipivQ7TkUfxvPvI')
    expect(entry.fields.code).toEqual('CLC2019')
  })

  it('should rerun the query when the id changes', async () => {
    const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

    const { result, rerender } = renderHook(
      ({id}: {id: string}) => useFindEntry(id),
      {
        initialProps: {id: '3jxtEUoipivQ7TkUfxvPvI'},
        wrapper
      })
    
    await waitFor(() => {
      const [entry, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(entry?.sys?.id).toEqual('3jxtEUoipivQ7TkUfxvPvI')
    })

    // act
    rerender({id: '2HcOYgibuW3jiglNvtm3gj'})
    await waitFor(() => {
      const [entry, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(entry?.sys?.id).toEqual('2HcOYgibuW3jiglNvtm3gj')
    })
  })

  it('should rerun the query when the entry is reindexed', async () => {
    const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

    const { result } = renderHook(() => useFindEntry('3jxtEUoipivQ7TkUfxvPvI'), { wrapper })

    await waitFor(() => {
      const [entry, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(entry?.fields?.code).toEqual('CLC2019')
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
            'en-US': 'CLC2020'
          }
        }
      } as Entry<any>)
    })

    await waitFor(() => {
      const [entry, {loading}] = result.current
      expect(loading).toEqual(false)
      expect(entry?.fields?.code).toEqual('CLC2020')
    })

  })
})