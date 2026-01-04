import type { Arguments, InferredOptionTypes } from 'yargs';
import { graphiteWithoutRepo } from '../lib/runner';
// @ts-expect-error Bun import attribute syntax
// eslint-disable-next-line prettier/prettier, import/no-default-export
import fishContent from '../lib/pk.fish' with { type: 'text' };

const args = {} as const;

type argsT = Arguments<InferredOptionTypes<typeof args>>;

export const command = 'fish';
export const canonical = 'fish';
export const aliases = ['fish'];
export const description = 'Set up fish tab completion.';
export const builder = args;
export const handler = async (argv: argsT): Promise<void> =>
  graphiteWithoutRepo(argv, canonical, async (context) => {
    context.splog.page(fishContent);
  });
