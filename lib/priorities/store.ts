import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { Priority, PriorityInput } from "./types";

const FILE = path.join(process.cwd(), "data", "priorities.json");

async function readLocalFile(): Promise<Priority[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf-8")) as Priority[];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeLocalFile(entries: Priority[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export async function listPriorities(): Promise<Priority[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("priorities").select("*").order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data as Priority[];
  }
  const items = await readLocalFile();
  return items.sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
}

export async function createPriority(input: PriorityInput): Promise<Priority> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  if (supabase) {
    const { data, error } = await supabase
      .from("priorities")
      .insert({ ...input, created_at: now, updated_at: now })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Priority;
  }
  const items = await readLocalFile();
  const record: Priority = { id: randomUUID(), ...input, created_at: now, updated_at: now };
  items.push(record);
  await writeLocalFile(items);
  return record;
}

export async function updatePriority(id: string, patch: Partial<PriorityInput>): Promise<Priority> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("priorities")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Priority;
  }
  const items = await readLocalFile();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) throw new Error(`No priority with id ${id}.`);
  items[idx] = { ...items[idx], ...patch, updated_at: new Date().toISOString() };
  await writeLocalFile(items);
  return items[idx];
}

export async function deletePriority(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("priorities").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const items = await readLocalFile();
  await writeLocalFile(items.filter((i) => i.id !== id));
}
