import { RelationshipsDashboard } from "./RelationshipsDashboard";
import { getRelationshipScoreForMonth } from "@/lib/relationships/composeScore";

export default async function RelationshipsPage({ searchParams }: PageProps<"/relationships">) {
  const params = await searchParams;
  const requestedMonth = typeof params.month === "string" ? params.month : null;

  const { month, score, entries, actionItems } = await getRelationshipScoreForMonth(requestedMonth);

  return <RelationshipsDashboard key={month} selectedMonth={month} score={score} entries={entries} actionItems={actionItems} />;
}
