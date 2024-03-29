
import { printSchema } from 'graphql'
import SchemaBuilder from '.'
import { ContentType } from '../../contentful/types'

describe('SchemaBuilder', () => {
  it('writes schema', async () => {
    const instance = new SchemaBuilder({
      contentTypes: contentfulSchema.contentTypes as ContentType[]
    })

    const schema = await instance.build()

    expect(printSchema(schema)).toMatchSnapshot()
  })

  it('handles unknown link type', async () => {
    const instance = new SchemaBuilder({
      contentTypes: [
        {
          sys: {
            id: 'section-unknown-link',
            type: 'ContentType',
          },
          name: 'Section: Unknown Link',
          fields: [
            {
              id: 'something',
              name: 'Something',
              type: 'Link',
              localized: false,
              required: false,
              // no validations
              disabled: false,
              omitted: false,
              linkType: 'Entry',
            },
          ]
        } as any,
        ...contentfulSchema.contentTypes
      ]
    })

    const schema = await instance.build()

    const printed = printSchema(schema)
    expect(printed).toMatch(/^\s*something: Entry\s*$/m)
  })

  it('includes asset in query', async () => {
    const instance = new SchemaBuilder({
      contentTypes: []
    })

    const schema = await instance.build()

    const printed = printSchema(schema)
    expect(printed).toMatch('asset(id: String): Asset')
    expect(printed).toMatch('assetCollection(skip: String, limit: String): AssetCollection')
  })

  describe('with namespace', () => {
    it('namespaces all schema types', async () => {
      const instance = new SchemaBuilder({
        contentTypes: contentfulSchema.contentTypes as ContentType[],

        namespace: 'Test1'
      })
  
      const schema = await instance.build()

      const printed = printSchema(schema)
      expect(printed).toMatch('type Test1_SectionBlockText')
      expect(printed).toMatch('enum Test1_SectionBlockTextStyle')
      expect(printed).toMatch('type Test1_Page')
      expect(printed).toMatch('union Test1_PageSection')
      expect(printed).not.toMatch('Test1_Test1_')
    })

    it('namespaces the base types', async () => {
      const instance = new SchemaBuilder({
        contentTypes: contentfulSchema.contentTypes as ContentType[],

        namespace: 'Test1'
      })
  
      const schema = await instance.build()

      const printed = printSchema(schema)
      expect(printed).toMatch('interface Test1_Entry')
      expect(printed).not.toMatch('implements Entry')
      expect(printed).toMatch('type Test1_Page implements Test1_Entry')
      expect(printed).toMatch('type Test1_Sys')
      expect(printed).not.toMatch('type Sys')
      expect(printed).toMatch('type Test1_Asset')
      expect(printed).toMatch('type Test1_AssetCollection')
      expect(printed).not.toMatch('items:[Asset]')

      expect(printed).toMatch('asset(id: String): Test1_Asset')
    })

    it('does not namespace the query fields', async () => {
      const instance = new SchemaBuilder({
        contentTypes: contentfulSchema.contentTypes as ContentType[],

        namespace: 'Test1'
      })
  
      const schema = await instance.build()

      const printed = printSchema(schema)
      expect(printed).toMatch(' page(id: String): Test1_Page')
      expect(printed).toMatch(' pageCollection(skip: String, limit: String): Test1_PageCollection')
    })

    it('nothing looks weird', async () => {
      const instance = new SchemaBuilder({
        contentTypes: contentfulSchema.contentTypes as ContentType[],

        namespace: 'Test1'
      })
  
      const schema = await instance.build()

      expect(printSchema(schema)).toMatchSnapshot()
    })
  })
})

const contentfulSchema = {
  contentTypes: [
    {
      sys: {
        id: 'section-block-text',
        type: 'ContentType',
      },
      displayField: 'internalTitle',
      name: 'Section: Block Text',
      description: 'Markdown free-text block',
      fields: [
        {
          id: 'internalTitle',
          name: 'Internal Title (Contentful Only)',
          type: 'Symbol',
          localized: false,
          required: true,
          validations: [],
          disabled: false,
          omitted: true,
        },
        {
          id: 'body',
          name: 'Body',
          type: 'Text',
          localized: false,
          required: true,
          validations: [],
          disabled: false,
          omitted: false,
        },
        {
          id: 'bookmarkTitle',
          name: 'Bookmark Title',
          type: 'Symbol',
          localized: true,
          required: false,
          validations: [],
          disabled: false,
          omitted: false,
        },
        {
          id: 'style',
          name: 'Style',
          type: 'Symbol',
          localized: false,
          required: false,
          validations: [
            {
              in: ['default', 'narrow'],
            },
          ],
          disabled: false,
          omitted: false,
        },
      ],
    },
    {
      sys: {
        id: 'page',
        type: 'ContentType',
      },
      displayField: 'internalTitle',
      name: 'Page',
      description:
        'A page describes a collection of sections that correspondto a URL slug',
      fields: [
        {
          id: 'title',
          name: 'Title',
          type: 'Symbol',
          localized: false,
          required: true,
          validations: [],
          disabled: false,
          omitted: false,
        },
        {
          id: 'subpages',
          name: 'Subpages',
          type: 'Array',
          localized: false,
          required: false,
          validations: [],
          disabled: false,
          omitted: false,
          items: {
            type: 'Link',
            validations: [
              {
                linkContentType: ['page'],
              },
            ],
            linkType: 'Entry',
          },
        },
        {
          id: 'meta',
          name: 'Meta',
          type: 'Link',
          localized: false,
          required: false,
          validations: [
            {
              linkContentType: ['pageMetadata'],
            },
          ],
          disabled: false,
          omitted: false,
          linkType: 'Entry',
        },
        {
          id: 'sections',
          name: 'Sections',
          type: 'Array',
          localized: false,
          required: false,
          validations: [],
          disabled: false,
          omitted: false,
          items: {
            type: 'Link',
            validations: [
              {
                linkContentType: ['section-block-text', 'section-carousel'],
              },
            ],
            linkType: 'Entry',
          },
        },
        {
          id: 'flags',
          name: 'Flags',
          type: 'Array',
          localized: false,
          required: false,
          validations: [],
          disabled: false,
          omitted: false,
          items: {
            type: 'Symbol',
            validations: [
              {
                in: ['Not Shareable', 'Set Campus Cookie'],
              },
            ],
          },
        },
      ],
    },
    {
      sys: {
        id: 'section-carousel',
        type: 'ContentType',
      },
      displayField: 'internalTitle',
      name: 'Section: Carousel',
      description:
        'Renders a carousel of images that automatically progresses from one to the next',
      fields: [
        {
          id: 'images',
          name: 'Images',
          type: 'Array',
          localized: false,
          required: false,
          validations: [
            {
              size: {
                min: 1,
                max: null,
              },
            },
          ],
          disabled: false,
          omitted: false,
          items: {
            type: 'Link',
            validations: [
              {
                linkMimetypeGroup: ['image'],
              },
              {
                assetFileSize: {
                  min: null,
                  max: 20971520,
                },
              },
            ],
            linkType: 'Asset',
          },
        },
        {
          id: 'slideInterval',
          name: 'Slide Interval (Seconds)',
          type: 'Number',
          localized: false,
          required: false,
          validations: [
            {
              range: {
                min: 1,
                max: null,
              },
            },
          ],
          disabled: false,
          omitted: false,
        },
      ],
    },
    {
      'sys': {
        'id': 'pageMetadata',
        'type': 'ContentType'
      },
      'displayField': 'internalTitle',
      'name': 'Page Metadata',
      'description': 'Page Metadata contains SEO information about a page',
      'fields': [
        {
          'id': 'canonicalLink',
          'name': 'Canonical Link',
          'type': 'Symbol',
          'localized': false,
          'required': false,
          'validations': [
            {
              'unique': true
            },
            {
              'regexp': {
                'pattern': '^(ftp|http|https):\\/\\/(\\w+:{0,1}\\w*@)?(\\S+)(:[0-9]+)?(\\/|\\/([\\w#!:.?+=&%@!\\-\\/]))?$'
              }
            }
          ],
          'disabled': false,
          'omitted': false
        },
        {
          'id': 'metaKeywords',
          'name': 'Meta Keywords',
          'type': 'Text',
          'localized': false,
          'required': false,
          'validations': [],
          'disabled': false,
          'omitted': false
        },
        {
          'id': 'metaFlag',
          'name': 'Meta Flag',
          'type': 'Array',
          'localized': false,
          'required': false,
          'validations': [],
          'disabled': false,
          'omitted': false,
          'items': {
            'type': 'Symbol',
            'validations': [
              {
                'in': [
                  'no-follow',
                  'no-index'
                ]
              }
            ]
          }
        },
        {
          'id': 'structuredData',
          'name': 'Structured Data',
          'type': 'Object',
          'localized': false,
          'required': false,
          'validations': [],
          'disabled': false,
          'omitted': false
        }
      ]
    }
  ]
}