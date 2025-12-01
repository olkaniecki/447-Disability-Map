import { buildGraphFromGeojson, graphToAdj } from "./indoorGraph";
import { dijkstra, pathIdsToCoords } from "./indoorRouteSearch";

export function buildIndoorGraphFromFloors(floorGeojsonMap, opts = {}) {
    let combinedNodes = {};
    let combinedEdges = [];

    Object.entries(floorGeojsonMap).forEach(([floor, geojson]) => {
        const g = buildGraphFromGeojson(geojson, opts);
        Object.values(g.nodes).forEach(n => {
            const id = `${n.meta.buildingId}_F${floor}_${n.id}`;
            combinedNodes[id] = {
                ...n,
                id,
                meta: { ...n.meta, floor: floor, originalId: n.id }
            };
        });

        g.edges.forEach(e => {
            combinedEdges.push({
                ...e,
                a: `${e.a.meta.buildingId}_F${floor}_${e.a.id}`,
                b: `${e.b.meta.buildingId}_F${floor}_${e.b.id}`,
                meta: { ...e.meta, floor }
            });
        });
    });

    const adj = graphToAdj(combinedNodes, combinedEdges);
    return { nodes: combinedNodes, edges: combinedEdges, adj};
}

export function computeIndoorRoute(adj, nodes, startId, endId) {
    const res = dijkstra(adj, startId, endId);
    if (!res) return null;
    const coords = pathIdsToCoords(res.path, nodes).map(c => [c[1], c[0]]);
    return { path: res.path, coords, cost: res.dist };
}