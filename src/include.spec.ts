
import { InMemoryDataSource } from './dataSource/in-memory-data-source'

import data from '../__fixtures__/contentful-export-2021-05-07T16-34-28.json'
import { withInclude } from './include'

describe('withInclude', () => {
  let dataSource: InMemoryDataSource

  beforeEach(() => {
    dataSource = withInclude(
      new InMemoryDataSource()
    )

    data.entries.map((item: any) => {
      dataSource.index(item)
    })
    data.assets.map((item: any) => {
      dataSource.index(item)
    })
    dataSource.setToken('testtoken')
  })

  it('should resolve linked entries', async () => {
    const result = await dataSource.getEntries({
      'sys.id': 'doyAUR5XEVx4jK4NGvS8z',
      include: 2
    })
    expect(result.items.length).toEqual(1)
    const entry = result.items[0]
    expect(entry.fields.announcements[0].fields.title).toEqual('Give Us Some Feedback')
    expect(entry.fields.days[0].fields.scheduleItem[1].fields.title).toEqual('Workshop Kickoff')
  })

  it('should resolve linked assets', async () => {
    const result = await dataSource.getEntries({
      'sys.id': 'doyAUR5XEVx4jK4NGvS8z',
      include: 2
    })
    expect(result.items.length).toEqual(1)
    const entry = result.items[0]
    expect(entry.fields.maps[0].fields.title).toEqual('Parking')
    expect(entry.fields.maps[0].fields.map.fields.file.url).toEqual(
      '//images.ctfassets.net/xxxxxx/7gdnMGTRQS8EkkgQ3mk4Kh/0fb71cfd2605d257003cf96c5ed67247/CLC19_App_PhoneMap_RJ_Parking.jpg')
  })

  it('should stop at the specified depth', async () => {
    const result = await dataSource.getEntries({
      'sys.id': 'doyAUR5XEVx4jK4NGvS8z',
      include: 0
    })
    expect(result.items.length).toEqual(1)
    const entry = result.items[0]
    expect(entry.fields.announcements[0].sys.type).toEqual('Link')
  })
})