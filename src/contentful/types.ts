// Copy types from contentful client so we don't need a dependency on it

export interface SyncCollection {
  entries: Array<Entry<any>>;
  assets: Array<Asset>;
  deletedEntries: Array<Entry<any>>;
  deletedAssets: Array<Asset>;
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
  locale: string;
  revision?: number;
  space?: Link<'Space'>
}

export interface Link<LinkType extends string = string> {
  sys: {
    type: 'Link',
    linkType: LinkType,
    id: string
  }
}

export interface Entry<T> {
  sys: Sys & {
    contentType: Link<'ContentType'>
  };
  fields: T;
  metadata: Metadata;
}

export interface Asset {
  sys: Sys
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
  metadata: Metadata;
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

export interface DeletedEntry {
  sys: Sys<'DeletedEntry'>
}

export interface DeletedAsset {
  sys: Sys<'DeletedAsset'>
}

export interface SyncResponse {
  sys: { type: 'Array' },
  items: Array<SyncItem>,

  nextSyncUrl?: string,
  nextPageUrl?: string
}

export type SyncItem =
  Entry<any> |
  Asset |
  DeletedEntry |
  DeletedAsset

export function isEntry(e: any): e is Entry<any> {
  return e && e.sys && e.sys.type == 'Entry'
}

export function isAsset(e: any): e is Asset {
  return e && e.sys && e.sys.type == 'Asset'
}

export function isDeletedEntry(e: any): e is DeletedEntry {
  return e && e.sys && e.sys.type == 'DeletedEntry'
}

export function isDeletedAsset(e: any): e is DeletedAsset {
  return e && e.sys && e.sys.type == 'DeletedAsset'
}