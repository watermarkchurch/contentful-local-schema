
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