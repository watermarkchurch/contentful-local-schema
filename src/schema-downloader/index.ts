import { Limiter } from 'async-toolbox'
import {createClient} from 'contentful-management'
import type FS from 'fs'

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
  private readonly client: any
  private readonly semaphore: Limiter
  private readonly fs: typeof FS

  constructor(options?: Partial<SchemaDownloaderOptions>, fs?: typeof FS) {
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
    this.client = createClient({
      accessToken: opts.managementToken,
      requestLogger: this.requestLogger,
      responseLogger: this.responseLogger,
    })
    this.semaphore = new Limiter({
      interval: 'second',
      tokensPerInterval: 4,
    })

    this.fs = fs || require('fs-extra')
  }

  public async downloadSchema() {
    const {
      contentTypes,
      editorInterfaces,
    } = await this.getSchemaFromSpace()

    // Use callback API to avoid dependency on fs-extra
    return new Promise<void>((res, rej) => {
      this.fs.writeFile(this.options.filename, JSON.stringify({
        contentTypes,
        editorInterfaces,
      }, undefined, '  '), (ex) => {
        if (ex) { return rej(ex) }

        // contentful-shell and the wcc-contentful gem both add a newline at the end of the file.
        this.fs.appendFile(this.options.filename, '\n', (ex) => {
          if (ex) { return rej(ex) }

          res()
        })
      })

    })
  }

  private async getSchemaFromSpace() {
    const space = await this.semaphore.lock<any>(() =>
      this.client.getSpace(this.options.space))
    const env = await this.semaphore.lock<any>(() =>
      space.getEnvironment(this.options.environment))

    const contentTypesResp = await this.semaphore.lock<any>(() =>
      env.getContentTypes())

    const editorInterfaces = (await Promise.all<any>(
      contentTypesResp.items.map((ct: any) =>
        this.semaphore.lock<any>(async () =>
        sortControls(
          stripSys(
            (await ct.getEditorInterface())
              .toPlainObject(),
          ),
        ),
      )),
    )).sort(byContentType)
    const contentTypes = contentTypesResp.items.map((ct: any) =>
      stripSys(ct.toPlainObject()))
      .sort(byId)

    return {
      contentTypes,
      editorInterfaces,
    }
  }

  private requestLogger = (config: any) => {
    // console.log('req', config)
  }

  private responseLogger = (response: any) => {
    this.options.logger.debug(response.status, response.config.url)
  }
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
