
export function dijkstra(adj, startId, endId) {
    const dist = {};
    const prev = {};
    const visited = new Set();

    Object.keys(adj).forEach(k => { dist[k] = Infinity; prev[k] = null; });
    dist[startId] = 0;

    while (true) {
        let u = null, best = Infinity;
        for(const [k, d] of Object.entries(dist)) {
            if(visited.has(k)) continue;
            if(d < best) { best = d; u = k;}
        }
        if (u === null) break;
        if (u === endId) break;

        visited.add(u);
        for (const edge of adj[u] || []) {
            const alt = dist[u] + edge.w;
            if(alt < dist[edge.to]) {
                dist[edge.to] = alt;
                prev[edge.to] = u;
            }
        }
    }

    if (dist[endId] === Infinity) return null;
    const path = [];
    let cur = endId;
    while (cur) { path.push(cur); cur = prev[cur]; }
    path.reverse();
    
    return { path, distance: dist[endId]};
}

export function pathIdsToCoords(pathIds, nodes) {
    return pathIds.map(id => {
        const n = nodes[id];
        return n ? n.coord : null;
    }).filter(Boolean);
}