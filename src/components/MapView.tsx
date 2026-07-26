"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Map as MlMap, Marker, MapMouseEvent } from "maplibre-gl";
import type { Place } from "@/lib/places";

const DEFAULT_CENTER: [number, number] = [139.767, 35.681]; // Tokyo Station
const DEFAULT_ZOOM = 12;

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

type Draft = { lng: number; lat: number };
type Sheet =
  | { kind: "closed" }
  | { kind: "create"; draft: Draft }
  | { kind: "list" }
  | { kind: "edit"; place: Place };

export default function MapView({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const maplibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const draftMarkerRef = useRef<Marker | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [maxPlaces, setMaxPlaces] = useState(3);
  const [mapReady, setMapReady] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [sheet, setSheet] = useState<Sheet>({ kind: "closed" });

  const addModeRef = useRef(addMode);
  const placesCountRef = useRef(0);
  addModeRef.current = addMode;
  placesCountRef.current = places.length;

  const atLimit = places.length >= maxPlaces;

  const loadPlaces = useCallback(async () => {
    const res = await fetch("/api/places");
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setPlaces(data.places ?? []);
    if (typeof data.maxPlaces === "number") setMaxPlaces(data.maxPlaces);
  }, [router]);

  const openCreate = useCallback((lng: number, lat: number) => {
    if (placesCountRef.current >= 3) return;
    setAddMode(false);
    setSheet({ kind: "create", draft: { lng, lat } });
  }, []);

  // Initialize the map once.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !mapContainerRef.current) return;
      maplibreRef.current = maplibre;

      const map = new maplibre.Map({
        container: mapContainerRef.current,
        style: OSM_STYLE,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: { compact: true },
      });
      mapRef.current = map;

      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "bottom-left");
      map.addControl(
        new maplibre.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        }),
        "bottom-left",
      );

      const handlePick = (e: MapMouseEvent) => {
        openCreate(e.lngLat.lng, e.lngLat.lat);
      };

      map.on("load", () => {
        if (cancelled) return;
        setMapReady(true);
      });

      // Long-press on touch / right-click on desktop.
      map.on("contextmenu", handlePick);
      // Tap while in "add" mode.
      map.on("click", (e) => {
        if (addModeRef.current) handlePick(e);
      });

      // Try to center on the user's current location.
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled) return;
            map.easeTo({
              center: [pos.coords.longitude, pos.coords.latitude],
              zoom: 14,
            });
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000 },
        );
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapReady) void loadPlaces();
  }, [mapReady, loadPlaces]);

  // Render saved-place markers whenever the list changes.
  useEffect(() => {
    const map = mapRef.current;
    const maplibre = maplibreRef.current;
    if (!map || !maplibre || !mapReady) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    places.forEach((place) => {
      const el = document.createElement("div");
      el.className = "place-marker";
      const marker = new maplibre.Marker({ element: el, anchor: "bottom" })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setSheet({ kind: "edit", place });
      });
      markersRef.current.push(marker);
    });
  }, [places, mapReady]);

  // Show a draft marker while creating.
  useEffect(() => {
    const map = mapRef.current;
    const maplibre = maplibreRef.current;
    if (!map || !maplibre) return;

    draftMarkerRef.current?.remove();
    draftMarkerRef.current = null;

    if (sheet.kind === "create") {
      const el = document.createElement("div");
      el.className = "place-marker draft-marker";
      draftMarkerRef.current = new maplibre.Marker({ element: el, anchor: "bottom" })
        .setLngLat([sheet.draft.lng, sheet.draft.lat])
        .addTo(map);
      map.easeTo({ center: [sheet.draft.lng, sheet.draft.lat] });
    }
  }, [sheet]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const closeSheet = () => setSheet({ kind: "closed" });

  return (
    <div className="map-screen">
      <div className="topbar">
        <div>
          <div className="topbar-title">大事な場所マップ</div>
        </div>
        <div className="topbar-actions">
          <span className="pill">
            {places.length} / {maxPlaces}
          </span>
          <button className="icon-btn" onClick={() => setSheet({ kind: "list" })}>
            一覧
          </button>
          <button className="icon-btn" onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </div>

      <div ref={mapContainerRef} className="map-container" />

      {mapReady && (
        <div className="hint">
          {atLimit
            ? `投稿は最大${maxPlaces}地点までです`
            : addMode
              ? "地図をタップして場所を選択"
              : "地図を長押し、または「＋場所を追加」から投稿"}
        </div>
      )}

      <button
        className="fab"
        disabled={atLimit}
        onClick={() => setAddMode((v) => !v)}
      >
        {addMode ? "キャンセル" : "＋ 場所を追加"}
      </button>

      {sheet.kind === "create" && (
        <PlaceForm
          title="場所を投稿"
          coords={sheet.draft}
          onCancel={closeSheet}
          onSubmit={async ({ name, reason }) => {
            const res = await fetch("/api/places", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                reason,
                latitude: sheet.draft.lat,
                longitude: sheet.draft.lng,
              }),
            });
            const data = await res.json();
            if (!res.ok) return data.error ?? "保存に失敗しました";
            closeSheet();
            await loadPlaces();
            return null;
          }}
        />
      )}

      {sheet.kind === "edit" && (
        <PlaceForm
          title="場所を編集"
          coords={{ lat: sheet.place.latitude, lng: sheet.place.longitude }}
          initialName={sheet.place.name}
          initialReason={sheet.place.reason}
          onCancel={closeSheet}
          onSubmit={async ({ name, reason }) => {
            const res = await fetch(`/api/places/${sheet.place.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, reason }),
            });
            const data = await res.json();
            if (!res.ok) return data.error ?? "更新に失敗しました";
            closeSheet();
            await loadPlaces();
            return null;
          }}
        />
      )}

      {sheet.kind === "list" && (
        <div className="sheet-backdrop" onClick={closeSheet}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2 className="sheet-title">投稿した場所（{places.length}/{maxPlaces}）</h2>
            <p className="sheet-coords">{userEmail}</p>
            {places.length === 0 ? (
              <p className="list-empty">まだ投稿がありません。地図から追加しましょう。</p>
            ) : (
              places.map((place) => (
                <div className="place-item" key={place.id}>
                  <h4>{place.name}</h4>
                  <p>{place.reason}</p>
                  <p className="place-meta">
                    緯度 {place.latitude.toFixed(5)} / 経度{" "}
                    {place.longitude.toFixed(5)}
                  </p>
                  <div className="place-item-actions">
                    <button
                      onClick={() => {
                        closeSheet();
                        mapRef.current?.easeTo({
                          center: [place.longitude, place.latitude],
                          zoom: 15,
                        });
                      }}
                    >
                      地図で表示
                    </button>
                    <button onClick={() => setSheet({ kind: "edit", place })}>
                      編集
                    </button>
                    <button
                      className="del"
                      onClick={async () => {
                        if (!confirm("この場所を削除しますか？")) return;
                        const res = await fetch(`/api/places/${place.id}`, {
                          method: "DELETE",
                        });
                        if (res.ok) await loadPlaces();
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))
            )}
            <button className="btn btn-secondary" onClick={closeSheet}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceForm({
  title,
  coords,
  initialName = "",
  initialReason = "",
  onCancel,
  onSubmit,
}: {
  title: string;
  coords: { lat: number; lng: number };
  initialName?: string;
  initialReason?: string;
  onCancel: () => void;
  onSubmit: (v: { name: string; reason: string }) => Promise<string | null>;
}) {
  const [name, setName] = useState(initialName);
  const [reason, setReason] = useState(initialReason);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const err = await onSubmit({ name, reason });
    if (err) {
      setError(err);
      setSaving(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 className="sheet-title">{title}</h2>
        <p className="sheet-coords">
          緯度 {coords.lat.toFixed(5)} / 経度 {coords.lng.toFixed(5)}
        </p>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="place-name">場所の名前</label>
            <input
              id="place-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：思い出の公園"
              maxLength={120}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="place-reason">大事・好きな理由</label>
            <textarea
              id="place-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="この場所が大切な理由を書いてください"
              rows={4}
              maxLength={1000}
              required
            />
          </div>
          <div className="sheet-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={saving}
            >
              キャンセル
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
