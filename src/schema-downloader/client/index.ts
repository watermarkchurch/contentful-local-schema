import { URL } from 'url'
import { wait } from 'async-toolbox/wait'

type Fetch = typeof fetch

interface IClientOptions {
  baseUrl: string,
  spaceId: string,
  environmentId: string
  accessToken: string

  responseLogger?: (response: Response) => void
}

export class SimpleCMAClient {
  public static defaultFetch = globalThis.fetch

  private readonly options: IClientOptions

  constructor(
    options?: Partial<IClientOptions>,
    private readonly fetch: Fetch = SimpleCMAClient.defaultFetch,
  ) {
    this.options = {
      baseUrl: 'https://api.contentful.com',
      spaceId: process.env.CONTENTFUL_SPACE_ID!,
      accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN!,
      environmentId: process.env.CONTENTFUL_ENVIRONMENT || 'master',
      ...options,
    }
  }

  public async getContentType(contentType: string): Promise<IContentType> {
    const {spaceId, environmentId} = this.options
    const resp = await this.get(`/spaces/${spaceId}/environments/${environmentId}/content_types/${contentType}`)

    return await resp.json()
  }

  public async* getContentTypes(limit = 100): AsyncGenerator<IContentType> {
    const {spaceId, environmentId} = this.options
    let skip = 0
    let total: number

    do {
      const resp = await this.get(`/spaces/${spaceId}/environments/${environmentId}/content_types`, {
        skip: skip.toString(),
        limit: limit.toString(),
      })
      const body = await resp.json()

      if (body.items.length == 0) { return }
      for (const item of body.items) {
        yield item
      }

      skip = skip + limit
      total = body.total
    } while (skip < total)
  }

  public async getEditorInterface(contentType: string): Promise<IEditorInterface> {
    const {spaceId, environmentId} = this.options
    const resp = await this.get(`/spaces/${spaceId}/environments/${environmentId}/content_types/${contentType}/editor_interface`)

    return await resp.json()
  }

  private async get(path: string, query: Record<string, string> = {}): Promise<Response> {
    const url = new URL(path, this.options.baseUrl)
    Object.keys(query).forEach((k) => {
      url.searchParams.set(k, query[k])
    })

    let resp: Response

    do {
      resp = await this.fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.options.accessToken}`,
        },
        redirect: 'follow',
      })

      if (this.options.responseLogger) {
        this.options.responseLogger(resp)
      }

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
        throw new Error(`Unexpected status code ${resp.status} for '${path}'`)
      }
    } while (resp.status != 200)

    return resp
  }
}

// tslint:disable-next-line: max-classes-per-file
export class NotFoundError extends Error {}


export interface IContentType {
  sys: {
    space: {
      sys: {
        type: 'Link',
        linkType: 'Space',
        id: string,
      },
    },
    id: string,
    type: 'ContentType',
    createdAt: string,
    updatedAt: string,
    createdBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: string,
      },
    },
    updatedBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: string,
      },
    }
    environment?: {
      sys: {
        id: string,
        type: 'Link',
        linkType: 'Environment',
      },
    },
    publishedCounter: number,
    version: number,
    publishedBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: string,
      },
    },
    publishedVersion: number,
    firstPublishedAt: string,
    publishedAt: string,
  },
  displayField: string,
  name: string,
  description: string,
  fields: IField[]
}

export interface IField {
  id: string,
  name: string,
  type: FieldType,
  localized: boolean,
  required: boolean,
  validations: IValidation[],
  disabled: boolean,
  omitted: boolean,
  linkType?: 'Entry' | 'Asset',
  items?: {
    type: FieldType,
    validations: IValidation[],
    linkType: 'Entry' | 'Asset',
  }
}

export type FieldType = 'Symbol' | 'Text' | 'Integer' | 'Number' | 'Date' | 'Boolean' |
  'Object' | 'Location' | 'Array' | 'Link'

export type LinkMimetype = 'attachment' | 'plaintext' | 'image' | 'audio' | 'video' | 'richtext' |
  'presentation' | 'spreadsheet' | 'pdfdocument' | 'archive' | 'code' | 'markup'

export interface IValidation {
  /** Takes an array of content type ids and validates that the link points to an entry of that content type. */
  linkContentType?: string[],
  /** Takes an array of values and validates that the field value is in this array. */
  in?: any[],
  /** Takes a MIME type group name and validates that the link points to an asset of this group. */
  linkMimetypeGroup?: LinkMimetype[],
  /** Takes min and/or max parameters and validates the size of the array (number of objects in it). */
  size?: { max?: number, min?: number },
  /** Takes min and/or max parameters and validates the range of a value. */
  range?: { max?: number, min?: number},
  /** Takes a string that reflects a JS regex and flags, validates against a string.
   * See JS reference for the parameters.
   */
  regexp?: { pattern: string, flags?: string },
  /** Validates that there are no other entries that have the same field value at the time of publication. */
  unique?: true,
  /** Validates that a value falls within a certain range of dates. */
  dateRange?: { min?: string, max?: string },
  /** Validates that an image asset is of a certain image dimension. */
  assetImageDimensions?: { width: { min?: number, max?: number }, height: { min?: number, max?: number } }
  /** Validates that an asset is of a certain file size. */
  assetFileSize?: { max?: number, min?: number },

  message?: string

  /** Other validations */
  [validation: string]: any
}

export interface IEditorInterface {
  sys: {
    id: string,
    type: 'EditorInterface',
    space: {
      sys: {
        id: string,
        type: 'Link',
        linkType: 'Space',
      },
    },
    version: number,
    createdAt: string,
    createdBy: {
      sys: {
        id: string,
        type: 'Link',
        linkType: 'User',
      },
    },
    updatedAt: string,
    updatedBy: {
      sys: {
        id: string,
        type: 'Link',
        linkType: 'User',
      },
    },
    contentType: {
      sys: {
        id: string,
        type: 'Link',
        linkType: 'ContentType',
      },
    },
  },
  controls?: Array<
      {
        fieldId: string,
        widgetNamespace: string,
        widgetId: string,
        settings?: {
          helpText: string,
        },
      }
    >
}
