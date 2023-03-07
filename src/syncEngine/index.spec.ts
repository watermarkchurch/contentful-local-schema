
import nock from 'nock'
import { createClient } from 'contentful'
import {SyncEngine} from '.'
import { InMemoryDataSource } from '../dataSource/in-memory-data-source'

const contentfulClient = createClient({
  accessToken: 'integration-test',
  space: 'xxxxxx',
  retryLimit: 0,
  retryOnError: false
})

import syncInitial from '../../__fixtures__/sync_initial.json'
const syncPages = [
  require('../../__fixtures__/sync_2.json'),
  require('../../__fixtures__/sync_3.json'),
  require('../../__fixtures__/sync_4.json'),
  require('../../__fixtures__/sync_5.json'),
  require('../../__fixtures__/sync_6.json'),
  require('../../__fixtures__/sync_7.json')
]

describe('SyncEngine', () => {
  let store: InMemoryDataSource
  let subject: SyncEngine

  beforeEach(() => {
    store = new InMemoryDataSource()
    subject = new SyncEngine(store, contentfulClient)
    
    if (!nock.isActive()) {
      nock.activate()
    }

    nock('https://cdn.contentful.com')
      .get('/spaces/xxxxxx/environments/master/sync?initial=true')
      .reply(200, JSON.stringify(syncInitial))

    let nextUrl = syncInitial.nextPageUrl
    syncPages.forEach((page) => {
      nock('https://cdn.contentful.com')
        .get(nextUrl.replace('https://cdn.contentful.com', ''))
        .reply(200, page)

      nextUrl = page.nextPageUrl
    })
  })

  afterEach(() => {
    nock.restore()
  })

  it('performs an initial sync w/ all pages', async () => {
    await subject.sync()

    const firstPageEntry = store.getEntry<any>('6RPLNBrHzAwg4X58WFkCBc')
    expect(firstPageEntry?.fields.title).toEqual('Give Us Some Feedback')

    const lastPageEntry = store.getAsset('1QJlrZxpJrSqaLOg0i1tvt')
    expect(lastPageEntry?.fields.title).toEqual('poppins')
  })

  it('stores the sync token', async () => {
    await subject.sync()

    expect(store.getToken()).toEqual('FEnChMOBwr1Yw4TCqsK2LcKpCH3CjsORI8Oewq4AwrIybcKxaS7DosKAwqPChsKFccO9QMOmwphiwrNCfjEEw68kagIswr8kw7LDssOXW8OsbUIKKsKncsKIwr3DhzEVNMOew7Y8wq4hZiJIGsKWZBXDlsKECQ')
  })

  it('uses stored sync token to sync again', async () => {
    // an entry and asset from a previous sync
    store.index({
      'sys': {
        'id': '6RPLNBrHzAwg4X58WFkCBc',
        'type': 'Entry',
        'updatedAt': '2022-02-02T22:22:22.222Z',
        'contentType': {
          'sys': {
            'type': 'Link',
            'linkType': 'ContentType',
            'id': 'announcement'
          }
        }
      },
      'fields': {
        'title': {
          'en-US': 'Give Us Some Feedback'
        }
      }
    } as any)
    store.index({
      'sys': {
        'id': '1QJlrZxpJrSqaLOg0i1tvt',
        'type': 'Asset',
        'updatedAt': '2022-02-02T22:22:22.222Z',
      },
      'fields': {
        'title': {
          'en-US': 'poppins'
        },
      }
    } as any)
    store.setToken('1234')

    nock('https://cdn.contentful.com')
      .get('/spaces/xxxxxx/environments/master/sync?sync_token=1234')
      .reply(200, {
        'sys': {
          'type': 'Array'
        },
        'items': [
          {
            'sys': {
              'id': '6RPLNBrHzAwg4X58WFkCBc',
              'type': 'DeletedEntry',
              'updatedAt': '2022-02-02T23:33:33.33Z',
            }
          },
          {
            'sys': {
              'id': '1QJlrZxpJrSqaLOg0i1tvt',
              'type': 'DeletedAsset',
              'updatedAt': '2022-02-02T23:33:33.33Z',
            }
          }
        ],
        'nextSyncUrl': 'https://cdn.contentful.com/spaces/xxxxxx/environments/master/sync?sync_token=5678'
      })

    await subject.sync()

    expect(store.getEntry('6RPLNBrHzAwg4X58WFkCBc')).toBeFalsy()
    expect(store.getAsset('1QJlrZxpJrSqaLOg0i1tvt')).toBeFalsy()
  })
})