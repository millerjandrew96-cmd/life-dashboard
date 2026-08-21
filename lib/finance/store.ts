import { promises as fs } from "fs";
import path from "path";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { FinanceEntry, FinanceEntryInput } from "./types";

const DATA_FILE = path.join(process.cwd(), "data", "finance-entries.json");

// ---- Local JSON-file fallback, used only when Supabase env vars aren't configured. ----
// This lets the app run and be demoed with `npm run dev` before Supabase is wired up;
// production deploys should always set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.

async function readLocalFile(): Promise<FinanceEntry[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as FinanceEntry[];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeLocalFile(entries: FinanceEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export async function listFinanceEntries(): Promise<FinanceEntry[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("finance_entries")
      .select("*")
      .order("month", { ascending: true });
    if (error) throw new Error(error.message);
    return data as FinanceEntry[];
  }
  const entries = await readLocalFile();
  return entries.sort((a, b) => a.month.localeCompare(b.month));
}

export async function getFinanceEntry(month: string): Promise<FinanceEntry | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("finance_entries").select("*").eq("month", month).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as FinanceEntry) ?? null;
  }
  const entries = await readLocalFile();
  return entries.find((e) => e.month === month) ?? null;
}

export async function upsertFinanceEntry(input: FinanceEntryInput): Promise<FinanceEntry> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("finance_entries")
      .upsert({ ...input, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as FinanceEntry;
  }
  const entries = await readLocalFile();
  const record: FinanceEntry = { ...input, updated_at: new Date().toISOString() };
  const idx = entries.findIndex((e) => e.month === input.month);
  if (idx >= 0) entries[idx] = record;
  else entries.push(record);
  await writeLocalFile(entries);
  return record;
}

export async function deleteFinanceEntry(month: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("finance_entries").delete().eq("month", month);
    if (error) throw new Error(error.message);
    return;
  }
  const entries = await readLocalFile();
  await writeLocalFile(entries.filter((e) => e.month !== month));
}
