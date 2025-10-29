import { safeParseJSON } from '@lobechat/utils';
import { memo } from 'react';

import { BuiltinToolPlaceholders } from '@/tools/placeholders';

import Arguments from '../Arguments';

interface LoadingPlaceholderProps {
  apiName: string;
  identifier: string;
  loading?: boolean;
  requestArgs?: string;
}

const LoadingPlaceholder = memo<LoadingPlaceholderProps>(
  ({ identifier, requestArgs, apiName, loading }) => {
    const Render = BuiltinToolPlaceholders[identifier || ''];

    if (identifier && Render) {
      return (
        <Render apiName={apiName} args={safeParseJSON(requestArgs) || {}} identifier={identifier} />
      );
    }

    return <Arguments arguments={requestArgs} shine={loading} />;
  },
);

export default LoadingPlaceholder;
