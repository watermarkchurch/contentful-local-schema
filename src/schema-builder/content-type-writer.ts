import inflection from 'inflection'
import GraphQLJSON from 'graphql-type-json';

import { GraphQLBoolean, GraphQLEnumType, GraphQLEnumValueConfigMap, GraphQLFieldConfigMap, GraphQLFloat, GraphQLInt, GraphQLInterfaceType, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLOutputType, GraphQLScalarType, GraphQLString, GraphQLType, GraphQLUnionType } from 'graphql'
import { Asset, AssetCollection, Entry, EntryCollection, GraphQLLocation, GraphQLNever } from '../types'


export default class ContentTypeWriter {
  public readonly className: string

  private linkedTypes: any[]

  constructor(
    private readonly contentType: any,
    private readonly contentTypeMap: Map<string, GraphQLObjectType>,
    private readonly collectionTypeMap: Map<string, GraphQLObjectType>
  ) {
    this.linkedTypes = []

    const name = idToName(contentType.sys.id)
    this.className = name
  }

  public write = () => {
    const contentType = this.contentType

    const type = new GraphQLObjectType({
      name: this.className,
      interfaces: [Entry],
      fields: () => {
        const fields: GraphQLFieldConfigMap<any, any> = {}
        contentType.fields.forEach((f: any) =>
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

  public writeField(field: any, fields: GraphQLFieldConfigMap<any, any>) {
    const nullable = field.omitted || (!field.required)
    const type = this.writeFieldType(field)
    fields[field.id] = {
      type: nullable ? type : new GraphQLNonNull(type),
    }
  }

  public writeFieldType(field: any): GraphQLOutputType {
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
        return GraphQLLocation
      case 'Link':
        if (field.linkType == 'Asset') {
          return Asset
        } else {
          return this.resolveLinkContentType(field)
        }
      case 'Array':
        const itemType = this.writeFieldType(Object.assign({ id: field.id }, field.items))
        if (field.items.type == 'Link') {
          if (itemType == Asset) {
            return AssetCollection
          } else if (itemType == Entry) {
            return EntryCollection
          }
          return this.writeLinkCollectionType(itemType)
        } else {
          return new GraphQLList(itemType)
        }
      default:
        return GraphQLJSON
    }
  }

  public resolveLinkContentType(field: any): GraphQLUnionType | GraphQLInterfaceType | GraphQLObjectType {
    let validation = field.validations && field.validations.find((v: any) => v.linkContentType && v.linkContentType.length > 0)
    if (!validation) {
      return Entry
    }

    this.linkedTypes.push(...validation.linkContentType)
    if (validation.linkContentType.length == 1) {
      const name = idToName(validation.linkContentType[0])
      const resolved = this.contentTypeMap.get(name)
      if (!resolved) {
        throw new Error(`Could not resolve content type '${name}'`)
      }
      return resolved
    }

    const unionName = unionTypeDefName(this.contentType.sys.id, field)

    return new GraphQLUnionType({
      name: unionName,
      types: () => validation.linkContentType.map((val: any) => {
        const name = idToName(val)
        const resolved = this.contentTypeMap.get(name)
        if (!resolved) {
          throw new Error(`Could not resolve content type '${name}'`)
        }
        return resolved
      })
    })
  }

  public writeLinkCollectionType(itemType: any): GraphQLObjectType {
    if (this.collectionTypeMap.has(itemType.name)) {
      const collection = this.collectionTypeMap.get(itemType.name)!
      console.log('has', itemType.name, collection)
      return collection
    } else {
      const collection = new GraphQLObjectType({
        name: `${itemType.name}Collection`,
        fields: {
          skip: { type: new GraphQLNonNull(GraphQLInt) },
          limit: { type: new GraphQLNonNull(GraphQLInt) },
          total: { type: new GraphQLNonNull(GraphQLInt) },
          items: { type: new GraphQLNonNull(new GraphQLList(itemType)) }
        }
      })
      console.log('new', itemType.name, collection)
      this.collectionTypeMap.set(itemType.name, collection)
      return collection
    }
  }

  public writePotentialUnionType(field: any) {
    if (!field.validations) {
      return null
    }

    const validation = field.validations.find((v: any) => v.in && v.in.length > 0)
    if (validation) {
      const name = unionTypeDefName(this.contentType.sys.id, field)
      

      return new GraphQLEnumType({
        name,
        values: validation.in.reduce((map: GraphQLEnumValueConfigMap, val: any) => {
          map[val.toString()] = {
            value: val
          }
          return map
        }, {})
      })
    }
  }
}
function idToName(id: string) {
  id = inflection.underscore(id)
  id = id.replace(/[^\w]/g, ' ')
  id = inflection.titleize(id)
  id = id.replace(/[\s+]/g, '')
  return id
}

function unionTypeDefName(contentType: string, field: { id: string }) {
  return `${idToName(contentType)}${inflection.singularize(idToName(field.id))}`
}

