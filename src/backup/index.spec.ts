import { InMemoryDataSource } from "../dataSource/in-memory-data-source"

import { withBackup, DataSourceWithBackup } from './index'

const syncInitial = require('../../__fixtures__/sync_initial.json')

describe('withBackup', () => {
  let dataSource: InMemoryDataSource & DataSourceWithBackup

  let storage: Map<string, string>

  beforeEach(() => {
    storage = new Map()

    dataSource = withBackup(
      new InMemoryDataSource(),
      {
        setItem: (key: string, value: string) => {
          storage.set(key, value);
          return Promise.resolve()
        },
        getItem: (key: string) => Promise.resolve(storage.get(key) || null),
      },
      'test1'
    )

    syncInitial.items.map((item: any) => {
      dataSource.index(item)
    })
    dataSource.setToken('testtoken')
  })

  describe('backup', () => {
    it('writes entries to key', async () => {
      await dataSource.backup()

      const got = JSON.parse(storage.get('test1/entries')!)
      expect(got.size).toEqual(syncInitial.items.size)
      const item = got.find((i: any) => i.sys.id == '6RPLNBrHzAwg4X58WFkCBc')
      expect(item).toEqual(syncInitial.items[0])

      expect(storage.get('test1/token')).toEqual('testtoken')
    })
  })

  describe('restore', () => {
    it('loads entries from key', async () => {
      storage.set('test1/entries', JSON.stringify([
        {
          "sys": {
            "id": "1CzEEMjnxk9ETPxwJVYtXI",
            "type": "Entry",
            "createdAt": "2019-03-07T15:52:27.636Z",
            "updatedAt": "2021-04-23T20:12:25.930Z",
            "contentType": {
              "sys": {
                "type": "Link",
                "linkType": "ContentType",
                "id": "speaker"
              }
            }
          },
          "fields": {
            "internalTitle": {
              "en-US": "Nate W"
            },
            "name": {
              "en-US": "Nate W"
            },
          }
        }
      ]))

      // act
      await dataSource.restore()

      // assert
      const e = dataSource.getEntry<any>('1CzEEMjnxk9ETPxwJVYtXI')
      expect(e?.fields.name).toEqual('Nate W')
    })

    it('restores DeletedEntry messages', async () => {
      storage.set('test1/entries', JSON.stringify([
        {
          "sys": {
            "id": "6RPLNBrHzAwg4X58WFkCBc",
            "type": "DeletedEntry",
            "createdAt": "2019-04-04T16:58:18.595Z",
            "updatedAt": "2022-02-02T22:22:22.222Z",
          }
        }
      ]))

      // act
      await dataSource.restore()

      // assert
      const e = dataSource.getEntry<any>('6RPLNBrHzAwg4X58WFkCBc')
      expect(e).toBeFalsy()
    })
  })
})