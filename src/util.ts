import type { Asset, Entry, Sys } from "contentful"
import inflection from "inflection"

export function tryParseJson(json: string): unknown | null {
  try {
    return JSON.parse(json)
  } catch(ex) {
    return null
  }
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

export function isLinkContentTypeValidation(v: any): v is LinkContentTypeValidation {
  return 'linkContentType' in v && Array.isArray(v.linkContentType)
}

export function idToName(id: string) {
  id = inflection.underscore(id)
  id = id.replace(/[^\w]/g, ' ')
  id = inflection.titleize(id)
  id = id.replace(/[\s+]/g, '')
  return id
}

export function present(value: string | undefined | null | ''): value is string {
  if (!value) { return false }

  if (!/\S/.test(value)) {
    return false
  }
  return true
}

export type SyncItem =
  Entry<any> |
  Asset |
  DeletedEntry |
  DeletedAsset

interface DeletedEntry {
  sys: Sys & { type: 'DeletedEntry' }
}

interface DeletedAsset {
  sys: Sys & { type: 'DeletedAsset' }
}

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