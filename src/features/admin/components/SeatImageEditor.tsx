import { useRef, useState, useCallback, useEffect } from "react";
import type { SeatMarker } from "@/features/admin/store/admin";
import { renumberSeatMap, countSeatsInMap } from "@/features/admin/store/admin";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Upload, Trash2, RotateCw, X, Armchair, DoorOpen, Car, ZoomIn, ZoomOut, Magnet } from "lucide-react";
import { cn } from "@/shared/utils/utils";
import { toast } from "sonner";
import { SeatGlyph } from "./SeatGlyph";

type Tool = "seat" | "driver" | "door";


interface Props {
  imageUrl?: string;
  markers: SeatMarker[];
  onImageChange: (url: string | undefined) => void;
  onMarkersChange: (m: SeatMarker[]) => void;
}

const toolMeta: Record<Tool, { label: string; icon: typeof Armchair; cls: string }> = {
  seat: { label: "Kursi", icon: Armchair, cls: "bg-primary text-primary-foreground" },
  driver: { label: "Sopir", icon: Car, cls: "bg-foreground text-background" },
  door: { label: "Pintu", icon: DoorOpen, cls: "bg-amber-400 text-amber-950" },
};

// Canvas tetap 3:2 landscape. Apapun rasio foto, gambar di-"contain"
// dengan letterbox putih → ukuran & posisi marker selalu konsisten.
const CANVAS_W = 1200;
const CANVAS_H = 800;
const CANVAS_ASPECT = CANVAS_W / CANVAS_H;

async function fitImageToCanvas(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const dx = Math.round((CANVAS_W - w) / 2);
  const dy = Math.round((CANVAS_H - h) / 2);
  const cv = document.createElement("canvas");
  cv.width = CANVAS_W;
  cv.height = CANVAS_H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.drawImage(img, dx, dy, w, h);
  return cv.toDataURL("image/jpeg", 0.82);
}

export function SeatImageEditor({ imageUrl, markers, onImageChange, onMarkersChange }: Props) {
  const [tool, setTool] = useState<Tool>("seat");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);
  const justDraggedRef = useRef(false);

  const snapVal = (v: number) => (snap ? Math.round(v / 0.02) * 0.02 : v);


  const handleUpload = async (file: File) => {
    const url = await fileToDataUrl(file);
    // Rough size estimate from data URL length.
    const approxBytes = Math.round((url.length * 3) / 4);
    if (approxBytes > 500_000) {
      toast.warning("Gambar cukup besar (" + Math.round(approxBytes / 1024) + " KB). Pertimbangkan upload foto lebih kecil agar penyimpanan tidak penuh.");
    }
    onImageChange(url);
  };

  const getRel = (e: { clientX: number; clientY: number }) => {
    const r = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  const onStageClick = (e: React.MouseEvent) => {
    if (!imageUrl) return;
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    if (e.target !== e.currentTarget && (e.target as HTMLElement).dataset.marker) return;
    const raw = getRel(e);
    const x = snapVal(raw.x);
    const y = snapVal(raw.y);
    const id = "m-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    let next = [...markers];
    if (tool === "driver" || tool === "door") {
      const existing = next.find((m) => m.kind === tool);
      if (existing) {
        next = next.filter((m) => m.id !== existing.id);
        toast.info(`Marker ${toolMeta[tool].label.toLowerCase()} sebelumnya digantikan.`);
      }
      next.push({ id, x, y, kind: tool });
      onMarkersChange(next);
    } else {
      next.push({ id, x, y, kind: "seat", label: "?" });
      onMarkersChange(renumberSeatMap(next));
    }
    setSelectedId(id);
  };

  const startDrag = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const m = markers.find((x) => x.id === id);
    if (!m) return;
    dragging.current = { id, startX: e.clientX, startY: e.clientY, moved: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedId(id);
  };

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const d = dragging.current;
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 4) return;
      d.moved = true;
      const raw = getRel(e);
      const x = snapVal(raw.x);
      const y = snapVal(raw.y);
      onMarkersChange(markers.map((m) => (m.id === d.id ? { ...m, x, y } : m)));
    },
    [markers, onMarkersChange],
  );

  const endDrag = () => {
    if (dragging.current?.moved) justDraggedRef.current = true;
    dragging.current = null;
  };

  const removeMarker = useCallback(
    (id: string) => {
      const next = markers.filter((m) => m.id !== id);
      onMarkersChange(renumberSeatMap(next));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [markers, onMarkersChange],
  );

  const updateLabel = (id: string, label: string) => {
    onMarkersChange(markers.map((m) => (m.id === id && m.kind === "seat" ? { ...m, label } : m)));
  };

  const rotateMarker = (id: string) => {
    onMarkersChange(
      markers.map((m) => {
        if (m.id !== id) return m;
        const next = (((m.rotation ?? 0) + 90) % 360) as 0 | 90 | 180 | 270;
        return { ...m, rotation: next };
      }),
    );
  };

  const alignRow = (id: string) => {
    const target = markers.find((m) => m.id === id);
    if (!target) return;
    // Find nearest seat in same approximate row (Δy < 0.06) and snap Y.
    const peer = markers
      .filter((m) => m.id !== id && m.kind === "seat" && Math.abs(m.y - target.y) < 0.06)
      .sort((a, b) => Math.abs(a.y - target.y) - Math.abs(b.y - target.y))[0];
    if (!peer) {
      toast.info("Tidak ada kursi lain di baris ini.");
      return;
    }
    onMarkersChange(markers.map((m) => (m.id === id ? { ...m, y: peer.y } : m)));
  };

  // Keyboard: Delete/Backspace removes selected, Esc clears.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeMarker(selectedId);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, removeMarker]);

  const selected = markers.find((m) => m.id === selectedId);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
          <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
            <Upload className="h-4 w-4" /> {imageUrl ? "Ganti gambar" : "Upload denah"}
          </span>
        </label>

        <div className="flex items-center gap-1 rounded-md border border-input p-1">
          {(Object.keys(toolMeta) as Tool[]).map((t) => {
            const Icon = toolMeta[t].icon;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTool(t)}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition",
                  tool === t ? toolMeta[t].cls : "text-muted-foreground hover:bg-accent",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {toolMeta[t].label}
              </button>
            );
          })}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onMarkersChange(renumberSeatMap(markers))}
          disabled={!markers.length}
        >
          <RotateCw className="mr-1 h-3.5 w-3.5" /> Renumber
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          onClick={() => onMarkersChange([])}
          disabled={!markers.length}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus semua
        </Button>

        {imageUrl && (
          <div className="flex items-center gap-1 rounded-md border border-input p-1">
            <button
              type="button"
              className="rounded p-1 hover:bg-accent disabled:opacity-40"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
              disabled={zoom <= 1}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="w-10 text-center text-xs font-medium tabular-nums">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="rounded p-1 hover:bg-accent disabled:opacity-40"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
              disabled={zoom >= 3}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {imageUrl && (
          <div className="flex items-center gap-1 rounded-md border border-input p-1">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium",
                snap ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
              onClick={() => setSnap((s) => !s)}
              aria-pressed={snap}
            >
              <Magnet className="h-3.5 w-3.5" /> Snap
            </button>
          </div>
        )}

        <div className="ml-auto text-xs text-muted-foreground">{countSeatsInMap(markers)} kursi</div>
      </div>


      {/* Stage */}
      {!imageUrl ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
          Upload denah kendaraan (top-down) untuk mulai menaruh kursi.
        </div>
      ) : (
        <div
          ref={wrapRef}
          className="relative w-full overflow-auto rounded-2xl border-2 border-border bg-muted/30"
          style={{ maxHeight: "70vh" }}
        >
          <div
            ref={stageRef}
            className="relative select-none"
            style={{ width: `${zoom * 100}%` }}
            onClick={onStageClick}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <img src={imageUrl} alt="Denah kendaraan" className="block h-auto w-full opacity-90" draggable={false} />
            {markers.map((m) => {
              const meta = toolMeta[m.kind];
              const Icon = meta.icon;
              const sel = m.id === selectedId;
              if (m.kind === "seat") {
                return (
                  <button
                    key={m.id}
                    type="button"
                    data-marker="1"
                    onPointerDown={(e) => startDrag(e, m.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (justDraggedRef.current) {
                        justDraggedRef.current = false;
                        return;
                      }
                      setSelectedId(m.id);
                    }}
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-md transition active:cursor-grabbing",
                      sel && "scale-110",
                    )}
                    style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
                  >
                    <SeatGlyph
                      label={m.label}
                      state={sel ? "selected" : "available"}
                      rotation={m.rotation ?? 0}
                      size={36}
                      selectedInEditor={sel}
                    />
                  </button>
                );
              }
              return (
                <button
                  key={m.id}
                  type="button"
                  data-marker="1"
                  onPointerDown={(e) => startDrag(e, m.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (justDraggedRef.current) {
                      justDraggedRef.current = false;
                      return;
                    }
                    setSelectedId(m.id);
                  }}
                  className={cn(
                    "absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 text-xs font-bold shadow-md transition active:cursor-grabbing",
                    meta.cls,
                    sel ? "ring-2 ring-offset-2 ring-ring scale-110" : "border-background/80",
                  )}
                  style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      {imageUrl && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><SeatGlyph size={20} state="available" /> Tersedia</span>
          <span className="flex items-center gap-1.5"><SeatGlyph size={20} state="selected" /> Dipilih</span>
          <span className="flex items-center gap-1.5"><SeatGlyph size={20} state="booked" /> Terisi</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background"><Car className="h-2.5 w-2.5" /></span> Sopir
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-4 w-3 items-center justify-center rounded-sm bg-amber-400 text-amber-950"><DoorOpen className="h-2.5 w-2.5" /></span> Pintu
          </span>
        </div>
      )}

      {/* Selected marker editor */}
      {selected && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
          <div className="text-xs font-medium text-muted-foreground">
            {toolMeta[selected.kind].label}
          </div>
          {selected.kind === "seat" && (
            <>
              <span className="text-xs text-muted-foreground">Label</span>
              <Input
                value={selected.label ?? ""}
                onChange={(e) => updateLabel(selected.id, e.target.value)}
                className="h-8 w-16"
              />
              <Button size="sm" variant="outline" onClick={() => rotateMarker(selected.id)} title="Putar 90°">
                <RotateCw className="mr-1 h-3.5 w-3.5" /> {selected.rotation ?? 0}°
              </Button>
              <Button size="sm" variant="outline" onClick={() => alignRow(selected.id)} title="Sejajarkan ke baris terdekat">
                <Magnet className="mr-1 h-3.5 w-3.5" /> Align
              </Button>
            </>
          )}
          {selected.kind !== "seat" && (
            <Button size="sm" variant="outline" onClick={() => rotateMarker(selected.id)}>
              <RotateCw className="mr-1 h-3.5 w-3.5" /> {selected.rotation ?? 0}°
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-destructive"
            onClick={() => removeMarker(selected.id)}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {imageUrl && (
        <p className="text-xs text-muted-foreground">
          Pilih tool lalu klik gambar untuk menaruh marker. Drag untuk reposisi. Tekan Delete untuk menghapus marker terpilih.
        </p>
      )}
    </div>
  );
}
