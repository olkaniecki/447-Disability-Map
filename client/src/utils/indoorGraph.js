let idCounter = 0;
function nextId(prefix = 'n') { return `${prefix}_${++idCounter}`; }

function euclidean(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Builds a graph from indoor GeoJSON data.
 * Supports corridors (MultiLineString) and point features (doors, elevators, stairs).
 */
export function buildGraphFromGeojson(geojson, opts = {}) {
  const maxConnectDist = opts.maxConnectDist ?? 40;

  // Corridors (MultiLineString)
  const corridors = geojson.features.filter(
    f => f.properties?.feature_type === 'corridor' && f.geometry.type === 'MultiLineString'
  );

  // Points (doors, elevators, stairs, etc.)
  const points = geojson.features.filter(
    f => ['door', 'elevator', 'stairs'].includes(f.properties?.feature_type) && f.geometry.type === 'Point'
  );

  const nodes = {};
  const edges = [];

  // --- Corridors ---
  corridors.forEach((c, ci) => {
    const coords = c.geometry.coordinates;
    let prevId = null;

    coords.forEach((pt, i) => {
      const nodeId = nextId('c');
      nodes[nodeId] = {
        id: nodeId,
        coord: pt.slice(),
        meta: { corridorIndex: ci, vertexIndex: i }
      };

      if (prevId) {
        const w = euclidean(nodes[prevId].coord, pt);
        edges.push({ u: prevId, v: nodeId, w });
        edges.push({ u: nodeId, v: prevId, w });
      }

      prevId = nodeId;
    });
  });

  // --- Point Features ---
  points.forEach((f, i) => {
    const nodeId = nextId('p');
    nodes[nodeId] = {
      id: nodeId,
      coord: f.geometry.coordinates.slice(),
      meta: { ...f.properties }  // copies feature_type, floor, etc.
    };

    // Connect to nearest node within maxConnectDist
    let best = null;
    Object.values(nodes).forEach(n => {
      if (n.id === nodeId) return;
      const dist = euclidean(n.coord, nodes[nodeId].coord);
      if (dist <= maxConnectDist && (!best || dist < best.dist)) best = { node: n, dist };
    });

    if (best) {
      edges.push({ u: nodeId, v: best.node.id, w: best.dist });
      edges.push({ u: best.node.id, v: nodeId, w: best.dist });
    }
  });

  return { nodes, edges };
}

export function graphToAdj(nodes, edges) {
  const adj = {};

  // Initialize adjacency list for each node
  Object.keys(nodes).forEach(k => (adj[k] = []));

  edges.forEach(e => {
    // Only add if both nodes exist
    if (adj[e.u] && nodes[e.v]) {
      adj[e.u].push({ to: e.v, w: e.w });
    } else {
      console.warn("Skipping edge with missing node:", e);
    }
  });

  return adj;
}



