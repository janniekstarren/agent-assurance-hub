/** Status badges — one place mapping domain states to Fluent semantic colours.
    Never invent status hues; these map onto Fluent success / warning / danger /
    severe / informative tokens. */

import { Badge, Tooltip } from '@fluentui/react-components';
import type { BadgeProps } from '@fluentui/react-components';
import { Info16Regular } from '@fluentui/react-icons';
import type {
  AlertSeverity,
  CallerType,
  Environment,
  GateStatus,
  GovernanceZone,
  LifecycleState,
  RegistryStatus,
  RiskLevel,
} from '../types/domain';
import { ENV_LABEL, LIFECYCLE_LABEL, ZONE_LABEL, callerShort } from '../utils/format';

type Color = BadgeProps['color'];

export function EnvBadge({ env, size = 'small' }: { env: Environment; size?: BadgeProps['size'] }) {
  const color: Record<Environment, Color> = {
    dev: 'informative',
    test: 'warning',
    prod: 'success',
  };
  return (
    <Badge appearance="tint" color={color[env]} size={size} shape="rounded">
      {ENV_LABEL[env]}
    </Badge>
  );
}

export function ZoneBadge({ zone }: { zone: GovernanceZone }) {
  const color: Record<GovernanceZone, Color> = {
    Z1: 'informative',
    Z2: 'brand',
    Z3: 'important',
  };
  return (
    <Tooltip content={ZONE_LABEL[zone]} relationship="label">
      <Badge appearance="tint" color={color[zone]} size="small" shape="rounded">
        {zone}
      </Badge>
    </Tooltip>
  );
}

export function LifecycleBadge({ state }: { state: LifecycleState }) {
  const color: Record<LifecycleState, Color> = {
    draft: 'subtle',
    'in-review': 'warning',
    published: 'success',
    retiring: 'danger',
  };
  return (
    <Badge appearance="tint" color={color[state]} size="small" shape="rounded">
      {LIFECYCLE_LABEL[state]}
    </Badge>
  );
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const color: Record<AlertSeverity, Color> = {
    low: 'informative',
    medium: 'warning',
    high: 'severe',
    critical: 'danger',
  };
  return (
    <Badge appearance="filled" color={color[severity]} size="small" shape="rounded">
      {severity}
    </Badge>
  );
}

export function GateBadge({ status }: { status: GateStatus }) {
  const color: Record<GateStatus, Color> = { pass: 'success', warn: 'warning', fail: 'danger' };
  const label: Record<GateStatus, string> = { pass: 'Pass', warn: 'Warn', fail: 'Fail' };
  return (
    <Badge appearance="filled" color={color[status]} size="small" shape="rounded">
      {label[status]}
    </Badge>
  );
}

export function RegistryBadge({ status }: { status: RegistryStatus }) {
  const color: Record<RegistryStatus, Color> = {
    registered: 'success',
    shadow: 'danger',
    'pending-approval': 'warning',
  };
  const label: Record<RegistryStatus, string> = {
    registered: 'Registered',
    shadow: 'Shadow',
    'pending-approval': 'Pending approval',
  };
  return (
    <Badge appearance="tint" color={color[status]} size="small" shape="rounded">
      {label[status]}
    </Badge>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const color: Record<RiskLevel, Color> = {
    none: 'success',
    low: 'informative',
    medium: 'warning',
    high: 'danger',
  };
  const label: Record<RiskLevel, string> = {
    none: 'No risk',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };
  return (
    <Badge appearance="tint" color={color[level]} size="small" shape="rounded">
      {label[level]}
    </Badge>
  );
}

export function CallerBadge({ caller }: { caller: CallerType }) {
  const color: Record<CallerType, Color> = {
    User: 'success',
    'Non-licensed user': 'warning',
    Application: 'severe',
    Microsoft: 'informative',
  };
  return (
    <Badge appearance="outline" color={color[caller]} size="small" shape="rounded">
      {callerShort(caller)}
    </Badge>
  );
}

/** A small "preview" tag for anything backed by a preview/beta Microsoft API. */
export function PreviewTag({ note }: { note?: string }) {
  return (
    <Tooltip
      relationship="description"
      content={
        note ??
        'Backed by a preview/beta Microsoft API. Verify GA status before a live demo.'
      }
    >
      <Badge
        appearance="outline"
        color="informative"
        size="small"
        shape="rounded"
        icon={<Info16Regular />}
      >
        preview
      </Badge>
    </Tooltip>
  );
}
