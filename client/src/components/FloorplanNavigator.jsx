import React, { useEffect, useState } from "react";
import { GeoJSON, CircleMarker, Popup } from "react-leaflet";
import { buildGraphFromGeojson } from "../utils/indoorGraph";

/* ------------------ POINT IN POLYGON ------------------ */
function pointInPolygon(pt, vs) {
  const [x, y] = pt;
  let inside = false;

  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const [xi, yi] = vs[i];
    const [xj, yj] = vs[j];

    const intersect =
      (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

/* ------------------ MAIN COMPONENT ------------------ */
export default function FloorplanNavigator({ geojsonData }) {
  const [graph, setGraph] = useState(null);

  useEffect(() => {
    if (!geojsonData) return;

    /* 1. Build graph */
    const g = buildGraphFromGeojson(geojsonData, { maxConnectDist: 40 });

    /* 2. Build dictionary of room features by room_name */
    const roomsByName = {};
    geojsonData.features.forEach((f) => {
      if (f.properties?.feature_type === "room") {
        const rn =
          f.properties.room_name ??
          String(f.properties.id ?? "unknown_room");

        roomsByName[rn] = {
          props: f.properties,
          geom: f.geometry,
        };
      }
    });

    /* 3. Attach proper metadata to each node */
    Object.values(g.nodes).forEach((node) => {
      node.meta = node.meta || {};

      // Normalize room name
      const normalize = (v) => (v != null ? String(v).trim() : null);

      let roomKey =
        normalize(node.meta.to_room) || normalize(node.meta.from_room);

      /* --- A. If door → attach the room it leads to --- */
      if (roomKey && roomsByName[roomKey]) {
        const rp = roomsByName[roomKey].props;
        node.meta.room_name = rp.room_name;
        node.meta.building = rp.building;
        node.meta.floor = rp.floor;
        node.meta.type = rp.type;
      }

      /* --- B. Spatial fallback: if inside a room polygon --- */
      if (!node.meta.room_name) {
        const [x, y] = node.coord ?? [NaN, NaN];

        if (Number.isFinite(x) && Number.isFinite(y)) {
          for (const rn in roomsByName) {
            const { geom, props } = roomsByName[rn];

            if (geom.type === "Polygon") {
              if (pointInPolygon([x, y], geom.coordinates[0])) {
                Object.assign(node.meta, props);
                break;
              }
            } else if (geom.type === "MultiPolygon") {
              for (const poly of geom.coordinates) {
                if (pointInPolygon([x, y], poly[0])) {
                  Object.assign(node.meta, props);
                  break;
                }
              }
            }
          }
        }
      }
    });

    setGraph(g);
  }, [geojsonData]);

  /* ------------------ RENDER ------------------ */
  return (
    <>
      {/* Draw building polygons */}
      {geojsonData && (
        <GeoJSON
          data={geojsonData}
          style={{
            color: "lime",
            fillColor: "rgba(0,255,0,0.2)",
            weight: 2,
            fillOpacity: 0.5,
          }}
        />
      )}

      {/* Draw navigation nodes */}
      {graph &&
        Object.values(graph.nodes).map((n) => {
          if (
            !n.coord ||
            !Number.isFinite(n.coord[0]) ||
            !Number.isFinite(n.coord[1])
          )
            return null;

          const latlng = [n.coord[1], n.coord[0]];

          /* Node styling */
          let color = "blue";
          let radius = 6;

          if (n.meta?.doorIndex !== undefined) color = "green";
          if (n.meta?.feature_type === "elevator") {
            color = "purple";
            radius = 10;
          }

          /* Popup labels */
          const roomLabel =
            n.meta?.room_name ||
            n.meta?.to_room ||
            n.meta?.from_room ||
            "—";

          const buildingLabel = n.meta?.building ?? "—";
          const floorLabel = n.meta?.floor ?? "—";
          const typeLabel = n.meta?.type ?? n.meta?.feature_type ?? "—";

          return (
            <CircleMarker
              key={n.id}
              center={latlng}
              radius={radius}
              fillColor={color}
              color="#000"
              weight={1}
              fillOpacity={0.9}
            >
              <Popup>
                <div style={{ lineHeight: "1.3" }}>
                  <strong>Room:</strong> {roomLabel}
                  <br />
                  <strong>Building:</strong> {buildingLabel}
                  <br />
                  <strong>Floor:</strong> {floorLabel}
                  <br />
                  <strong>Type:</strong> {typeLabel}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
    </>
  );
}
