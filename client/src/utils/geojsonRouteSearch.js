// src/utils/geojsonRouteSearch.js
import PathFinder from "geojson-path-finder";

function isElevator(entrance) {
  if (!entrance || !entrance.properties) return false;
  const p = entrance.properties;
  const name = (p.name || '').toString().toLowerCase();
  return p.type === 'elevator' || p.is_elevator || p.elevator === true || name.includes('elevator');
}

/**
 * Get the entrance coordinates for a building, excluding elevators
 */
function getBuildingEntrances(buildingId, entrance, metadata) {
  const ids = metadata[buildingId]?.entrances || [];
  return entrance.features
    .filter(f => ids.includes(f.properties.id) && !isElevator(f))
    .map(f => f.geometry.coordinates);
}


export function findRoute({startBuildingId, endBuildingId,  entrances,  highways,  busstops,  metadata}) {

  const validHighwayFeatures = highways.features.filter(f => {
    const s = f && f.properties && f.properties.status;
    if (s === false) return false;
    return true;
  });
  const validHighways = { type: 'FeatureCollection', features: validHighwayFeatures };

  const pathFinder = new PathFinder(validHighways);

  const startCoords = [];
  const endCoords = [];


  if (typeof startBuildingId === "string" && startBuildingId.startsWith("bus_")) {
    const bs = busstops.find(f => f.properties.id === startBuildingId);
    if (bs?.geometry?.coordinates) {
      startCoords.push(bs.geometry.coordinates);
    }
  }

  else if (metadata[startBuildingId]) {
    const startEntrances = getBuildingEntrances(startBuildingId, entrances, metadata);
    startCoords.push(...startEntrances);
  }




  if (typeof endBuildingId === "string" && endBuildingId.startsWith("bus_")) {
    const bs = busstops.find(f => f.properties.id === endBuildingId);
    if (bs?.geometry?.coordinates) {
      endCoords.push(bs.geometry.coordinates);
    }
  }

  else if (metadata[endBuildingId]) {
    const endEntrances = getBuildingEntrances(endBuildingId, entrances, metadata);
    endCoords.push(...endEntrances);
  }


    if (startCoords.length === 0 || endCoords.length === 0) {
      return null;
  }


  let bestPath = null;
  let usedStart = null;
  let usedEnd = null;

  for (const s of startCoords) {
    for (const e of endCoords) {
      const start = { type: "Feature", geometry: { type: "Point", coordinates: s } };
      const end = { type: "Feature", geometry: { type: "Point", coordinates: e } };
      const path = pathFinder.findPath(start, end);
      if (path && (!bestPath || path.weight < bestPath.weight)) {
        bestPath = path;
        usedStart = s;
        usedEnd = e;
      }
    }
  }

  if (!bestPath) {
    return null;
  }

  if (startCoords.length === 0 || endCoords.length === 0) {
  console.warn("No coords for start or end:", startCoords, endCoords);
  return null;
}


  const passedPoints = [];
  const tolerance = 0.00003;

  function isPointPassed(point) {
    const [lng, lat] = point;
    return bestPath.path.some(
      ([x, y]) => Math.abs(x - lng) < tolerance && Math.abs(y - lat) < tolerance
    );
  }
  


  return {
    start_building: startBuildingId,
    end_building: endBuildingId,
    route_coords: bestPath.path,
    start_point: usedStart,
    end_point: usedEnd,
    passed_Points: passedPoints,
    total_distance: bestPath.weight
  };
}

export function fixLooseConnections(geojson, tolerance = 3) {

  const features = geojson.features.filter(f =>
    f.geometry.type === "LineString" || f.geometry.type === "MultiLineString"
  );

  let endpoints = [];

  features.forEach((f, i) => {
    const geomType = f.geometry.type;
    let start, end;

    if (geomType === "MultiLineString") {
      const firstLine = f.geometry.coordinates[0];
      const lastLine  = f.geometry.coordinates[f.geometry.coordinates.length - 1];
      start = firstLine[0];
      end   = lastLine[lastLine.length - 1];
    }

    if (geomType === "LineString") {
      const coords = f.geometry.coordinates;
      start = coords[0];
      end   = coords[coords.length - 1];
    }

    endpoints.push({ pt: start, featureIndex: i, coordIndex: 0 });
    endpoints.push({ pt: end, featureIndex: i, coordIndex: 1 });
  });
}