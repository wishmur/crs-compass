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

export const lastUpdatedQuery = () =>
  queryOptions({
    queryKey: ["last_updated"],
    queryFn: async (): Promise<string | null> => {
      if (!isSupabaseConfigured) return null;
      const { data, error } = await supabase.rpc("get_last_updated");
      if (error) return null;
      return (data as string | null) ?? null;
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
