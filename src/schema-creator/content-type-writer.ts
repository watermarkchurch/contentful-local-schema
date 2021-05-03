import inflection from 'inflection'

import { GraphQLBoolean, GraphQLEnumType, GraphQLEnumValueConfigMap, GraphQLFieldConfigMap, GraphQLFloat, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLOutputType, GraphQLScalarType, GraphQLString, GraphQLType, GraphQLUnionType } from 'graphql'

const GraphQLNever = new GraphQLScalarType({
  name: 'Never'
})

const GraphQLJSON = new GraphQLScalarType({
  name: 'JSON'
})

const GraphQLLocation  = new GraphQLObjectType({
  name: 'Location',
  fields: {
    lat: { type: GraphQLFloat },
    lon: { type: GraphQLFloat }
  }
})

const AssetFileDetailsImage = new GraphQLObjectType({
  name: 'AssetFileDetailsImage',
  fields: {
    width: { type: new GraphQLNonNull(GraphQLInt) },
    height: { type: new GraphQLNonNull(GraphQLInt) },
  }
})

const AssetFileDetails = new GraphQLObjectType({
  name: 'AssetFileDetails',
  fields: {
    size: { type: new GraphQLNonNull(GraphQLInt) },
    image: { type: new GraphQLNonNull(AssetFileDetailsImage) }
  }
})

const AssetFile = new GraphQLObjectType({
  name: 'AssetFile',
  fields: {
    url: { type: new GraphQLNonNull(GraphQLString) },
    details: { type: new GraphQLNonNull(AssetFileDetails) },
    fileName: { type: GraphQLString },
    contentType: { type: GraphQLString },
  }
})

const Asset = new GraphQLObjectType({
  name: 'Asset',
  fields: {
    title: { type: GraphQLString },
    file: { type: AssetFile }
  }
})

export default class ContentTypeWriter {
  public readonly className: string

  private linkedTypes: any[]

  constructor(
    private readonly contentType: any,
    private readonly contentTypeMap: Map<string, GraphQLObjectType>
  ) {
    this.linkedTypes = []

    const name = idToName(contentType.sys.id)
    this.className = name
  }

  public write = () => {
    const contentType = this.contentType

    const type = new GraphQLObjectType({
      name: this.className,
      fields: () => {
        const fields: GraphQLFieldConfigMap<any, any> = {}
        contentType.fields.forEach((f: any) =>
          this.writeField(f, fields))

        return fields
      },
    })
    this.contentTypeMap.set(this.className, type)

    return type
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
        return new GraphQLList(itemType)
      default:
        return GraphQLJSON
    }
  }

  public resolveLinkContentType(field: any): GraphQLOutputType {
    if (field.validations) {
      const validation = field.validations.find((v: any) => v.linkContentType && v.linkContentType.length > 0)
      if (validation) {
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
    }
    return this.contentType.get('AnyContentful')
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

