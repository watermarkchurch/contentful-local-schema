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

  describe('querying by', () => {
    it('sys.id', () => {
      const items = instance.getEntries({ 'sys.id': '2dVyGMdo3yydeL0QMuc5Cx' })
      expect(items.items[0].fields.name).toEqual('Rachel S')
    })
  })
})