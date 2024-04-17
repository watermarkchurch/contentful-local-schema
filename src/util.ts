import type { Asset, Entry, LinkContentTypeValidation, DeletedAsset, DeletedEntry, Link, SyncEntry, SyncItem, SyncAsset } from './contentful/types'
import inflection from 'inflection'

export function tryParseJson(json: string): unknown | null {
  try {
    return JSON.parse(json)
  } catch(ex) {
    return null
  }
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

export function present<T>(value: T | undefined | null | ''): value is T {
  if (typeof value == 'string') {
    return /\S/.test(value)
  }

  return !!value
}


export function assertPresent<T>(value: T | undefined | null | ''): asserts value is T {
  if (!present(value)) {
    throw new Error(`value '${value}' was not present`)
  }
}

/**
 * This function checks whether an object is an Entry.
 * 
 * If we already know that the object is a SyncItem,
 * then we know that it has the shape of a "locale=*" entry.
 * 
 * If we already know that the object has been transformed to a locale,
 * then we know that it is an Entry with those fields.
 * 
 * If we don't already know, then it could be an entry with a locale or an entry with "locale=*" and further type
 * narrowing is required.
 */
export function isEntry(e: SyncItem): e is SyncEntry
export function isEntry(e: Entry<any> | Asset): e is Entry<any>
export function isEntry(e: any): e is Entry<any> | SyncEntry
export function isEntry(e: any): e is Entry<any> | SyncEntry {
  return e && e.sys && e.sys.type == 'Entry'
}

/**
 * This function checks whether an object is an Asset.
 * 
 * If we already know that the object is a SyncItem,
 * then we know that it has the shape of a "locale=*" Asset.
 * 
 * If we already know that the object has been transformed to a locale,
 * then we know that it is an Asset with those fields.
 * 
 * If we don't already know, then it could be an entry with a locale or an entry with "locale=*" and further type
 * narrowing is required.
 */
export function isAsset(e: SyncItem): e is SyncAsset
export function isAsset(e: Entry<any> | Asset): e is Asset
export function isAsset(e: any): e is Asset | SyncAsset
export function isAsset(e: any): e is Asset | SyncAsset {
  return e && e.sys && e.sys.type == 'Asset'
}

export function isDeletedEntry(e: any): e is DeletedEntry {
  return e && e.sys && e.sys.type == 'DeletedEntry'
}

export function isDeletedAsset(e: any): e is DeletedAsset {
  return e && e.sys && e.sys.type == 'DeletedAsset'
}

export function isLink(e: any): e is Link {
  return e && e.sys && e.sys.type == 'Link'
}

export function isEntryLink(e: any): e is Link<'Entry'> {
  return isLink(e) && e.sys.linkType == 'Entry'
}

export function isAssetLink(e: any): e is Link<'Asset'> {
  return isLink(e) && e.sys.linkType == 'Asset'
}

export function unionTypeDefName(contentType: string, field: { id: string }) {
  return `${idToName(contentType)}${inflection.singularize(idToName(field.id))}`
}

// https://stackoverflow.com/a/8809472/2192243
export function generateUUID() { // Public Domain/MIT
  let d = new Date().getTime()//Timestamp
  let d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0//Time in microseconds since page-load or 0 if unsupported
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    let r = Math.random() * 16//random number between 0 and 16
    if(d > 0){//Use timestamp until depleted
      r = (d + r)%16 | 0
      d = Math.floor(d/16)
    } else {//Use microseconds since page-load if supported
      r = (d2 + r)%16 | 0
      d2 = Math.floor(d2/16)
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}
