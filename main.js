const data = require('./test_graph.json');
const fs = require('fs');

let x1 = 1, y1 = 1;
let x2 = 25, y2 = 10;

let array = data.features;

let removeIds = [];

array.forEach(feature => {
    if (feature.geometry.type === "Point") {
        let id = feature.properties.id;
        if (check(feature)) {
            removeIds.push(id);
        }
    }
});

data.features = data.features.filter(feature => {
    if (feature.geometry.type !== "MultiLineString") return true;

    return !removeIds.includes(feature.properties.startid) &&
           !removeIds.includes(feature.properties.endid);
});

// Write updated file
fs.writeFile("testresult.geojson", JSON.stringify(data), err => {
    if (err) console.log(err);
});

function check(feature) {
    const x = feature.geometry.coordinates[0];
    const y = feature.geometry.coordinates[1];
    return (x < x1 || x > x2 || y < y1 || y > y2);
}
