import inflection from 'inflection'
import GraphQLJSON from 'graphql-type-json'

import { GraphQLBoolean, GraphQLEnumType, GraphQLEnumValueConfigMap, GraphQLFieldConfigMap, GraphQLFloat, GraphQLInt, GraphQLInterfaceType, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLOutputType, GraphQLString, GraphQLUnionType } from 'graphql'
import { GraphQLNever, Namespace } from '../types'
import { idToName, isLinkContentTypeValidation, unionTypeDefName } from '../util'
import { ContentType, ContentTypeField } from '../contentful/types'

export default class ContentTypeWriter {
  public readonly className: string

  private linkedTypes: any[]

  constructor(
    private readonly contentType: ContentType,
    private readonly contentTypeMap: Map<string, GraphQLObjectType>,
    private readonly collectionTypeMap: Map<string, GraphQLObjectType>,
    private readonly namespace: Namespace
  ) {
    this.linkedTypes = []

    const name = idToName(contentType.sys.id)
    this.className = this.namespace.toType(name)
  }

  public write = () => {
    const contentType = this.contentType

    const type = new GraphQLObjectType({
      name: this.className,
      interfaces: [this.namespace.Entry],
      fields: () => {
        const fields: GraphQLFieldConfigMap<any, any> = {}
        contentType.fields.forEach((f) =>
          this.writeField(f, fields))

        return fields
      },
    })
    this.contentTypeMap.set(this.className, type)

    const collection = new GraphQLObjectType({
      name: `${this.className}Collection`,
      fields: {
        skip: { type: new GraphQLNonNull(GraphQLInt) },
        limit: { type: new GraphQLNonNull(GraphQLInt) },
        total: { type: new GraphQLNonNull(GraphQLInt) },
        items: { type: new GraphQLNonNull(new GraphQLList(type)) }
      }
    })
    this.collectionTypeMap.set(this.className, collection)

    return {
      type,
      collection
    }
  }

  public writeField(field: ContentTypeField, fields: GraphQLFieldConfigMap<any, any>) {
    const nullable = field.omitted || (!field.required)
    const type = this.writeFieldType(field)
    fields[field.id] = {
      type: nullable ? type : new GraphQLNonNull(type),
    }
  }

  public writeFieldType(field: ContentTypeField): GraphQLOutputType {
    if (field.omitted) {
      return GraphQLNever
    }
    switch (field.type) {
    case 'Symbol':
    case 'Text':
    case 'Date':
      return this.writePotentialUnionType(field) || GraphQLString
    case 'Integer':
      return this.writePotentialUnionType(field) || GraphQLInt
    case 'Number':
      return this.writePotentialUnionType(field) || GraphQLFloat
    case 'Boolean':
      return GraphQLBoolean
    case 'Location':
      return this.namespace.GraphQLLocation
    case 'Link':
      if (field.linkType == 'Asset') {
        return this.namespace.Asset
      } else {
        return this.resolveLinkContentType(field)
      }
    case 'Array':
    {
      const itemType = this.writeFieldType(Object.assign({ id: field.id }, field.items))
      if (field.items && field.items.type == 'Link') {
        if (itemType == this.namespace.Asset) {
          return this.namespace.AssetCollection
        } else if (itemType == this.namespace.Entry) {
          return this.namespace.EntryCollection
        }
        return this.writeLinkCollectionType(itemType)
      } else {
        return new GraphQLList(itemType)
      }
    }
    default:
      return GraphQLJSON
    }
  }

  public resolveLinkContentType(field: ContentTypeField): GraphQLUnionType | GraphQLInterfaceType | GraphQLObjectType {
    const validation = field.validations &&
      field.validations.filter(isLinkContentTypeValidation).find((v) =>
        v.linkContentType.length > 0)
    if (!validation) {
      return this.namespace.Entry
    }

    this.linkedTypes.push(...validation.linkContentType)
    if (validation.linkContentType.length == 1) {
      const name = this.namespace.toType(idToName(validation.linkContentType[0]))
      const resolved = this.contentTypeMap.get(name)
      if (!resolved) {
        throw new Error(`Could not resolve content type '${name}'`)
      }
      return resolved
    }

    const unionName = this.namespace.toType(unionTypeDefName(this.contentType.sys.id, field))

    return new GraphQLUnionType({
      name: unionName,
      types: () => validation.linkContentType.map((val: any) => {
        const name =  this.namespace.toType(idToName(val))
        const resolved = this.contentTypeMap.get(name)
        if (!resolved) {
          throw new Error(`Could not resolve content type '${name}'`)
        }
        return resolved
      })
    })
  }

  public writeLinkCollectionType(itemType: any): GraphQLObjectType {
    const name = this.namespace.toType(itemType.name)

    let collection = this.collectionTypeMap.get(name)
    if (!collection) {
      collection = new GraphQLObjectType({
        name: `${name}Collection`,
        fields: {
          skip: { type: new GraphQLNonNull(GraphQLInt) },
          limit: { type: new GraphQLNonNull(GraphQLInt) },
          total: { type: new GraphQLNonNull(GraphQLInt) },
          items: { type: new GraphQLNonNull(new GraphQLList(itemType)) }
        }
      })
      this.collectionTypeMap.set(name, collection)
    }
    return collection
  }

  public writePotentialUnionType(field: any) {
    if (!field.validations) {
      return null
    }

    const validation = field.validations.find((v: any) => v.in && v.in.length > 0)
    if (validation) {
      const name = this.namespace.toType(unionTypeDefName(this.contentType.sys.id, field))
      

      return new GraphQLEnumType({
        name,
        values: validation.in.reduce((map: GraphQLEnumValueConfigMap, val: any) => {
          map[inflection.underscore(idToName(val.toString()))] = {
            value: val
          }
          return map
        }, {})
      })
    }
  }
}

