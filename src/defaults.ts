const defaults = {
  managementToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN,
  space: process.env.CONTENTFUL_SPACE_ID,
  environment: process.env.CONTENTFUL_ENVIRONMENT || 'master'
}

export default defaults
