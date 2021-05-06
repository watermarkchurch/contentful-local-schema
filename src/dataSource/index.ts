import type { ContentfulClientApi } from 'contentful'

export type ContentfulDataSource =
  Pick<ContentfulClientApi, 'getAsset' | 'getAssets' | 'getEntry' | 'getEntries'>