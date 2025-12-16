const { create, all } = require('mathjs');
const math = create(all);

const data = require('./test_graph.json');
const fs = require('fs');

let a0 = 1, a1 = 1;
let b0 = 10, b1 = 10;
let Point_id = 100000;
let MultiLineString_id = 1000000;
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
    if (removeIds.includes(feature.properties.startid)){
        if (!removeIds.includes(feature.properties.endid)){
            create_segment(feature);
        }        
        return false;        
    }
    if (removeIds.includes(feature.properties.endid)){
        if (!removeIds.includes(feature.properties.startid)){
            create_segment(feature);
        }
        return false;        
    }
    return true;
});

// Write updated file
fs.writeFile("testresult.geojson", JSON.stringify(data), err => {
    if (err) console.log(err);
});

function check(feature) {
    const x = feature.geometry.coordinates[0];
    const y = feature.geometry.coordinates[1];
    return (x < a0 || x > b0 || y < a1 || y > b1);
}

function create_segment(feature){
    x = -999;
    y = -999;
    const x0 = array[find_point_index(feature.properties.startid)].geometry.coordinates[0];
    const x1 = array[find_point_index(feature.properties.endid)].geometry.coordinates[0];    
    const y0 = array[find_point_index(feature.properties.startid)].geometry.coordinates[1];
    const y1 = array[find_point_index(feature.properties.endid)].geometry.coordinates[1];      
    const m = (y1 - y0) / (x1 - x0);
    const b = y0 - m * x0;
    if(x0 < a0 || x1 < a0){
        const coefficients = [
            [-m,1],
            [1,0]
        ]
        constants = [b,a0];
        solutions = math.lusolve(coefficients,constants);
        if(a1 < solutions[1][0] < b1){
            x = solutions[0][0];
            y = solutions[1][0];
        }
    }
    if((x0 > b0 || x1 > b0) && x===-999){
        const coefficients = [
            [-m,1],
            [1,0]
        ]
        constants = [b,b0];
        solutions = math.lusolve(coefficients,constants);
        if(a1 < solutions[1][0] < b1){
            x = solutions[0][0];
            y = solutions[1][0];
        }
    }
    if((y0 < a1 || y1 < a1) && x===-999){
        const coefficients = [
            [-m,1],
            [0,1]
        ]
        constants = [b,a1];
        solutions = math.lusolve(coefficients,constants);
        if(a0 < solutions[0][0] < b0){
            x = solutions[0][0];
            y = solutions[1][0];
        }
    }
    if((y0 > b1 || y1 > b1) && x===-999){
        const coefficients = [
            [-m,1],
            [0,1]
        ]
        constants = [b,b1];
        solutions = math.lusolve(coefficients,constants);
        if(a0 < solutions[0][0] < b0){
            x = solutions[0][0];
            y = solutions[1][0];
        }
    }
    const Point = createPointFeature(Point_id, x, y);
    array.push(Point);
    MultiLineString = createMultiLineStringFeature(Point_id,feature.properties.endid,MultiLineString_id);    
    if(x0 < a0 || x0 > b0 || y0 < a1 || y0 > b1){
        MultiLineString = createMultiLineStringFeature(Point_id,feature.properties.startid,MultiLineString_id);
    }
    array.push(MultiLineString);
    Point_id++;
    MultiLineString_id++;    
}

function find_point_index(id) {
    return array.findIndex(feature =>
        feature.geometry.type === "Point" &&
        feature.properties.id === id
    );
}

function createPointFeature(id, x, y) {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [x, y]
    },
    properties: {
      frame: "Map",
      id
    }
  };
}

function createMultiLineStringFeature(startid,endid,id){
    return {
        type: "Feature",
        geometry: {
            type: "MultiLineString"
        },
        properties: {
            cost: 0,
            endid,
            id,
            overridable: true,
            startid
        }
    }
}
