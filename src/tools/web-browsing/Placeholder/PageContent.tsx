'use client';

import { ScrollShadow } from '@lobehub/ui';
import { memo } from 'react';

import { useIsMobile } from '@/hooks/useIsMobile';

import LoadingCard from '../Render/PageContent/Loading';

const PageContent = memo<{ urls: string[] }>(({ urls }) => {
  const isMobile = useIsMobile();

  return (
    <ScrollShadow
      gap={isMobile ? 4 : 12}
      horizontal={!isMobile}
      orientation={'horizontal'}
      size={8}
    >
      {urls &&
        urls.length > 0 &&
        urls.map((url, index) => <LoadingCard key={`${index}_${url}`} url={url} />)}
    </ScrollShadow>
  );
});

export default PageContent;
