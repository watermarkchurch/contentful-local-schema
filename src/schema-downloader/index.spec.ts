import fs from 'fs-extra'
import nock from 'nock'
import path from 'path'
import tmp from 'tmp'

import { SchemaDownloader } from './index'

let contentTypes: any
let editorInterfaces: any

const opts = {
  filename: '/tmp/db/contentful-schema.json',
  managementToken: 'test',
  space: 'testspace',
}

describe('SchemaDownloader', () => {
  beforeEach(async () => {
    const fixture = await fs.readFile(path.join(__dirname, 'fixtures/contentful-schema-from-export.json'))
    const schema = JSON.parse(fixture.toString())
    contentTypes = schema.contentTypes
    editorInterfaces = schema.editorInterfaces

    if (!nock.isActive()) {
      nock.activate()
    }

    nock('https://api.contentful.com')
      .get('/spaces/testspace')
      .reply(200, {
        name: 'Test Space',
        sys: {
          type: 'Space',
          id: 'testspace',
          version: 2,
          createdBy: {
            sys: {
              type: 'Link',
              linkType: 'User',
              id: 'xxxxx',
            },
          },
          createdAt: '2018-01-22T17:49:19Z',
          updatedBy: {
            sys: {
              type: 'Link',
              linkType: 'User',
              id: 'xxxx',
            },
          },
          updatedAt: '2018-05-30T10:22:40Z',
        },
      })

    nock('https://api.contentful.com')
      .get('/spaces/testspace/environments/master')
      .reply(200, {
        name: 'master',
        sys: {
          type: 'Environment',
          id: 'master',
          version: 1,
          space: {
            sys: {
              type: 'Link',
              linkType: 'Space',
              id: 'testspace',
            },
          },
          status: {
            sys: {
              type: 'Link',
              linkType: 'Status',
              id: 'ready',
            },
          },
          createdBy: {
            sys: {
              type: 'Link',
              linkType: 'User',
              id: 'xxxx',
            },
          },
          createdAt: '2018-01-22T17:49:19Z',
          updatedBy: {
            sys: {
              type: 'Link',
              linkType: 'User',
              id: 'xxxx',
            },
          },
          updatedAt: '2018-01-22T17:49:19Z',
        },
      })

    nock('https://api.contentful.com')
      .get('/spaces/testspace/environments/master/content_types')
      .reply(200, () => {
        return JSON.stringify({
          sys: { type: 'Array' },
          total: contentTypes.length,
          skip: 0,
          limit: 1,
          items: contentTypes,
        })
      })
    const interfaceRegexp = /content_types\/([^\/]+)\/editor_interface/
    nock('https://api.contentful.com')
      .get((uri) => interfaceRegexp.test(uri))
      .times(Infinity)
      .reply((uri) => {
        const id = interfaceRegexp.exec(uri)![1]
        const ei = editorInterfaces.find((i: any) => i.sys.contentType.sys.id == id)
        if (ei) {
          return [
            200,
            JSON.stringify(ei),
          ]
        } else {
          return [404]
        }
      })
  })

  afterEach(() => {
    nock.restore()
  })

it('creates the file in the appropriate directory', async () => {
    const tmpdir = tmp.dirSync()
    try {
      const instance = new SchemaDownloader({
        ...opts,
        filename: path.join(tmpdir.name, '/contentful-schema.json')
      })

      await instance.downloadSchema(fs)

      expect(await fs.pathExists(path.join(tmpdir.name, `/contentful-schema.json`))).toEqual(true)
    } finally {
      await fs.remove(tmpdir.name)
    }
  })

it('writes file with proper formatting', async () => {
    const tmpdir = tmp.dirSync()
    try {
      const instance = new SchemaDownloader({
        ...opts,
        filename: path.join(tmpdir.name, '/contentful-schema.json')
      })

      await instance.downloadSchema(fs)

      const contents = (await fs.readFile(path.join(tmpdir.name, 'contentful-schema.json'))).toString()
      const expected = (await fs.readFile(path.join(__dirname, 'fixtures/contentful-schema.json'))).toString()
      expect(contents).toEqual(expected)

    } finally {
      await fs.remove(tmpdir.name)
    }
  })
})