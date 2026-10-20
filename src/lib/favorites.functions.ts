import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { cleanSpec, type FavoriteSpec } from "@/lib/favorite-spec";

export type FavoriteRow = {
  id: string;
  name: string;
  kind: string;
  spec: FavoriteSpec;
  thumb: string;
  createdAt: string;
};

type FavoriteInput = {
  name: string;
  kind: string;
  spec: FavoriteSpec;
  thumb: string;
};

function asText(value: unknown) {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return "";
}

function rowOf(row: {
  id: string;
  name: string;
  kind: string;
  spec: string;
  thumb: string;
  created_at: unknown;
}): FavoriteRow | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.spec);
  } catch {
    return null;
  }
  const spec = cleanSpec(parsed);
  if (!spec) return null;
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    spec,
    thumb: row.thumb.startsWith("data:image/") ? row.thumb : "",
    createdAt: asText(row.created_at),
  };
}

export const listFavorites = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      name: string;
      kind: string;
      spec: string;
      thumb: string;
      created_at: unknown;
    }>`select id, name, kind, spec, thumb, created_at from favorites where user_id = ${context.userId} order by created_at desc limit 48`;
    return rows.flatMap((row) => {
      const clean = rowOf(row);
      return clean ? [clean] : [];
    });
  });

export const saveFavorite = createServerFn({ method: "POST" })
  .validator((body: FavoriteInput) => body)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const spec = cleanSpec(data?.spec);
    if (!spec) throw new Error("That piece could not be saved.");
    const name = (data.name ?? "").trim().slice(0, 60) || "Untitled";
    const kind = (data.kind ?? "").trim().slice(0, 32) || "Piece";
    const thumb = typeof data.thumb === "string" && data.thumb.startsWith("data:image/jpeg") && data.thumb.length < 80000 ? data.thumb : "";
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const count = await sql<{ n: number }>`select count(*) as n from favorites where user_id = ${context.userId}`;
    if (Number(count[0]?.n ?? 0) >= 48) throw new Error("48 saved pieces is the shelf limit. Remove one first.");
    const id = crypto.randomUUID();
    await sql`insert into favorites (id, user_id, name, kind, spec, thumb) values (${id}, ${context.userId}, ${name}, ${kind}, ${JSON.stringify(spec)}, ${thumb})`;
    return { id, name, kind, spec, thumb, createdAt: new Date().toISOString() } satisfies FavoriteRow;
  });

export const deleteFavorite = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    if (!id || typeof id !== "string") return;
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from favorites where id = ${id} and user_id = ${context.userId}`;
  });
