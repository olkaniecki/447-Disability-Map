import { useState, useEffect } from "react";
import { MapContainer, ImageOverlay } from "react-leaflet";
import L from "leaflet";
import 'leaflet/dist/leaflet.css';
import FloorplanNavigator from "./FloorplanNavigator";
import { blankIcon } from "../utils/leafletIcons";

export default function FloorplanViewer({ building, onBack }) {
  const id = building.properties.building_id;
  const numericId = id.replace("bldg_", "");

  const [floor, setFloor] = useState("0");
  const [geojsonData, setGeojsonData] = useState(null);

  const imgWidth = 3400;
  const imgHeight = 2200;
  const imageSrc = `/assets/floorplans/${numericId}_F${floor}.png`;

  const bounds = [
    [0, 0],           // bottom-left
    [imgHeight, imgWidth]  // top-right
  ];
  

  useEffect(() => {
    setGeojsonData(null);
    const geojsonSrc = `/geojson_data/interior-data/${numericId}_F${floor}.geojson`;

    fetch(geojsonSrc)
      .then(res => res.json())
      .then(data => {
        // Flip Y coordinates like in old working code
        const flipped = {
          ...data,
          features: data.features.map(f => {
            const flipCoords = (coords, type) => {
              if (type === "Point") return [coords[0], imgHeight + coords[1]];
              if (type === "LineString" || type === "MultiPoint")
                return coords.map(([x, y]) => [x, imgHeight + y]);
              if (type === "Polygon" || type === "MultiLineString")
                return coords.map(ring => ring.map(([x, y]) => [x, imgHeight + y]));
              if (type === "MultiPolygon")
                return coords.map(poly => poly.map(ring => ring.map(([x, y]) => [x, imgHeight + y])));
              return coords;
            };

            return {
              ...f,
              geometry: {
                ...f.geometry,
                coordinates: flipCoords(f.geometry.coordinates, f.geometry.type)
              }
            };
          })
        };
        setGeojsonData(flipped);
      })
      .catch(() => setGeojsonData(null));
  }, [floor, numericId]);

  useEffect(() => {
    // override default icon for this map session
    L.Marker.prototype.options.icon = blankIcon;
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#222", color: "white" }}>
      <div style={{ padding: "10px" }}>
        <button onClick={onBack} style={{ padding: "6px 12px", borderRadius: "6px", background: "#333", color: "white", border: "1px solid #666", cursor: "pointer" }}>
          ← Back
        </button>
        <h2>Floorplan for {building.properties.name}</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          {["0","1","2","3"].map(f => (
            <button
              key={f}
              onClick={() => setFloor(f)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                background: f === floor ? "#555" : "#333",
                color: "white",
                border: "1px solid #666",
                cursor: "pointer"
              }}
            >
              Floor {f}
            </button>
          ))}
        </div>
      </div>
      
      
      <div style={{ flex: 1 }}>
        <MapContainer
          key={floor}
          crs={L.CRS.Simple}
          bounds={bounds}
          style={{ width: "100%", height: "100%", background: "white" }}
          maxZoom={4}
          minZoom={-3}
          
        >
          <ImageOverlay url={imageSrc} bounds={bounds} />
          {geojsonData && <FloorplanNavigator geojsonData={geojsonData} imgHeight={imgHeight} />}
        </MapContainer>
      </div>
    </div>
  );
}