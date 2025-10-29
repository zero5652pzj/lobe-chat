import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const getPythonConfig = () => {
  return createEnv({
    client: {
      NEXT_PUBLIC_PYODIDE_INDEX_URL: z.string().url().optional(),
      NEXT_PUBLIC_PYODIDE_PIP_INDEX_URL: z.string().url().optional(),
    },
    runtimeEnv: {
      NEXT_PUBLIC_PYODIDE_INDEX_URL: process.env.NEXT_PUBLIC_PYODIDE_INDEX_URL,
      NEXT_PUBLIC_PYODIDE_PIP_INDEX_URL: process.env.NEXT_PUBLIC_PYODIDE_PIP_INDEX_URL,
    },
  });
};

export const pythonEnv = getPythonConfig();
