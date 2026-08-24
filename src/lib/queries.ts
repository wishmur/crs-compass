import { queryOptions } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { Draw, RelevantDraw } from "@/data/round-types";

export const drawsQuery = (limit?: number) =>
  queryOptions({
    queryKey: ["draws", limit ?? "all"],
    queryFn: async (): Promise<Draw[]> => {
      if (!isSupabaseConfigured) return [];
      let q = supabase
        .from("draws")
        .select(
          "round_number,draw_date,round_type,program,category,invitations_issued,cutoff_score,tie_break_timestamp,source_url",
        )
        .order("draw_date", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Draw[];
    },
    staleTime: 5 * 60 * 1000,
  });

// "Data checked" badge: the timestamp of the most recent successful ingest
// run, read straight from GitHub Actions' own run history — not from
// Supabase. The ingest script exits 0 on both a real update ('ok') and a
// no-op day where the payload hash matched last time ('skipped_unchanged'),
// and exits 1 on any real failure — so GitHub's own success/failure
// verdict already is the "did we successfully check IRCC" signal, with no
// need to duplicate that logic in a database view. Public repo, unauthenticated
// GitHub API, no token, no backend, no manual migration step to keep it honest.
const INGEST_RUNS_URL =
  "https://api.github.com/repos/wishmur/crs-compass/actions/workflows/ingest.yml/runs?status=success&per_page=1";

interface WorkflowRunsResponse {
  workflow_runs?: { run_started_at?: string }[];
}

export const lastUpdatedQuery = () =>
  queryOptions({
    queryKey: ["last_updated"],
    queryFn: async (): Promise<string | null> => {
      try {
        const res = await fetch(INGEST_RUNS_URL, {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (!res.ok) return null;
        const data = (await res.json()) as WorkflowRunsResponse;
        return data.workflow_runs?.[0]?.run_started_at ?? null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

export const poolSnapshotDateQuery = () =>
  queryOptions({
    queryKey: ["pool_snapshot_date"],
    queryFn: async (): Promise<string | null> => {
      if (!isSupabaseConfigured) return null;
      const { data, error } = await supabase
        .from("pool_snapshots")
        .select("as_of_date")
        .order("as_of_date", { ascending: false })
        .limit(1);
      if (error) return null;
      return (data?.[0]?.as_of_date as string | undefined) ?? null;
    },
    staleTime: 30 * 60 * 1000,
  });

export interface RelevanceParams {
  score: number;
  roundTypes: string[];
  programs: string[] | null;
  categories: string[] | null;
  since: string;
}

export const relevantDrawsQuery = (p: RelevanceParams | null) =>
  queryOptions({
    queryKey: ["relevant_draws", p],
    enabled: Boolean(p) && isSupabaseConfigured,
    queryFn: async (): Promise<RelevantDraw[]> => {
      if (!p) return [];
      const { data, error } = await supabase.rpc("fn_relevant_draws", {
        p_score: p.score,
        p_round_types: p.roundTypes.length ? p.roundTypes : null,
        p_programs: p.programs && p.programs.length ? p.programs : null,
        p_categories: p.categories && p.categories.length ? p.categories : null,
        p_since: p.since,
      });
      if (error) throw error;
      return (data ?? []) as RelevantDraw[];
    },
  });
