import { Syncable } from "../syncEngine"
import { DeletedEntry } from "../util"
import { InMemoryDataSource } from "./in-memory-data-source"

const syncInitial = require('../../__fixtures__/sync_initial.json')

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
    expect(instance.getAsset(item0.sys.id)).toBeUndefined()
  })

  it('gets a synced asset', () => {
    const expected = syncInitial.items.find((i: any) => i.sys.id == '5PPyBNpCxFOROmqRZZJEVw')

    const got = instance.getAsset(expected.sys.id, { locale: '*' })

    expect(got).toEqual(expected)
    expect(instance.getEntry(expected.sys.id)).toBeUndefined()
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

    expect(await i.getToken()).toBeUndefined()
    await i.setToken('1234')
    expect(await i.getToken()).toEqual('1234')
  })

  it('handles deletion of entries', () => {
    const item0 = syncInitial.items[0]

    const deletedEntry: DeletedEntry = {
      sys: {
        ...item0.sys,
        updatedAt: '2021-05-03T14:17:34.000Z',
        type: 'DeletedEntry'
      }
    }

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
  })
})