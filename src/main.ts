import * as fs from 'fs-extra'
import { printSchema } from 'graphql'
import * as path from 'path'
import * as yargs from 'yargs'

import { createSchema, downloadContentfulSchema } from './index'

interface IArgv {
  /** The schema file to load for code generation */
  file: string,
  /** The output file in which to write the graphql schema */
  out?: string
  /** Whether to download */
  download?: boolean
  managementToken?: string,
  space?: string,
  environment?: string
  verbose?: boolean
}

yargs
  .option('file', {
    alias: 'f',
    describe: 'The location on disk of the schema file.',
  })
  .option('out', {
    alias: 'o',
    describe: 'Where to place the generated gql file.',
  })
  .option('download', {
    boolean: true,
    alias: 'd',
    describe: 'Whether to download the schema file from the Contentful space first',
  })
  .option('managementToken', {
    alias: 'm',
    describe: 'The Contentful management token.  Defaults to the env var CONTENTFUL_MANAGEMENT_TOKEN',
  })
  .option('space', {
    alias: 's',
    describe: 'The Contentful space ID. Defaults to the env var CONTENTFUL_SPACE_ID',
  })
  .option('environment', {
    alias: 'e',
    describe: 'The Contentful environment.  Defaults to the env var CONTENTFUL_ENVIRONMENT or \'master\'',
  })
  .option('verbose', {
    boolean: true,
    alias: 'v',
    describe: 'Enable verbose logging',
  })

const defaultLogger = {
  debug() { }
}
const verboseLogger = {
  debug() {
    // debug to stderr because we'll print the GQL schema to stdout
    return console.error.call(this, arguments)
  }
}

// tslint:disable-next-line:no-shadowed-variable
async function Run(args: IArgv) {
  const options = {
    directory: path.dirname(args.file),
    filename: path.basename(args.file),
    logger: args.verbose ? verboseLogger : defaultLogger,
    ...args,
    file: undefined as never // prefer directory + filename
  }

  const schemaFile = path.join(options.directory, options.filename)

  const download = args.download ||
    !(await fs.pathExists(schemaFile))
  if (download) {
    await downloadContentfulSchema(options)
  }

  if (!(await fs.pathExists(schemaFile))) {
    throw new Error(`Schema file does not exist at '${schemaFile}'!  Please download it with the --download option .`)
  }

  const schema = await createSchema(options)

  if (options.out && options.out != '-') {
    await fs.mkdirp(path.dirname(options.out))
    await fs.writeFile(options.out, printSchema(schema))
  } else {
    console.log(printSchema(schema))
  }
}

let file = 'contentful-schema.json'
if (fs.existsSync('db') && fs.statSync('db').isDirectory()) {
  file = 'db/contentful-schema.json'
}

const args = Object.assign<IArgv, Partial<IArgv>>(
  {
    file
  },
  yargs.argv as Partial<IArgv>)

if (typeof (args.download) == 'undefined') {
  if (args.managementToken && args.space && args.environment) {
    args.download = true
  }
} else if (typeof (args.download) == 'string') {
  args.download = args.download == 'true'
}

Run(args)
  .catch((err) =>
    console.error('An unexpected error occurred!', err))
