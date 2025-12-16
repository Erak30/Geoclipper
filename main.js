const { create, all } = require('mathjs');
const math = create(all);
const fs = require('fs');

if (process.argv.length < 6) {
    console.error("Usage: node script.js <a0> <b0> <a1> <b1>");
    process.exit(1);
}

const a0 = parseFloat(process.argv[2]);
const b0 = parseFloat(process.argv[3]);
const a1 = parseFloat(process.argv[4]);
const b1 = parseFloat(process.argv[5]);

if ([a0, b0, a1, b1].some(v => isNaN(v))) {
    console.error("All bounding box values must be numbers");
    process.exit(1);
}

console.log(`Bounding box: x=[${a0},${b0}], y=[${a1},${b1}]`);

const data = require('./test_graph.json');
let original = data.features; 
let output = [];     
let newFeatures = []; 

let Point_id = 100000;
let MultiLineString_id = 1000000;
let removeIds = [];
for (const feature of original) {
    if (feature.geometry.type !== "Point") continue;
    const [x, y] = feature.geometry.coordinates;
    if (x < a0 || x > b0 || y < a1 || y > b1) {
        removeIds.push(feature.properties.id);
    }
}


for (const feature of original) {
    if (feature.geometry.type !== "MultiLineString") {
        output.push(feature);
        continue;
    }

    const sid = feature.properties.startid;
    const eid = feature.properties.endid;

    const startRemoved = removeIds.includes(sid);
    const endRemoved   = removeIds.includes(eid);

    if (!startRemoved && !endRemoved) {
        output.push(feature);
        continue;
    }

    if (startRemoved && endRemoved) {
        continue;
    }

    newFeatures.push(...clipSegment(feature));
}

data.features = [...output, ...newFeatures];
fs.writeFileSync("testresult.geojson", JSON.stringify(data, null, 2));
console.log("GeoJSON written to testresult.geojson");

function findPoint(id) {
    return original.find(f => f.geometry.type === "Point" && f.properties.id === id);
}

function clipSegment(feature) {
    const sid = feature.properties.startid;
    const eid = feature.properties.endid;

    const p0 = findPoint(sid);
    const p1 = findPoint(eid);

    const [x0, y0] = p0.geometry.coordinates;
    const [x1, y1] = p1.geometry.coordinates;

    const startInside = !(x0 < a0 || x0 > b0 || y0 < a1 || y0 > b1);

    let xInside, yInside, xOut, yOut, insideId, outsideId;

    if (startInside) {
        [xInside, yInside] = [x0, y0];
        [xOut, yOut]       = [x1, y1];
        insideId = sid;
        outsideId = eid;
    } else {
        [xInside, yInside] = [x1, y1];
        [xOut, yOut]       = [x0, y0];
        insideId = eid;
        outsideId = sid;
    }

    const inter = intersectWithBox(xInside, yInside, xOut, yOut);
    if (!inter) return [];

    const newPoint = createPoint(Point_id, inter.x, inter.y);
    const newMLS   = createMLS(insideId, Point_id, MultiLineString_id);

    Point_id++;
    MultiLineString_id++;

    return [newPoint, newMLS];
}

function intersectWithBox(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const tCandidates = [];

    if (dx !== 0) {
        let t = (a0 - x0) / dx; if (t >= 0 && t <= 1) tCandidates.push(t);
        t = (b0 - x0) / dx;     if (t >= 0 && t <= 1) tCandidates.push(t);
    }
    if (dy !== 0) {
        let t = (a1 - y0) / dy; if (t >= 0 && t <= 1) tCandidates.push(t);
        t = (b1 - y0) / dy;     if (t >= 0 && t <= 1) tCandidates.push(t);
    }

    for (const t of tCandidates) {
        const x = x0 + t * (x1 - x0);
        const y = y0 + t * (y1 - y0);
        if (x >= a0 && x <= b0 && y >= a1 && y <= b1) {
            return { x, y };
        }
    }
    return null;
}

function createPoint(id, x, y) {
    return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [x, y] },
        properties: { id, frame: "Map" }
    };
}

function createMLS(startid, endid, id) {
    return {
        type: "Feature",
        geometry: { type: "MultiLineString" },
        properties: { id, startid, endid, cost: 0, overridable: true }
    };
}
