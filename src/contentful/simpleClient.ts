/**
 * The standard contentful client doesn't work in react-native
 * So we create one that implements sync only
 */
import {wait} from 'async-toolbox/wait'
import { isAsset, isEntry, isDeletedAsset, isDeletedEntry } from '../util'
import type { SyncCollection, DeletedAsset, DeletedEntry, SyncResponse, SyncEntry, SyncAsset } from './types'


type Fetch = typeof fetch

interface IClientOptions {
  baseUrl: string,
  space: string,
  environmentId: string,
  accessToken: string

  logger?: typeof console['debug']
}

/**
 * Creates a simple client compatible with react-native that only implements sync
 */
export function createSimpleClient(options: Partial<IClientOptions>): SimpleContentfulClient {
  return new SimpleContentfulClient(options)
}

/**
 * A simple client compatible with react-native that only implements sync
 */
export class SimpleContentfulClient {
  private options: IClientOptions
  private logger: typeof console['debug']

  constructor(
    options?: Partial<IClientOptions>,
    private fetch: Fetch = globalThis.fetch,
  ) {
    this.options = {
      baseUrl: 'https://cdn.contentful.com',
      space: process.env.CONTENTFUL_SPACE_ID!,
      accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
      environmentId: process.env.CONTENTFUL_ENVIRONMENT || 'master',
      ...options,
    }
    this.logger = this.options.logger || console.debug
  }

  public async sync(query: any): Promise<SyncCollection> {
    const {space, environmentId} = this.options
    
    const assets: SyncAsset[] = []
    const deletedAssets: DeletedAsset[] = []
    const entries: SyncEntry[] = []
    const deletedEntries: DeletedEntry[] = []

    query = query.nextSyncToken ?
      { sync_token: query.nextSyncToken } :
      { initial: true }

    let resp = await this.get(`/spaces/${space}/environments/${environmentId}/sync`, query)
    let body = await resp.json() as SyncResponse
    assets.push(...body.items.filter<SyncAsset>(isAsset))
    deletedAssets.push(...body.items.filter(isDeletedAsset))
    entries.push(...body.items.filter(isEntry))
    deletedEntries.push(...body.items.filter(isDeletedEntry))

    while(body.nextPageUrl) {
      resp = await this.get(body.nextPageUrl)
      body = await resp.json() as SyncResponse
      assets.push(...body.items.filter<SyncAsset>(isAsset))
      deletedAssets.push(...body.items.filter(isDeletedAsset))
      entries.push(...body.items.filter(isEntry))
      deletedEntries.push(...body.items.filter(isDeletedEntry))
    }
    
    const nextSyncToken = new URL(body.nextSyncUrl!).searchParams.get('sync_token')!
    return {
      assets,
      deletedAssets: deletedAssets as unknown as DeletedAsset[],
      entries,
      deletedEntries: deletedEntries as unknown as DeletedEntry[],
      nextSyncToken,
      toPlainObject() { return this },
      stringifySafe() { return JSON.stringify(this) }
    } as SyncCollection
  }

  private async get(path: string, query: Readonly<Record<string, string | number | undefined>> = {}): Promise<Response> {
    const url = new URL(path, this.options.baseUrl)
    Object.keys(query).forEach((k) => {
      const v = query[k]
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, v.toString())
      }
    })

    let resp: Response

    do {
      if (this.logger) {
        this.logger('get', url.toString())
      }
      resp = await this.fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.options.accessToken}`,
        },
        redirect: 'follow',
      })

      if (resp.status == 404) {
        throw new NotFoundError(`404: ${path}`)
      }

      if (resp.status == 429) {
        const reset = resp.headers.get('X-Contentful-RateLimit-Reset')
        if (!reset) { throw new Error('Rate-limited with no X-Contentful-RateLimit-Reset header!') }

        await wait(parseFloat(reset) * 1000)
        continue
      }

      if (resp.status != 200) {
        // match the error message from the official client
        throw new Error(`Request failed with status code ${resp.status}`)
      }
    } while (resp.status != 200)

    return resp
  }
}

// tslint:disable-next-line: max-classes-per-file
export class NotFoundError extends Error {}
