import inflection from 'inflection'
import util from 'util'

import { GraphQLBoolean, GraphQLEnumType, GraphQLEnumValueConfigMap, GraphQLFieldConfigMap, GraphQLFloat, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLOutputType, GraphQLScalarType, GraphQLString } from 'graphql'

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

    return new GraphQLObjectType({
      name: this.className,
      fields: () => {
        const fields: GraphQLFieldConfigMap<any, any> = {}
        contentType.fields.forEach((f: any) =>
          this.writeField(f, fields))

        return fields
      },
    })

    // file.addImportDeclaration({
    //   moduleSpecifier: '../base',
    //   namedImports: ['Asset', 'IAsset', 'Entry', 'IEntry', 'ILink', 'ISys', 'isAsset', 'isEntry'],
    // })
    // file.addImportDeclaration({
    //   moduleSpecifier: '.',
    //   namedImports: ['wrap'],
    // })

    // const fieldsInterface = file.addInterface({
    //   name: this.fieldsName,
    //   isExported: true,
    // })

    // contentType.fields.forEach((f: any) =>
    //   this.writeField(f, fieldsInterface))

    // if (this.linkedTypes.length > 0) {
    //   this.linkedTypes = this.linkedTypes.filter((t, index, self) => self.indexOf(t) === index).sort()
    //   const indexOfSelf = this.linkedTypes.indexOf(contentType.sys.id)
    //   if (indexOfSelf > -1) {
    //     this.linkedTypes.splice(indexOfSelf, 1)
    //   }

    //   this.linkedTypes.forEach((id) => {
    //     file.addImportDeclaration({
    //       moduleSpecifier: `./${idToFilename(id)}`,
    //       namedImports: [
    //         `I${idToName(id)}`,
    //         idToName(id),
    //       ],
    //     })
    //   })
    // }

    // file.addInterface({
    //   name: this.interfaceName,
    //   isExported: true,
    //   docs: [[
    //     contentType.name,
    //     contentType.description && '',
    //     contentType.description && contentType.description,
    //   ].filter(exists).join('\n')],
    //   extends: [`IEntry<${this.fieldsName}>`],
    // })

    // file.addFunction({
    //   name: `is${this.className}`,
    //   isExported: true,
    //   parameters: [{
    //     name: 'entry',
    //     type: 'IEntry<any>',
    //   }],
    //   returnType: `entry is ${this.interfaceName}`,
    //   bodyText: (writer) => {
    //     writer.writeLine('return entry &&')
    //       .writeLine('entry.sys &&')
    //       .writeLine('entry.sys.contentType &&')
    //       .writeLine('entry.sys.contentType.sys &&')
    //       .writeLine(`entry.sys.contentType.sys.id == '${contentType.sys.id}'`)
    //   },
    // })

    // const klass = file.addClass({
    //   name: this.className,
    //   isExported: true,
    //   extends: `Entry<${this.fieldsName}>`,
    //   implements: [this.interfaceName],
    //   properties: [
    //     // These are inherited from the base class and do not need to be redefined here.
    //     // Further, babel 7 transforms the constructor in such a way that the `Object.assign(this, entryOrId)`
    //     // in the base class gets wiped if these properties are present.
    //     // { name: 'sys', isReadonly: true, hasExclamationToken: true, scope: Scope.Public, type: `ISys<'Entry'>` },
    //     // { name: 'fields', isReadonly: true, hasExclamationToken: true, scope: Scope.Public, type: this.fieldsName },
    //   ],
    // })

    // contentType.fields.filter((f: any) => !f.omitted)
    //   .map((f: any) => this.writeFieldAccessor(f, klass))

    // klass.addConstructor({
    //   parameters: [{
    //     name: 'entryOrId',
    //     type: `${this.interfaceName} | string`,
    //   }, {
    //     name: 'fields',
    //     hasQuestionToken: true,
    //     type: this.fieldsName,
    //   }],
    //   overloads: [
    //     { parameters: [{ name: 'entry', type: this.interfaceName }] },
    //     { parameters: [{ name: 'id', type: 'string' }, { name: 'fields', type: this.fieldsName }] },
    //   ],
    //   bodyText: `super(entryOrId, '${contentType.sys.id}', fields)`,
    // })
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
          return null
        }
      case 'Array':
        const itemType = this.writeFieldType(Object.assign({ id: field.id }, field.items))
        return new GraphQLList(itemType)
      default:
        return GraphQLJSON
    }
  }

  public resolveLinkContentType(field: any) {
    if (field.validations) {
      const validation = field.validations.find((v: any) => v.linkContentType && v.linkContentType.length > 0)
      if (validation) {
        this.linkedTypes.push(...validation.linkContentType)
        if (validation.linkContentType.length == 1) {
          const name = idToName(validation.linkContentType[0])
          return ('I' + name)
        }

        const unionName = unionTypeDefName(this.contentType.sys.id, field)
        if (!this.file.getTypeAlias(unionName)) {
          this.file.addTypeAlias({
            name: unionName,
            isExported: true,
            type: validation.linkContentType.map((v: any) => 'I' + idToName(v)).join(' | '),
          })

          this.file.addTypeAlias({
            name: unionName + 'Class',
            isExported: true,
            type: validation.linkContentType.map((v: any) => idToName(v)).join(' | '),
          })
        }
        return unionName
      }
    }
    return 'IEntry<any>'
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

function idToFilename(id: string) {
  return inflection.underscore(id, false)
}

function dump(obj: any) {
  return util.inspect(obj, {
    depth: null,
    maxArrayLength: null,
    breakLength: 0,
  })
}

function exists(val: any): boolean {
  return !!val
}
