const fs = require("fs");

if (process.argv.length < 6) {
    console.error("Usage: node script.js <a0> <b0> <a1> <b1>");
    process.exit(1);
}

const a0 = parseFloat(process.argv[2]);
const b0 = parseFloat(process.argv[3]);
const a1 = parseFloat(process.argv[4]);
const b1 = parseFloat(process.argv[5]);

// if any of the a0, b0, a1, b1 elements are not a number, quit the program
if ([a0, b0, a1, b1].some(v => isNaN(v))) { 
    console.error("All bounding box values must be numbers");
    process.exit(1);
}

console.log(`Bounding box: x=[${a0},${b0}], y=[${a1},${b1}]`);

const dataPath = "/home/erak/nav2_ws/src/navigation2/nav2_bringup/graphs/input.geojson";
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
let original = data.features;
let output = [];
let newFeatures = [];

let Point_id = 100000;
let MultiLineString_id = 1000000;

let removeIds = [];
for (const feature of original) {
    if (feature.geometry.type !== "Point") continue;
    // if point coordinates are outside of bounding box, put it onto stack
    const [x, y] = feature.geometry.coordinates;
    if (x < a0 || x > b0 || y < a1 || y > b1) {
        removeIds.push(feature.properties.id);
    }
}

for (const feature of original) {
    //every point gets pushed to output, not every multilinestring
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

    // don't include in the final, if both points are outside of bounding box
    if (startRemoved && endRemoved) {
        continue;
    }

    // if either only the start point or only the end point is within the bounding box, go through with the clipsegment function
    if(startRemoved===true){
        newFeatures.push(...clipSegment(feature));
    }
}

data.features = [...output, ...newFeatures];
fs.writeFileSync("/home/erak/nav2_ws/install/nav2_bringup/share/nav2_bringup/graphs/output.geojson", JSON.stringify(data, null, 2));
console.log("GeoJSON written to output.geojson");
writeGoal();

// returns the entire element with a certain id
function findPoint(id) {
    return original.find(f => f.geometry.type === "Point" && f.properties.id === id);
}

function clipSegment(feature) {
    const sid = feature.properties.startid; // startid
    const eid = feature.properties.endid; // endid

    const p0 = findPoint(sid); // complete element of point, given id
    const p1 = findPoint(eid); // complete element of point, given id

    const [x0, y0] = p0.geometry.coordinates;
    const [x1, y1] = p1.geometry.coordinates;

    const startInside = !(x0 < a0 || x0 > b0 || y0 < a1 || y0 > b1); // start point is inside of bounding box

    let xInside, yInside, xOut, yOut, insideId, outsideId;

    // define which point is inside bounding box and which is outside of bounding box
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

    const newPoint = createPoint(Point_id, inter.x, inter.y); // create point for intersection
    newMultiLineString   = createMultiLineString(insideId, Point_id, MultiLineString_id); // create new linesegment with intersection point
    
    MultiLineString_id++;
    
    newMultiLineString2   = createMultiLineString(Point_id, insideId, MultiLineString_id); // create new linesegment with intersection point

    Point_id++;
    MultiLineString_id++;

    return [newPoint, newMultiLineString, newMultiLineString2];
}

// find intersections using parametric line equation
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
        properties: { id, frame: "map" }
    };
}

function createMultiLineString(startid, endid, id) {
    return {
        type: "Feature",
        geometry: { type: "MultiLineString" },
        properties: { id, startid, endid, cost: 0, overridable: true }
    };
}

function writeGoal(){
    let header = fs.readFileSync('/home/erak/vsc_ws/geoclipper/header.txt', 'utf8');
    let footer = fs.readFileSync('/home/erak/vsc_ws/geoclipper/footer.txt', 'utf8');


    // Filter points, excluding those in removeids
    let points = data.features
    .filter(feature => feature.geometry.type === "Point" && !removeIds.includes(feature.properties.id))
    .map(feature => feature.geometry.coordinates);

    // Convert consecutive points into line segments
    let segments = [];
    for (let i = 0; i < points.length - 1; i++) {
        segments.push([points[i], points[i + 1]]);
    }

    let coordText = segments
.map(seg =>`((${seg[0][0].toFixed(6)}, ${seg[0][1].toFixed(6)}), (${seg[1][0].toFixed(6)}, ${seg[1][1].toFixed(6)})),`)
        .join("\n");

    let output = `${header}\n${coordText}\n${footer}`;
    fs.writeFileSync("/home/erak/nav2_ws/src/navigation2/nav2_simple_commander/nav2_simple_commander/example_route.py", output);
}
