import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { RelationshipActionItem, RelationshipActionItemInput, RelationshipEntry, RelationshipEntryInput } from "./types";

const ENTRIES_FILE = path.join(process.cwd(), "data", "relationship-entries.json");
const ACTION_ITEMS_FILE = path.join(process.cwd(), "data", "relationship-action-items.json");

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

// ---- Monthly evaluation entries ----

export async function listRelationshipEntries(): Promise<RelationshipEntry[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("relationship_entries").select("*").order("month", { ascending: true });
    if (error) throw new Error(error.message);
    return data as RelationshipEntry[];
  }
  const entries = await readLocalFile<RelationshipEntry>(ENTRIES_FILE);
  return entries.sort((a, b) => a.month.localeCompare(b.month));
}

export async function getRelationshipEntry(month: string): Promise<RelationshipEntry | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("relationship_entries").select("*").eq("month", month).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as RelationshipEntry) ?? null;
  }
  const entries = await readLocalFile<RelationshipEntry>(ENTRIES_FILE);
  return entries.find((e) => e.month === month) ?? null;
}

export async function upsertRelationshipEntry(input: RelationshipEntryInput): Promise<RelationshipEntry> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("relationship_entries")
      .upsert({ ...input, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as RelationshipEntry;
  }
  const entries = await readLocalFile<RelationshipEntry>(ENTRIES_FILE);
  const record: RelationshipEntry = { ...input, updated_at: new Date().toISOString() };
  const idx = entries.findIndex((e) => e.month === input.month);
  if (idx >= 0) entries[idx] = record;
  else entries.push(record);
  await writeLocalFile(ENTRIES_FILE, entries);
  return record;
}

export async function deleteRelationshipEntry(month: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("relationship_entries").delete().eq("month", month);
    if (error) throw new Error(error.message);
    return;
  }
  const entries = await readLocalFile<RelationshipEntry>(ENTRIES_FILE);
  await writeLocalFile(ENTRIES_FILE, entries.filter((e) => e.month !== month));
}

// ---- Action items ----

export async function listRelationshipActionItems(): Promise<RelationshipActionItem[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("relationship_action_items").select("*").order("due_month", { ascending: true });
    if (error) throw new Error(error.message);
    return data as RelationshipActionItem[];
  }
  const items = await readLocalFile<RelationshipActionItem>(ACTION_ITEMS_FILE);
  return items.sort((a, b) => a.due_month.localeCompare(b.due_month));
}

export async function createRelationshipActionItem(input: RelationshipActionItemInput): Promise<RelationshipActionItem> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  if (supabase) {
    const { data, error } = await supabase
      .from("relationship_action_items")
      .insert({ ...input, created_at: now, updated_at: now })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as RelationshipActionItem;
  }
  const items = await readLocalFile<RelationshipActionItem>(ACTION_ITEMS_FILE);
  const record: RelationshipActionItem = { id: randomUUID(), ...input, created_at: now, updated_at: now };
  items.push(record);
  await writeLocalFile(ACTION_ITEMS_FILE, items);
  return record;
}

export async function updateRelationshipActionItem(id: string, patch: Partial<RelationshipActionItemInput>): Promise<RelationshipActionItem> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("relationship_action_items")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as RelationshipActionItem;
  }
  const items = await readLocalFile<RelationshipActionItem>(ACTION_ITEMS_FILE);
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) throw new Error(`No action item with id ${id}.`);
  items[idx] = { ...items[idx], ...patch, updated_at: new Date().toISOString() };
  await writeLocalFile(ACTION_ITEMS_FILE, items);
  return items[idx];
}

export async function deleteRelationshipActionItem(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("relationship_action_items").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const items = await readLocalFile<RelationshipActionItem>(ACTION_ITEMS_FILE);
  await writeLocalFile(ACTION_ITEMS_FILE, items.filter((i) => i.id !== id));
}
