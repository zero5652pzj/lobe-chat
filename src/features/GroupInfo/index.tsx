import { Avatar, Tag } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { startCase } from 'lodash-es';
import { CSSProperties, memo } from 'react';
import { Center } from 'react-layout-kit';

import { MetaData } from '@/types/meta';

const useStyles = createStyles(({ css, token }) => ({
  avatar: css`
    flex: none;
  `,
  desc: css`
    color: ${token.colorTextDescription};
    text-align: center;
  `,
  title: css`
    font-size: 20px;
    font-weight: 600;
    text-align: center;
  `,
}));

export interface GroupInfoProps {
  meta?: MetaData;
  onAvatarClick?: () => void;
  style?: CSSProperties;
}

const GroupInfo = memo<GroupInfoProps>(({ style, meta, onAvatarClick }) => {
  const { styles, theme } = useStyles();

  if (!meta) return;

  return (
    <Center gap={16} style={style}>
      <Avatar
        animation
        avatar="👥"
        background={theme.colorFillTertiary}
        className={styles.avatar}
        onClick={onAvatarClick}
        size={100}
      />
      {meta.title && <div className={styles.title}>{meta.title}</div>}
      {(meta?.tags as string[])?.length > 0 && (
        <Center gap={6} horizontal style={{ flexWrap: 'wrap' }}>
          {(meta.tags as string[]).map((tag: string, index) => (
            <Tag key={index} style={{ margin: 0 }}>
              {startCase(tag).trim()}
            </Tag>
          ))}
        </Center>
      )}
      {meta.description && <div className={styles.desc}>{meta.description}</div>}
    </Center>
  );
});

export default GroupInfo;
