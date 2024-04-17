// Copy types from contentful client so we don't need a dependency on it

/**
 * This is the shape of a Sync response coming back from the Contentful client library.
 * 
 * When we get a Sync response back from the API, the items it contains have the form of a "locale=*" entry.
 * See the SyncEntry type below for more details.
 */
export interface SyncCollection {
  entries: Array<SyncEntry>;
  assets: Array<SyncAsset>;
  deletedEntries: Array<DeletedEntry>;
  deletedAssets: Array<DeletedAsset>;
  nextSyncToken: string;
}

export interface ContentType {
  sys: {
    id: string
  },
  fields: ContentTypeField[]
}

export interface ContentTypeField {
  id: string
  type: string
  omitted?: boolean
  required?: boolean
  validations?: Array<unknown | LinkContentTypeValidation>
  linkType?: 'Asset' | 'Entry'
  items?: {
    type: string,
    linkType?: 'Asset' | 'Entry'
    validations?: Array<unknown | LinkContentTypeValidation>
  }
}

export interface LinkContentTypeValidation {
  linkContentType: string[]
}

export interface Sys<Type extends string = string> {
  type: Type;
  id: string;
  createdAt: string;
  updatedAt: string;
  revision?: number;
  space?: Link<'Space'>
}

export interface EntrySys extends Sys<'Entry'> {
  contentType: Link<'ContentType'>,
  locale: string;
}

/**
 * This is the shape of a "Link" field in an entry.  It is a reference to another entry or asset.
 * 
 * Data Sources will resolve links down to the specified depth when an entry is queried.  Unresolved links will
 * have this shape.
 */
export interface Link<LinkType extends string = string> {
  sys: {
    type: 'Link',
    linkType: LinkType,
    id: string
  }
}

/**
 * This is the shape of entries that we normally get back from the Delivery API.
 * They contain a single locale and have a "locale" property in the sys object.
 * 
 * The Sync API returns entries in a different format, see below.  DataSources are expected to denormalize the Sync API
 * response into this format when an entry is queried.
 */
export interface Entry<T = Record<string, unknown>> {
  sys: EntrySys;
  fields: T;
  metadata?: Metadata;
}

/**
 * This is the shape of entries that we get back from the Sync API.
 * They have the form of a "locale=*" entry, i.e. they contain all locales for a given entry and do not have a "locale"
 * property in the sys object.
 */
export interface SyncEntry {
  sys: Sys<'Entry'> & {
    contentType: Link<'ContentType'>,
  },
  fields: {
    [key: string]: {
      [locale: string]: unknown
    }
  },
  metadata?: Metadata
}

export interface AssetSys extends Sys<'Asset'> {
  locale: string;
}

/**
 * This is the shape of assets that we normally get back from the Delivery API.
 * They contain a single locale and have a "locale" property in the sys object.
 * 
 * The Sync API returns assets in a different format, see below.  DataSources are expected to denormalize the Sync API
 * response into this format when an asset is queried.
 */
export interface Asset {
  sys: AssetSys
  fields: {
      title: string;
      description: string;
      file: {
          url: string;
          details: {
              size: number;
              image?: {
                  width: number;
                  height: number;
              };
          };
          fileName: string;
          contentType: string;
      };
  };
  metadata?: Metadata;
}

/**
 * This is the shape of assets that we get back from the Sync API.
 * They have the form of a "locale=*" entry, i.e. they contain all locales for a given asset and do not have a "locale"
 * property in the sys object.
 */
export interface SyncAsset {
  sys: Sys<'Asset'>,
  fields: {
    title: { [locale: string]: string };
    description: { [locale: string]: string };
    file: {
      [locale: string]: {
        url: string;
        details: {
            size: number;
            image?: {
                width: number;
                height: number;
            };
        };
        fileName: string;
        contentType: string;
      }
    };
  },
  metadata?: Metadata
}

export interface ContentfulCollection<T> {
  total: number;
  skip: number;
  limit: number;
  items: Array<T>;
}

export type AssetCollection = ContentfulCollection<Asset>

export interface EntryCollection<T> extends ContentfulCollection<Entry<T>> {
  errors?: Array<any>;
  includes?: {
    Entry: Entry<any>[],
    Asset: Asset[]
  };
}

interface Metadata {
  tags: TagLink[];
}

interface TagLink {
  sys: {
    type: 'Link';
    linkType: 'Tag';
    id: string;
  }
}

/**
 * This is the shape of entries that we get back from the Sync API when they have been deleted.
 * Note that we only get the sys object back, not the fields.
 */
export interface DeletedEntry {
  sys: Sys<'DeletedEntry'> & {
    deletedAt: string
  }
}

/**
 * This is the shape of assets that we get back from the Sync API when they have been deleted.
 * Note that we only get the sys object back, not the fields.
 */
export interface DeletedAsset {
  sys: Sys<'DeletedAsset'> & {
    deletedAt: string
  }
}

/**
 * This is the shape of a raw Sync response from the API.
 */
export interface SyncResponse {
  sys: { type: 'Array' },
  items: Array<SyncItem>,

  nextSyncUrl?: string,
  nextPageUrl?: string
}

/**
 * This is a union of all the possible types of items that can be returned in a Sync response.
 * Disambiguate the type by checking the sys.type property.  Helpers are provided in util.ts to do this.
 */
export type SyncItem =
  SyncEntry |
  SyncAsset |
  DeletedEntry |
  DeletedAsset
