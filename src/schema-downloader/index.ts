import { Limiter } from 'async-toolbox'
import type FS from 'fs'
import { SimpleCMAClient } from './client'

export interface SchemaDownloaderOptions {
  /**
   * The name of the schema file.  Defaults to './contentful-schema.json'.
   */
  filename: string
  /**
   * Contentful space ID.  Defaults to process.env.CONTENTFUL_SPACE_ID
   */
  space: string

  /**
   * Contentful environment.
   * 
   * Defaults to process.env.CONTENTFUL_ENVIRONMENT or 'master'
   */
  environment: string
  /**
   * Contentful Management Access Token.
   * 
   * Defaults to process.env.CONTENTFUL_MANAGEMENT_TOKEN
   */
  managementToken: string

  logger: { debug: Console['debug'] }
}

export class SchemaDownloader {
  private readonly options: Readonly<SchemaDownloaderOptions>
  private readonly client: SimpleCMAClient
  private readonly semaphore: Limiter

  constructor(options?: Partial<SchemaDownloaderOptions>) {
    const opts: SchemaDownloaderOptions = Object.assign({
      filename: './contentful-schema.json',
      managementToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN,
      space: process.env.CONTENTFUL_SPACE_ID,
      environment: process.env.CONTENTFUL_ENVIRONMENT || 'master',
      logger: { debug: () => undefined },
    } as SchemaDownloaderOptions, options)

    if (!opts.managementToken) {
      throw new Error('No managementToken given!')
    }

    this.options = opts
    this.client = new SimpleCMAClient({
      spaceId: opts.space,
      environmentId: opts.environment,
      accessToken: opts.managementToken,
      responseLogger: this.responseLogger,
    })
    this.semaphore = new Limiter({
      interval: 'second',
      tokensPerInterval: 4,
    })
  }

  public async downloadSchema(fs: typeof FS) {
    const {
      contentTypes,
      editorInterfaces,
    } = await this.getSchemaFromSpace()

    // Use callback API to avoid dependency on fs-extra
    return new Promise<void>((res, rej) => {
      fs.writeFile(this.options.filename, JSON.stringify({
        contentTypes,
        editorInterfaces,
      }, undefined, '  '), (ex) => {
        if (ex) { return rej(ex) }

        // contentful-shell and the wcc-contentful gem both add a newline at the end of the file.
        fs.appendFile(this.options.filename, '\n', (ex) => {
          if (ex) { return rej(ex) }

          res()
        })
      })

    })
  }

  private async getSchemaFromSpace() {
    
    const contentTypesResp = await this.semaphore.lock(() =>
      toArray(this.client.getContentTypes()))

    const editorInterfaces = (await Promise.all(
      contentTypesResp.map((ct) =>
        this.semaphore.lock(async () =>
        sortControls(
          stripSys(
            await this.client.getEditorInterface(ct.sys.id),
          ),
        ),
      )),
    )).sort(byContentType)

    const contentTypes = contentTypesResp.map((ct) =>
      stripSys(ct))
      .sort(byId)

    return {
      contentTypes,
      editorInterfaces,
    }
  }

  private responseLogger = (response: Response) => {
    this.options.logger.debug(response.status, response.url)
  }
}

async function toArray<T>(generator: AsyncGenerator<T, void, void>): Promise<T[]> {
  const results: T[] = []
  for await (const item of generator) {
    results.push(item)
  }
  return results
}

function stripSys(obj: any): any {
  return {
    ...obj,
    sys: {
      id: obj.sys.id,
      type: obj.sys.type,
      contentType: obj.sys.contentType,
    },
  }
}

function sortControls(editorInterface: any) {
  return {
    sys: editorInterface.sys,
    controls: editorInterface.controls
      .sort(byFieldId)
      .map((c: any) => ({
        fieldId: c.fieldId,
        settings: c.settings,
        widgetId: c.widgetId,
      })),
  }
}

function byId(a: { sys: { id: string } }, b: { sys: { id: string } }): number {
  return a.sys.id.localeCompare(b.sys.id)
}

function byContentType(
  a: {sys: {contentType: {sys: {id: string}}}},
  b: {sys: {contentType: {sys: {id: string}}}},
): number {
  return a.sys.contentType.sys.id.localeCompare(b.sys.contentType.sys.id)
}

function byFieldId(
  a: { fieldId: string },
  b: { fieldId: string },
): number {
  return a.fieldId.localeCompare(b.fieldId)
}
