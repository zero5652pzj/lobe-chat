import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { NextRequest } from 'next/server';

import { pino } from '@/libs/logger';
import { createLambdaContext } from '@/libs/trpc/lambda/context';
import { mobileRouter } from '@/server/routers/mobile';

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    /**
     * @link https://trpc.io/docs/v11/context
     */
    createContext: () => createLambdaContext(req),

    endpoint: '/trpc/mobile',

    onError: ({ error, path, type }) => {
      pino.info(`Error in tRPC handler (mobile) on path: ${path}, type: ${type}`);
      console.error(error);
    },

    req,
    responseMeta({ ctx }) {
      const headers = ctx?.resHeaders;

      return { headers };
    },
    router: mobileRouter,
  });

export { handler as GET, handler as POST };
