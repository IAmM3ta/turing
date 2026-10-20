import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { specFromStudio } from "@/lib/favorite-spec";
import { deleteFavorite, listFavorites, saveFavorite, type FavoriteRow } from "@/lib/favorites.functions";
import { WEAR } from "@/lib/rd/recipes";
import { useStudio, type FormaApi } from "@/lib/studio-store";
import { Button } from "@/components/ui/button";

export function SavedPieces({ apiRef }: { apiRef: { current: FormaApi | null } }) {
  const { user, isPending } = useCurrentUserState();
  const [rows, setRows] = useState<FavoriteRow[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!user) return;
    let dead = false;
    listFavorites()
      .then((next) => {
        if (!dead) setRows(next);
      })
      .catch(() => {
        if (!dead) setNote("Saved pieces didn’t load.");
      });
    return () => {
      dead = true;
    };
  }, [user?.id]);

  const save = async () => {
    const state = useStudio.getState();
    const spec = specFromStudio(state);
    const kind = wearKind(state.make, state.outline, state.plateW);
    const label = name.trim() || kind;
    setBusy(true);
    setNote("");
    try {
      const saved = await saveFavorite({
        data: {
          name: label,
          kind,
          spec,
          thumb: apiRef.current?.thumbnail() ?? "",
        },
      });
      setRows((current) => [saved, ...current].slice(0, 48));
      setName("");
      state.setNotice(`Saved ${label}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setNote(message.includes("Unauthorized") ? "Sign in to keep this piece." : message || "Could not save that piece.");
    } finally {
      setBusy(false);
    }
  };

  if (isPending) return <div className="h-24 animate-pulse rounded-md bg-surface" />;

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-xl">Saved</h2>
        <p className="text-sm text-muted">{user ? "On your account" : "Needs a sign-in"}</p>
      </div>
      {user ? (
        <div className="flex gap-2">
          <input
            value={name}
            maxLength={60}
            placeholder="Name this piece"
            aria-label="Name this piece"
            onChange={(event) => setName(event.target.value)}
            className="h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-sm text-fg"
          />
          <Button tone="solid" disabled={busy} onClick={() => void save()}>
            {busy ? "Saving" : "Save"}
          </Button>
        </div>
      ) : (
        <Link
          to="/login"
          className="flex h-11 items-center justify-center rounded-md border border-brass bg-brass text-sm font-medium text-bg"
        >
          Sign in to save pieces
        </Link>
      )}
      {note ? <p className="mt-2 text-sm text-brass">{note}</p> : null}
      {user && rows.length === 0 ? (
        <p className="mt-2 text-sm text-pretty text-muted">Nothing on the shelf yet. Grow a pendant or a pair, then save it.</p>
      ) : null}
      {rows.length > 0 ? (
        <ul className="mt-2 grid gap-2">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-2">
              <button
                type="button"
                className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md border border-line bg-surface px-2 py-1 text-left"
                onClick={() => useStudio.getState().applySpec(row.spec, row.name)}
              >
                {row.thumb ? (
                  <img src={row.thumb} alt="" className="size-11 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="size-11 shrink-0 rounded-md bg-field" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{row.name}</span>
                  <span className="block truncate text-sm text-muted">{row.kind}</span>
                </span>
              </button>
              <button
                type="button"
                className="h-11 shrink-0 rounded-md px-2 text-sm text-muted"
                onClick={() => {
                  setRows((current) => current.filter((item) => item.id !== row.id));
                  void deleteFavorite({ data: row.id }).catch(() => {
                    setNote("Could not remove that piece.");
                    listFavorites()
                      .then(setRows)
                      .catch(() => {});
                  });
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function wearKind(make: string, outline: string, plateW: number) {
  const hit = WEAR.find(
    (item) => item.patch.make === make && item.patch.outline === outline && Math.abs(item.patch.plateW - plateW) < 0.8,
  );
  if (hit) return hit.name;
  if (make === "sheet") return "Tiles";
  if (make === "lattice") return "Lattice";
  return "Relief";
}
