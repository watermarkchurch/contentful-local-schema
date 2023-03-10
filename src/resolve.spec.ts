
import { InMemoryDataSource } from './dataSource/in-memory-data-source'

import data from '../__fixtures__/contentful-export-2021-05-07T16-34-28.json'
import { withResolve } from './resolve'
import { DeletedEntry } from './contentful/types'

describe('withInclude', () => {
  let dataSource: InMemoryDataSource

  beforeEach(() => {
    dataSource = withResolve(
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
    expect(entry.fields.announcements[0].sys.id).toEqual('6RPLNBrHzAwg4X58WFkCBc')
  })

  it('should remove links to missing entries/assets', async () => {
    // before: delete the referenced announcement that was a link above
    await dataSource.index({
      sys: {
        id: '6RPLNBrHzAwg4X58WFkCBc',
        type: 'DeletedEntry',
        updatedAt: '2023-01-01T16:34:28.000Z',
      }
    } as DeletedEntry)

    const result = await dataSource.getEntries({
      'sys.id': 'doyAUR5XEVx4jK4NGvS8z',
      include: 1
    })
    expect(result.items.length).toEqual(1)
    const entry = result.items[0]
    expect(entry.fields.announcements[0]).toBeNull()
  })

  it('correctly resolves duplicate linked entries', async () =>{{
    const result = await dataSource.getEntries({
      'sys.id': 'doyAUR5XEVx4jK4NGvS8z',
      include: 5
    })
    // 1odFtvQ3f6ke5e19PG1Fnx

    const communicationTeamOverview = result.items[0].fields.tracks[0].fields.scheduleItems[0]
    expect(communicationTeamOverview.fields.title).toEqual('Communication Team Overview')
    const breakoutSession2 = result.items[0].fields.days[2].fields.scheduleItem[5]
    expect(breakoutSession2.fields.title).toEqual('Breakout Session 2')
    const communicationTeamOverview2 = breakoutSession2.fields.breakouts[20]
    expect(communicationTeamOverview2.fields.title).toEqual('Communication Team Overview')

    // The kicker - the two entries should be the same object
    expect(communicationTeamOverview).toBe(communicationTeamOverview2)

    // And it should be resolved
    expect(communicationTeamOverview.fields.speakers[0].fields.name).toEqual('C M')
    expect(communicationTeamOverview.fields.speakers[0].fields.photo.fields.file.fileName).toEqual('C-McIntyre.jpeg')
  }})
})