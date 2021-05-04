import * as fs from 'fs-extra'


let schemaFile: string
if (fs.existsSync('db') && fs.statSync('db').isDirectory()) {
  schemaFile = 'db/contentful-schema.json'
} else {
  schemaFile = 'contentful-schema.json'
}

const defaults = {
  managementToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN,
  space: process.env.CONTENTFUL_SPACE_ID,
  environment: process.env.CONTENTFUL_ENVIRONMENT || 'master',
  schemaFile,
}

export default defaults
