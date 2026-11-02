"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MiniPlayer, miniPlayerSupported, type MiniState } from "@/lib/player/miniPlayer";

/**
 * The workout as a floating picture-in-picture tile (see miniPlayer.ts), with
 * the tile's play/pause and next buttons wired to pause and skip.
 */
export function useMiniPlayer({
  state,
  name,
  running,
  done,
  onToggle,
  onSkip,
  onError,
}: {
  state: MiniState | null;
  name: string;
  running: boolean;
  done: boolean;
  onToggle: () => void;
  onSkip: () => void;
  onError: (message: string) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [open, setOpen] = useState(false);
  const mini = useRef<MiniPlayer | null>(null);
  useEffect(() => setSupported(miniPlayerSupported()), []);
  const stateRef = useRef(state);
  stateRef.current = state;
  const actions = useRef({ onToggle, onSkip });
  actions.current = { onToggle, onSkip };

  const ensure = useCallback(() => {
    if (!mini.current) {
      mini.current = new MiniPlayer();
      mini.current.onClose = () => setOpen(false);
    }
    return mini.current;
  }, []);

  async function show() {
    if (!stateRef.current) return;
    try {
      await ensure().show(stateRef.current);
      setOpen(true);
    } catch (e) {
      onError(`Couldn’t open the mini player: ${(e as Error).message}`);
    }
  }

  // While riding: keep the hidden video playing so the browser can pop it out when you leave, and let the
  // tile's play/pause and next buttons pause and skip.
  useEffect(() => {
    if (!supported || !running) return;
    const m = ensure();
    if (stateRef.current) void m.prime(stateRef.current);
    const ms = navigator.mediaSession;
    if (!ms) return;
    ms.metadata = new MediaMetadata({ title: name, artist: "Hour Power" });
    const set = (action: string, handler: (() => void) | null) => {
      try {
        ms.setActionHandler(action as MediaSessionAction, handler);
      } catch {
        // Not every browser knows every action (enterpictureinpicture is new).
      }
    };
    set("play", () => actions.current.onToggle());
    set("pause", () => actions.current.onToggle());
    set("nexttrack", () => actions.current.onSkip());
    set("enterpictureinpicture", () => {
      void m.enter().then(() => setOpen(true)).catch(() => {});
    });
    return () => ["play", "pause", "nexttrack", "enterpictureinpicture"].forEach((a) => set(a, null));
  }, [supported, running, ensure, name]);

  // Redraw the tile whenever the numbers change.
  useEffect(() => {
    if (mini.current && state) mini.current.draw(state);
  });

  // Finished, or leaving the page: close the tile.
  useEffect(() => {
    if (done) void mini.current?.hide();
  }, [done]);
  useEffect(() => () => mini.current?.destroy(), []);

  return { supported, open, show };
}
