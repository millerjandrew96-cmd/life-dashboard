import { promises as fs } from "fs";
import path from "path";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { BusinessWeekEntry, BusinessWeekEntryInput } from "./types";

const WEEK_FILE = path.join(process.cwd(), "data", "business-week-entries.json");

async function readLocalFile<T>(file: string): Promise<T[]> {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8")) as T[];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeLocalFile<T>(file: string, entries: T[]): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(entries, null, 2), "utf-8");
}

export async function listBusinessWeekEntries(): Promise<BusinessWeekEntry[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("business_week_entries").select("*").order("week", { ascending: true });
    if (error) throw new Error(error.message);
    return data as BusinessWeekEntry[];
  }
  const entries = await readLocalFile<BusinessWeekEntry>(WEEK_FILE);
  return entries.sort((a, b) => a.week.localeCompare(b.week));
}

export async function upsertBusinessWeekEntry(input: BusinessWeekEntryInput): Promise<BusinessWeekEntry> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("business_week_entries")
      .upsert({ ...input, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as BusinessWeekEntry;
  }
  const entries = await readLocalFile<BusinessWeekEntry>(WEEK_FILE);
  const record: BusinessWeekEntry = { ...input, updated_at: new Date().toISOString() };
  const idx = entries.findIndex((e) => e.week === input.week);
  if (idx >= 0) entries[idx] = record;
  else entries.push(record);
  await writeLocalFile(WEEK_FILE, entries);
  return record;
}

export async function deleteBusinessWeekEntry(week: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("business_week_entries").delete().eq("week", week);
    if (error) throw new Error(error.message);
    return;
  }
  const entries = await readLocalFile<BusinessWeekEntry>(WEEK_FILE);
  await writeLocalFile(WEEK_FILE, entries.filter((e) => e.week !== week));
}
