import { Syncable } from '../syncEngine'
import type { DeletedEntry } from '../contentful/types'
import { InMemoryDataSource } from './in-memory-data-source'

import syncInitial from '../../__fixtures__/sync_initial.json'
import { assertPresent } from '../util'

describe('InMemoryDataSource', () => {
  let instance: InMemoryDataSource
  beforeEach(() => {
    instance = new InMemoryDataSource()
    syncInitial.items.map((item: any) => {
      instance.index(item)
    })
  })

  it('gets a synced entry', () => {
    const item0 = syncInitial.items[0]

    const got = instance.getEntry(item0.sys.id, { locale: '*' })

    expect(got).toEqual(item0)
    expect(instance.getAsset(item0.sys.id)).toBeNull()
  })

  it('gets a synced asset', () => {
    const expected = syncInitial.items.find((i: any) => i.sys.id == '5PPyBNpCxFOROmqRZZJEVw')

    assertPresent(expected)
    const got = instance.getAsset(expected.sys.id, { locale: '*' })

    expect(got).toEqual(expected)
    expect(instance.getEntry(expected.sys.id)).toBeNull()
  })

  it('gets all synced entries', () => {
    syncInitial.items.map((item: any) => {
      instance.index(item)
    })

    const entries = instance.getEntries()
    const assets = instance.getAssets()

    expect(entries.total).toEqual(68)
    expect(entries.items.length).toEqual(68)
    expect(assets.total).toEqual(32)
    expect(assets.items.length).toEqual(32)
  })

  it('handles sync token', async () => {
    const i: Syncable = instance

    expect(await i.getToken()).toBeNull()
    await i.setToken('1234')
    expect(await i.getToken()).toEqual('1234')
  })

  it('handles deletion of entries', () => {
    const item0 = syncInitial.items[0]

    const deletedEntry = {
      sys: {
        ...item0.sys,
        updatedAt: '2021-05-03T14:17:34.000Z',
        deletedAt: '2021-05-03T14:17:34.000Z',
        type: 'DeletedEntry',
      } as Partial<DeletedEntry['sys']>
    } as DeletedEntry

    instance.index(deletedEntry)
    const got = instance.getEntry(item0.sys.id, { locale: '*' })
    expect(got).toBeFalsy()
    const result = instance.getEntries({ 'title': 'Give Us Some Feedback' })
    expect(result.items.length).toEqual(0)
  })

  describe('querying by', () => {
    it('sys.id', () => {
      const items = instance.getEntries({ 'sys.id': '2dVyGMdo3yydeL0QMuc5Cx' })
      expect(items.items[0].fields.name).toEqual('Rachel S')
    })

    it('name', () => {
      const items = instance.getEntries({ 'name': 'Rachel S' })
      expect(items.items[0].sys.id).toEqual('2dVyGMdo3yydeL0QMuc5Cx')
    })

    it('gt', () => {
      const entries = instance.getEntries({
        content_type: 'event',
        'fields.startTime[gt]': '2021-04-29T07:30-05:00'
      })

      const titles = entries.items.map((i) => i.fields.title)
      expect(titles).not.toContain('Workshop Kickoff')
      expect(titles).not.toContain('Staff Consulting Appointments')
      expect(titles).toContain('Main Stage Session 5')
    })

    it('gte', () => {
      const entries = instance.getEntries({
        content_type: 'event',
        'fields.startTime[gte]': '2021-04-29T07:30-05:00'
      })

      const titles = entries.items.map((i) => i.fields.title)
      expect(titles).not.toContain('Workshop Kickoff')
      expect(titles).toContain('Staff Consulting Appointments')
      expect(titles).toContain('Main Stage Session 5')
    })

    it('lt', () => {
      const entries = instance.getEntries({
        content_type: 'event',
        'fields.startTime[lt]': '2021-04-29T07:30-05:00'
      })

      const titles = entries.items.map((i) => i.fields.title)
      expect(titles).toContain('Workshop Kickoff')
      expect(titles).not.toContain('Staff Consulting Appointments')
      expect(titles).not.toContain('Main Stage Session 5')
    })

    it('lte', () => {
      const entries = instance.getEntries({
        content_type: 'event',
        'fields.startTime[lte]': '2021-04-29T07:30-05:00'
      })

      const titles = entries.items.map((i) => i.fields.title)
      expect(titles).toContain('Workshop Kickoff')
      expect(titles).toContain('Staff Consulting Appointments')
      expect(titles).not.toContain('Main Stage Session 5')
    })
  })
  
  describe('import', () => {
    it('replaces all existing entreis', async () => {
      const newItems = [
        {
          sys: {
            id: '1',
            type: 'Entry',
            contentType: {
              sys: {
                id: 'person'
              }
            }
          },
          fields: {
            name: 'Alice'
          }
        },
        {
          sys: {
            id: '2',
            type: 'Asset'
          },
          fields: {
            title: 'Bob'
          }
        }
      ] as any[]
      
      // act
      await instance.import(newItems, 'newToken')
      
      const entries = instance.getEntries()
      const assets = instance.getAssets()

      expect(entries.total).toEqual(1)
      expect(entries.items.length).toEqual(1)
      expect(assets.total).toEqual(1)
      expect(assets.items.length).toEqual(1)
      expect(instance.getToken()).toEqual('newToken')
    })
  })
})
