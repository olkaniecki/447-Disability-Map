import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import styled from "styled-components";
import L from 'leaflet';
import { useBuildingGeoJSONData, useBusStopGeoJSONData, useHighwayGeoJSONData, useEntranceGeoJSONData } from '../utils/loadGeoJSONData';
import { useBuildingMetadata } from '../utils/loadMetadata';
import { findRoute } from '../utils/geojsonRouteSearch';

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;

const basePath = process.env.PUBLIC_URL || "";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Default map center (UMBC)
const defaultCenter = [39.2554, -76.7116];

// Styled map container
const MapContainerStyled = styled(MapContainer)`
    height: 100vh;
    width: 100%;
`;

const lightTileLayer = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
};

const darkTileLayer = {
  url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  attribution: '&copy; <a href="https://www.carto.com/">CARTO</a> contributors &copy; OpenStreetMap'
};

// Compute building center
function getFeatureCenter(feature){
    if (!feature.geometry) return null;

    let lat, lng;
    if (feature.geometry.type === "Point") {
        [lng, lat] = feature.geometry.coordinates;
    } else if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
        const coords = feature.geometry.type === "Polygon"
            ? feature.geometry.coordinates[0]
            : feature.geometry.coordinates[0][0];
        const lats = coords.map(c => c[1]);
        const lngs = coords.map(c => c[0]);
        lat = (Math.min(...lats) + Math.max(...lats)) / 2;
        lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    } else return null;

    return [lat, lng];
}

// Zoom to feature
function ZoomFeature({feature}) {
  const map = useMap();
  useEffect(() => {
    if (!feature) return;
    const destination = getFeatureCenter(feature);
    if (destination) map.flyTo(destination, 18);
  }, [feature, map]);
  return null;
}

const hiddenTypes = ["bridge", "deck", "Loading Dock"];


export default function MapView({ selectedFeature, onAddFeature,routeRequest ,darkMode, geoJsonData, center = defaultCenter, zoom = 17, onShowFloorplan }) {
  //Load geoJsonData 
  const { buildings, loading: buildingsLoading } = useBuildingGeoJSONData();
  const { busstops, loading: busstopsLoading } = useBusStopGeoJSONData();
  const { highways, loading: highwaysLoading } = useHighwayGeoJSONData();
  const { entrances, loading: entrancesLoading } = useEntranceGeoJSONData();
  const metadata = useBuildingMetadata();

  const [route, setRoute] = useState(null);
  const [addedIds, setAddedIds] = useState([]); // Track added features for button feedback

  useEffect(() => {
    if (!routeRequest || !highways.length || !entrances.length || !busstops.length) return;

    const startId = routeRequest.startId;
    const endId = routeRequest.endId;

    const highwayFC = { type: "FeatureCollection", features: highways };
    const entranceFC = { type: "FeatureCollection", features: entrances };
    const busstopFC = { type: "FeatureCollection", features: busstops };

    const result = findRoute({
      startBuildingId: startId,
      endBuildingId: endId,
      entrances: entranceFC,
      highways: highwayFC,
      busstops: busstopFC.features || busstops,
      metadata: metadata
    });

    setRoute(result);
  }, [routeRequest, highways, entrances, busstops, metadata]);

  if (buildingsLoading || busstopsLoading || highwaysLoading || entrancesLoading || !metadata) {
    return <div>Loading map data...</div>;
  }

  const buildingStyle = {
    color: darkMode ? '#a8a8a8ff' : '#6e75817c',
    weight: 1,
    fillColor: darkMode ? '#ffffffff' : '#6e75817c',
    fillOpacity: 0.3
  };

  const highwayStyle = { color: '#fdac153d', weight: 3, opacity: 0.9 };
  const busstopStyle = { radius: 6, fillColor: '#fdb515', color: '#000', weight: 1, opacity: 1, fillOpacity: 0.9 };

  // Handle adding feature with temporary button feedback
  const handleAddFeature = (feature) => {
    onAddFeature(feature);
    setAddedIds(prev => [...prev, feature.properties.building_id || feature.properties.id]);
    setTimeout(() => {
      setAddedIds(prev => prev.filter(id => id !== (feature.properties.building_id || feature.properties.id)));
    }, 2000); // button stays green for 2s
  };

  // Markers
  const buildingMarkers = buildings
        //hide mis buildings
      .filter((feature)=> {
        const name = feature.properties.name?.toLowerCase() || "";
        return !(hiddenTypes.includes(name));
      })
      //show marker
      .map((feature, index) => {
        const center = getFeatureCenter(feature);
        if (!center) return null;

        const name = feature.properties.name || "building";
        const buildingId = feature.properties.building_id;
        const info = metadata[buildingId] || {};
        const desc = info.description || "No description available.";
        const defaultImage = "/assets/default.jpg";
        const imgHtml = info.image || `/assets/${buildingId}.jpg` || `/assets/default.jpg`;

        return(
          <Marker key={index} position={center}>
            <Popup maxWidth= {260}>
              <div style={{width: "240px", textAlign: "left"}}>
                <h3>{name}</h3>
                <img
                  src={imgHtml}
                  alt={name}
                  style={{
                    width : "100%",
                    height: "auto",
                    maxHeight: "120px", 
                    objectFit: "cover", borderRadius: "4px" }}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = defaultImage;
                  }}
                />
                <p style={{ marginTop: "8px" }}>{desc}</p>
                <button
                    onClick={() => onAddFeature(feature)}
                      style={{
                        marginTop: "8px",
                        padding: "6px 12px",
                        backgroundColor:" #6c757d",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                      
                >
                  + ADD
                </button>

                <button
                    onClick={() => onShowFloorplan(feature)}
                    style={{
                      marginTop: "8px",
                      marginLeft: "8px",
                      padding: "6px 12px",
                      backgroundColor:" #6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                >
                  View Floorplan
                </button>

              </div>
            </Popup>
          </Marker>
        )
      })
  
    // Bus Marker
  const busStopMarkers = busstops
    .map ((feature, index) => {
    const center = getFeatureCenter(feature);
    if (!center) return null;

    const name = feature.properties.name || "Bus Stop";
    const id = feature.properties.id;
    const isAdded = addedIds.includes(id);

    return (
      <Marker key={index} position={center}>
        <Popup maxWidth={220}>
          <h3>Bus Stop: {name}</h3>
          <button
            onClick={() => handleAddFeature(feature)}
            style={{
              marginTop: "8px",
              padding: "6px 12px",
              backgroundColor: isAdded ? "#28a745" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "background-color 0.3s ease"
            }}
          >
            {isAdded ? "✓ Added" : "+ ADD"}
          </button>
        </Popup>
      </Marker>
    );
  });

  return (
    <MapContainerStyled center={center} zoom={zoom} scrollWheelZoom={true}>
      <TileLayer
        url={darkMode ? darkTileLayer.url : lightTileLayer.url}
        attribution={darkMode ? darkTileLayer.attribution : lightTileLayer.attribution}
      />

      <GeoJSON
        data={buildings.filter(f => !hiddenTypes.includes(f.properties.name?.toLowerCase()))}
        style={() => ({ ...buildingStyle })}
      />

      <GeoJSON
        data={busstops}
        style={() => ({ ...busstopStyle })}
        pointToLayer={(feature, latlng) => L.circleMarker(latlng, busstopStyle)}
      />

      {buildingMarkers}
      {busStopMarkers}

      {selectedFeature && <ZoomFeature feature={selectedFeature} />}

      <GeoJSON data={highways} style={() => ({ ...highwayStyle })} />

      {route?.route_coords && (
        <Polyline
          positions={route.route_coords.map(([lng, lat]) => [lat, lng])}
          color="red"
          weight={5}
        />
      )}
    </MapContainerStyled>
  );


}
