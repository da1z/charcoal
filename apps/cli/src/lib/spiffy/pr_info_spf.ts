import * as t from '@withgraphite/retype';
import { spiffy } from './spiffy';

// PR info schema (previously derived from @withgraphite/graphite-cli-routes)
const prInfoSchema = t.array(
  t.shape({
    prNumber: t.number,
    headRefName: t.string,
    baseRefName: t.string,
    title: t.string,
    body: t.string,
    state: t.unionMany([
      t.literal('OPEN' as const),
      t.literal('CLOSED' as const),
      t.literal('MERGED' as const),
    ]),
    reviewDecision: t.optional(
      t.unionMany([
        t.literal('APPROVED' as const),
        t.literal('REVIEW_REQUIRED' as const),
        t.literal('CHANGES_REQUESTED' as const),
      ])
    ),
    url: t.string,
    isDraft: t.boolean,
  })
);

export const prInfoConfigFactory = spiffy({
  schema: t.shape({
    prInfoToUpsert: prInfoSchema,
  }),
  defaultLocations: [
    {
      relativePath: '.graphite_pr_info',
      relativeTo: 'REPO',
    },
  ],
  initialize: () => {
    return {
      message: undefined,
    };
  },
  helperFunctions: () => {
    return {};
  },
  options: { removeIfEmpty: true },
});
