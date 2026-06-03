/** Shared layout + state primitives used across modules. */

import {
  Button,
  Spinner,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import { ArrowClockwise20Regular, Box24Regular, ErrorCircle24Regular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';

const useStyles = makeStyles({
  page: {
    maxWidth: '1480px',
    margin: '0 auto',
    padding: '22px 24px 56px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  panel: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '16px',
    boxShadow: tokens.shadow4,
    padding: '18px',
    position: 'relative',
  },
  interactive: {
    cursor: 'pointer',
    transitionProperty: 'transform, box-shadow, border-color',
    transitionDuration: '180ms',
    transitionTimingFunction: 'cubic-bezier(0.1,0.9,0.2,1)',
    ':hover': {
      transform: 'translateY(-3px)',
      boxShadow: tokens.shadow16,
      border: `1px solid ${tokens.colorBrandStroke2}`,
    },
  },
  selected: {
    border: `1px solid ${tokens.colorBrandStroke1}`,
    boxShadow: `0 0 0 1px ${tokens.colorBrandStroke1}, ${tokens.shadow8}`,
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '4px',
  },
  sectionTitleText: { display: 'flex', flexDirection: 'column', gap: '2px' },
  sectionH: { fontSize: '16px', fontWeight: 700, letterSpacing: '-0.018em', margin: 0 },
  sectionCaption: { fontSize: '12px', color: tokens.colorNeutralForeground3, lineHeight: 1.4 },
  state: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '40px 20px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
    minHeight: '160px',
  },
  stateIcon: { fontSize: '28px', color: tokens.colorNeutralForeground4 },
  errorIcon: { color: tokens.colorPaletteRedForeground1 },
});

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const s = useStyles();
  return <div className={mergeClasses(s.page, className)}>{children}</div>;
}

export function Panel({
  children,
  className,
  interactive,
  selected,
  onClick,
  style,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
  const s = useStyles();
  return (
    <div
      className={mergeClasses(
        s.panel,
        interactive && s.interactive,
        selected && s.selected,
        className,
      )}
      onClick={onClick}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  caption,
  actions,
}: {
  title: ReactNode;
  caption?: ReactNode;
  actions?: ReactNode;
}) {
  const s = useStyles();
  return (
    <div className={s.sectionTitle}>
      <div className={s.sectionTitleText}>
        <h2 className={s.sectionH}>{title}</h2>
        {caption && <span className={s.sectionCaption}>{caption}</span>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const s = useStyles();
  return (
    <div className={s.state}>
      <Spinner size="medium" label={label} />
    </div>
  );
}

export function ErrorState({
  message = 'Something went wrong loading this data.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const s = useStyles();
  return (
    <div className={s.state}>
      <ErrorCircle24Regular className={mergeClasses(s.stateIcon, s.errorIcon)} />
      <div>{message}</div>
      {onRetry && (
        <Button size="small" icon={<ArrowClockwise20Regular />} onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ message = 'Nothing to show.' }: { message?: string }) {
  const s = useStyles();
  return (
    <div className={s.state}>
      <Box24Regular className={s.stateIcon} />
      <div>{message}</div>
    </div>
  );
}
