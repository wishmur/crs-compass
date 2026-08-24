import { useQuery } from "@tanstack/react-query";
import { poolSnapshotQuery } from "@/lib/queries";
import { formatDate } from "@/components/DrawMeta";

interface Props {
  score: number | null;
}

/** "How many other candidates are near me right now?" — read from
    pool_snapshots, a table that's been ingested daily since day one but had
    no UI reading it until now. Deliberately modest: names the band the
    user's score falls in and how many candidates share it, plus the total
    pool size. No ranking, no "you're in the top X%", nothing that reads as
    an odds/prediction claim — just where the crowd is. */
export function PoolContext({ score }: Props) {
  const { data: snapshot } = useQuery(poolSnapshotQuery());

  if (score === null || !snapshot || snapshot.bands.length === 0) return null;

  const band = snapshot.bands.find((b) => score >= b.bandLow && score <= b.bandHigh);
  if (!band) return null;

  const total = snapshot.bands.reduce((sum, b) => sum + b.candidateCount, 0);

  return (
    <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
      <strong className="text-ink">Pool context:</strong>{" "}
      <span className="tabular-nums text-ink">{band.candidateCount.toLocaleString("en-CA")}</span>{" "}
      candidates were in the {band.bandLow}–{band.bandHigh} point band as of{" "}
      {formatDate(snapshot.asOfDate)}, out of{" "}
      <span className="tabular-nums text-ink">{total.toLocaleString("en-CA")}</span> in the pool
      overall.
    </p>
  );
}
