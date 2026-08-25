import { promises as fs } from "fs";
import path from "path";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { HealthDailyEntry, HealthDailyEntryInput, HealthWeekEntry, HealthWeekEntryInput } from "./types";

const DAILY_FILE = path.join(process.cwd(), "data", "health-daily-entries.json");
const WEEK_FILE = path.join(process.cwd(), "data", "health-week-entries.json");

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

// ---- Daily entries (steps, nutrition, weight) ----

export async function listHealthDailyEntries(): Promise<HealthDailyEntry[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("health_daily_entries").select("*").order("date", { ascending: true });
    if (error) throw new Error(error.message);
    return data as HealthDailyEntry[];
  }
  const entries = await readLocalFile<HealthDailyEntry>(DAILY_FILE);
  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export async function upsertHealthDailyEntry(input: HealthDailyEntryInput): Promise<HealthDailyEntry> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("health_daily_entries")
      .upsert({ ...input, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as HealthDailyEntry;
  }
  const entries = await readLocalFile<HealthDailyEntry>(DAILY_FILE);
  const record: HealthDailyEntry = { ...input, updated_at: new Date().toISOString() };
  const idx = entries.findIndex((e) => e.date === input.date);
  if (idx >= 0) entries[idx] = record;
  else entries.push(record);
  await writeLocalFile(DAILY_FILE, entries);
  return record;
}

export async function deleteHealthDailyEntry(date: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("health_daily_entries").delete().eq("date", date);
    if (error) throw new Error(error.message);
    return;
  }
  const entries = await readLocalFile<HealthDailyEntry>(DAILY_FILE);
  await writeLocalFile(DAILY_FILE, entries.filter((e) => e.date !== date));
}

// ---- Weekly entries (workouts) ----

export async function listHealthWeekEntries(): Promise<HealthWeekEntry[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("health_week_entries").select("*").order("week", { ascending: true });
    if (error) throw new Error(error.message);
    return data as HealthWeekEntry[];
  }
  const entries = await readLocalFile<HealthWeekEntry>(WEEK_FILE);
  return entries.sort((a, b) => a.week.localeCompare(b.week));
}

export async function upsertHealthWeekEntry(input: HealthWeekEntryInput): Promise<HealthWeekEntry> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("health_week_entries")
      .upsert({ ...input, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as HealthWeekEntry;
  }
  const entries = await readLocalFile<HealthWeekEntry>(WEEK_FILE);
  const record: HealthWeekEntry = { ...input, updated_at: new Date().toISOString() };
  const idx = entries.findIndex((e) => e.week === input.week);
  if (idx >= 0) entries[idx] = record;
  else entries.push(record);
  await writeLocalFile(WEEK_FILE, entries);
  return record;
}

export async function deleteHealthWeekEntry(week: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("health_week_entries").delete().eq("week", week);
    if (error) throw new Error(error.message);
    return;
  }
  const entries = await readLocalFile<HealthWeekEntry>(WEEK_FILE);
  await writeLocalFile(WEEK_FILE, entries.filter((e) => e.week !== week));
}
