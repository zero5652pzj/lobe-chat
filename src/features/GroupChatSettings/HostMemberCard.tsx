'use client';

import { Avatar, Icon, Text, Tooltip } from '@lobehub/ui';
import { Switch } from 'antd';
import { createStyles } from 'antd-style';
import { Bot, Loader2 } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { DEFAULT_SUPERVISOR_AVATAR } from '@/const/meta';

const useStyles = createStyles(({ css, token, isDarkMode }) => ({
  container: css`
    position: relative;

    overflow: hidden;

    height: 100%;
    border: 1px solid ${isDarkMode ? token.colorBorder : token.colorBorderSecondary};
    border-radius: 12px;

    background: ${token.colorBgContainer};

    transition: border-color 0.2s ${token.motionEaseInOut};

    &:hover {
      border-color: ${token.colorPrimary};
    }
  `,
  desc: css`
    overflow: hidden;

    height: 3em;
    margin-block-end: 0 !important;

    line-height: 1.5;
    color: ${token.colorTextDescription};
  `,
  title: css`
    line-height: 1.3;
  `,
}));

interface HostMemberCardProps {
  checked: boolean;
  loading: boolean;
  onToggle: (checked: boolean) => void;
}

const HostMemberCard = memo<HostMemberCardProps>(({ checked, loading, onToggle }) => {
  const { cx, styles } = useStyles();
  const { t } = useTranslation('setting');

  const title = t('settingGroupMembers.host.title');
  const description = t('settingGroupMembers.host.description');
  const tooltip = checked
    ? t('settingGroupMembers.disableHost')
    : t('settingGroupMembers.enableHost');

  return (
    <Flexbox className={cx(styles.container)} gap={24}>
      <Flexbox gap={12} padding={16} width={'100%'}>
        <Flexbox gap={12} width={'100%'}>
          <Flexbox align={'center'} horizontal justify={'space-between'}>
            <Flexbox align={'center'} flex={1} gap={8} horizontal style={{ minWidth: 0 }}>
              <Avatar
                avatar={DEFAULT_SUPERVISOR_AVATAR}
                shape="circle"
                size={24}
                style={{ flexShrink: 0 }}
              />
              <Text
                className={styles.title}
                ellipsis
                style={{ fontSize: 16, fontWeight: 'bold', minWidth: 0 }}
              >
                {title}
              </Text>
              <Tooltip title={t('settingGroupMembers.groupHost')}>
                <Icon icon={Bot} size="small" style={{ color: '#1890ff' }} />
              </Tooltip>
            </Flexbox>
          </Flexbox>
          <Text
            className={styles.desc}
            ellipsis={{
              rows: 2,
            }}
          >
            {description}
          </Text>
        </Flexbox>
        <Flexbox align="center" horizontal justify={'space-between'} width={'100%'}>
          <Icon icon={Loader2} size="small" spin style={{ opacity: loading ? 1 : 0 }} />
          <Tooltip title={tooltip}>
            <Switch checked={checked} disabled={loading} onChange={onToggle} size="small" />
          </Tooltip>
        </Flexbox>
      </Flexbox>
    </Flexbox>
  );
});

export default HostMemberCard;
