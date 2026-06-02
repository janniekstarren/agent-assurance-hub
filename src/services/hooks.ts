/**
 * TanStack Query hooks over the mock service layer.
 *
 * Query keys live here so the whole app shares one cache. Seed data is static,
 * so staleTime is generous (no churn during a demo); mutations invalidate the
 * affected keys. Swapping mock -> live only changes the service bodies.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AlertStatus, Environment } from '../types/domain';
import * as inventory from './inventory';
import * as evaluation from './evaluation';
import * as telemetry from './telemetry';
import * as audit from './audit';
import * as cost from './cost';
import type { CostFilter } from './cost';
import * as lifecycle from './lifecycle';
import * as agent365 from './agent365';
import { getEstateOverview } from './overview';

const STALE = 5 * 60 * 1000;

// --- inventory --------------------------------------------------------------
export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: inventory.listAgents, staleTime: STALE });
}
export function useLineageGroups() {
  return useQuery({
    queryKey: ['lineage'],
    queryFn: inventory.listLineageGroups,
    staleTime: STALE,
  });
}
export function useAgent(id: string | undefined) {
  return useQuery({
    queryKey: ['agent', id],
    queryFn: () => inventory.getAgentById(id as string),
    enabled: !!id,
    staleTime: STALE,
  });
}

// --- overview ---------------------------------------------------------------
export function useEstateOverview() {
  return useQuery({ queryKey: ['overview'], queryFn: getEstateOverview, staleTime: STALE });
}

// --- assurance --------------------------------------------------------------
export function useAssuranceSummary(schemaName: string, environment: Environment) {
  return useQuery({
    queryKey: ['assurance', schemaName, environment],
    queryFn: () => evaluation.getAssuranceSummary(schemaName, environment),
    staleTime: STALE,
  });
}
export function useQualityGates() {
  return useQuery({
    queryKey: ['quality-gates'],
    queryFn: evaluation.getQualityGates,
    staleTime: STALE,
  });
}
export function useDriftEvents() {
  return useQuery({ queryKey: ['drift'], queryFn: evaluation.getDriftEvents, staleTime: STALE });
}

// --- telemetry --------------------------------------------------------------
export function useConfidence(schemaName: string, environment: Environment) {
  return useQuery({
    queryKey: ['confidence', schemaName, environment],
    queryFn: () => telemetry.getConfidence(schemaName, environment),
    staleTime: STALE,
  });
}
export function usePulse() {
  return useQuery({ queryKey: ['pulse'], queryFn: telemetry.getPulse, staleTime: STALE });
}
export function useVolume(schemaName: string, environment: Environment) {
  return useQuery({
    queryKey: ['volume', schemaName, environment],
    queryFn: () => telemetry.getVolume(schemaName, environment),
    staleTime: STALE,
  });
}

// --- safety / audit ---------------------------------------------------------
export function useAlerts() {
  return useQuery({ queryKey: ['alerts'], queryFn: audit.listAlerts, staleTime: STALE });
}
export function useAlertHeatmap() {
  return useQuery({ queryKey: ['heatmap'], queryFn: audit.getAlertHeatmap, staleTime: STALE });
}
export function useSetAlertStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AlertStatus }) =>
      audit.setAlertStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['heatmap'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

// --- cost -------------------------------------------------------------------
export function useCostSummary(filter: CostFilter = {}) {
  return useQuery({
    queryKey: ['cost-summary', filter],
    queryFn: () => cost.getCostSummary(filter),
    staleTime: STALE,
  });
}
export function useSpendStacked(filter: CostFilter = {}) {
  return useQuery({
    queryKey: ['cost-stacked', filter],
    queryFn: () => cost.getSpendStacked(filter),
    staleTime: STALE,
  });
}
export function useAgentCostBreakdown(schemaName: string, environment: Environment) {
  return useQuery({
    queryKey: ['cost-agent', schemaName, environment],
    queryFn: () => cost.getAgentCostBreakdown(schemaName, environment),
    staleTime: STALE,
  });
}
export function useBudgets() {
  return useQuery({ queryKey: ['budgets'], queryFn: cost.getBudgets, staleTime: STALE });
}
export function useEnvLicensing() {
  return useQuery({ queryKey: ['licensing'], queryFn: cost.getEnvLicensing, staleTime: STALE });
}
export function useSeatLicenses() {
  return useQuery({ queryKey: ['seats'], queryFn: cost.getSeatLicenses, staleTime: STALE });
}

// --- lifecycle --------------------------------------------------------------
export function usePipelineRuns() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: lifecycle.getPipelineRuns,
    staleTime: STALE,
  });
}
export function useApprovals() {
  return useQuery({ queryKey: ['approvals'], queryFn: lifecycle.getApprovals, staleTime: STALE });
}
export function useLifecycleEvents(schemaName: string) {
  return useQuery({
    queryKey: ['lifecycle-events', schemaName],
    queryFn: () => lifecycle.getLifecycleEvents(schemaName),
    staleTime: STALE,
  });
}
export function useSwimlane() {
  return useQuery({ queryKey: ['swimlane'], queryFn: lifecycle.getSwimlane, staleTime: STALE });
}
export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      scope,
      groups,
    }: {
      id: string;
      decision: 'approve' | 'reject';
      scope?: 'everyone' | 'specific-groups';
      groups?: string[];
    }) => lifecycle.decideApproval(id, decision, scope, groups),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

// --- agent 365 --------------------------------------------------------------
export function useRegistry() {
  return useQuery({ queryKey: ['registry'], queryFn: agent365.getRegistry, staleTime: STALE });
}
export function useRegistrySummary() {
  return useQuery({
    queryKey: ['registry-summary'],
    queryFn: agent365.getRegistrySummary,
    staleTime: STALE,
  });
}
