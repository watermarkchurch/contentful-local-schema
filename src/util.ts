import type { Asset, Entry } from './contentful/types'
import inflection from 'inflection'
import { DeletedAsset, DeletedEntry } from './dataSource'

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