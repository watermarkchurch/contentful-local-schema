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

  it('should resolve linked entries', async () => {
    const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

    // act
    const { result } = renderHook(() => useFindEntry('doyAUR5XEVx4jK4NGvS8z', { include: 2 }), { wrapper })
    
    await waitFor(() => {
      expect(result.current[1].loading).toEqual(false)
    })
    const entry = result.current[0]
    if (!entry) { throw new Error('Entry not found') }

    expect(entry.fields.days[0].fields.scheduleItem[1].fields.title).toEqual('Workshop Kickoff')
    expect(entry.fields.maps[0].fields.map.fields.file.url).toEqual(
      '//images.ctfassets.net/xxxxxx/7gdnMGTRQS8EkkgQ3mk4Kh/0fb71cfd2605d257003cf96c5ed67247/CLC19_App_PhoneMap_RJ_Parking.jpg')
  })

  describe('withSync', () => {
    let sync: jest.Mock
    beforeEach(async () => {
      sync = jest.fn().mockImplementation(async () => {
        await wait(100)
      })

      Object.assign(dataSource, {
        sync
      })
    })

    describe('refresh()', () => {
      it('should set refreshing to true', async () => {
        const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

        // act
        const { result } = renderHook(() => useFindEntry('3jxtEUoipivQ7TkUfxvPvI'), { wrapper })
        
        await waitFor(() => {
          expect(result.current[1].loading).toEqual(false)
        })
        const [entry, _, refresh] = result.current
        if (!entry) { throw new Error('Entry not found') }

        // act
        let p: Promise<any>
        act(() => {
          p = refresh()
        })
        const [__, {refreshing}] = result.current

        // assert
        expect(refreshing).toEqual(true)

        await act(async () => { await p })

        const [___, {refreshing: refreshing2}] = result.current
        // assert
        expect(refreshing2).toEqual(false)
      })
    })

    describe('autoRefresh: false', () => {
      it('should set stale to true when the dataSource is updated', async () => {
        const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

        const { result } = renderHook(() => useFindEntry('3jxtEUoipivQ7TkUfxvPvI', { autoRefresh: false }), { wrapper })        
        await waitFor(() => {
          expect(result.current[1].loading).toEqual(false)
        })

        const [entry, {stale}] = result.current
        if (!entry) { throw new Error('Entry not found') }
        expect(stale).toEqual(false)

        // act
        await act(async () => {
          await dataSource.index({
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
        const [__, {stale: stale2}, refresh] = result.current

        // assert
        expect(stale2).toEqual(true)

        await act(async () => { await refresh() })

        const [___, {stale: stale3}] = result.current
        // assert
        expect(stale3).toEqual(false)
      })

      it('should complete the refresh if dataSource is updated during sync', async () => {
        const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

        // set up - find an initial entry
        const { result } = renderHook(() => useFindEntry('3jxtEUoipivQ7TkUfxvPvI', { autoRefresh: false }), { wrapper })        
        await waitFor(() => {
          expect(result.current[1].loading).toEqual(false)
        })

        // When refresh is called, that will call sync.  Pretend that the sync indexes a new entry.
        sync.mockImplementation(async () => {
          await dataSource.index({
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

        const [entry, {stale}, refresh] = result.current
        if (!entry) { throw new Error('Entry not found') }
        expect(entry.fields.code).toEqual('CLC2019')
        expect(stale).toEqual(false)

        // act
        await act(async () => { await refresh() })

        const [entry2, {stale: stale2}, _] = result.current

        // assert
        expect(entry2!.fields.code).toEqual('CLC2020')
        expect(stale2).toEqual(false)
      })
    })

    describe('autoRefresh: true', () => {
      it('should automatically update stale data', async () => {
        const wrapper = ({ children }: any) => <LocalSchemaProvider dataSource={dataSource}>{children}</LocalSchemaProvider>

        const { result } = renderHook(() => useFindEntry('3jxtEUoipivQ7TkUfxvPvI', {}, []), { wrapper })        
        await waitFor(() => {
          expect(result.current[1].loading).toEqual(false)
        })

        const [entry, {stale}] = result.current
        if (!entry) { throw new Error('Entry not found') }
        expect(stale).toEqual(false)

        // act
        await act(async () => {
          await dataSource.index({
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
        const [__, {stale: stale2}, refresh] = result.current

        // assert
        expect(stale2).toEqual(true)

        await act(async () => { await refresh() })

        const [___, {stale: stale3}] = result.current
        // assert
        expect(stale3).toEqual(false)
      })
    })
  })
})