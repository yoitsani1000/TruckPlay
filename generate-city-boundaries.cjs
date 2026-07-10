// generate-city-boundaries.cjs
//
// For every city, keeps only the area trigger boxes from cities.json that
// fall within a population-scaled radius of the city's real center, then
// takes the convex hull of the corners of whatever survives.
//
// Usage:
//   node generate-city-boundaries.cjs ats
//   node generate-city-boundaries.cjs ets2
//   node generate-city-boundaries.cjs        (does both)

const fs = require("fs");
const path = require("path");

// Same flat-canvas formula as app/assets/utils/map/converters.ts
const MERCATOR_R = 300000.0;

function convertAtsToGeo(gameX, gameY) {
    const lon = (gameX / MERCATOR_R) * (180.0 / Math.PI);
    const y_merc = -gameY / MERCATOR_R;
    const latRad = 2.0 * Math.atan(Math.exp(y_merc)) - Math.PI / 2.0;
    const lat = latRad * (180.0 / Math.PI);
    return [lon, lat];
}

function convertEts2ToGeo(gameX, gameZ) {
    const lon = (gameX / MERCATOR_R) * (180.0 / Math.PI);
    const y_merc = -gameZ / MERCATOR_R;
    const latRad = 2.0 * Math.atan(Math.exp(y_merc)) - Math.PI / 2.0;
    const lat = latRad * (180.0 / Math.PI);
    return [lon, lat];
}

// Tunable: fraction of a city's area boxes to drop, ranked by distance
// from the city's center, farthest first. 0.2 means drop the farthest 20%.
const DROP_FRACTION = 0.2;

// --- Convex hull (Andrew's monotone chain), no extra dependency needed ---

function cross(o, a, b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function convexHull(points) {
    const pts = points
        .slice()
        .sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));

    if (pts.length < 3) return pts;

    const lower = [];
    for (const p of pts) {
        while (
            lower.length >= 2 &&
            cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
        ) {
            lower.pop();
        }
        lower.push(p);
    }

    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        while (
            upper.length >= 2 &&
            cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
        ) {
            upper.pop();
        }
        upper.push(p);
    }

    upper.pop();
    lower.pop();
    return lower.concat(upper);
}

// --- Core logic ---

function boxCorners(area) {
    const halfW = area.width / 2;
    const halfH = area.height / 2;
    const x = area.x;
    const y = area.y;

    return [
        [x - halfW, y - halfH],
        [x + halfW, y - halfH],
        [x + halfW, y + halfH],
        [x - halfW, y + halfH],
    ];
}

function buildCityHull(city, convertToGeo) {
    const withDistance = city.areas.map((area) => ({
        area,
        dist: Math.hypot(area.x - city.x, area.y - city.y),
    }));
    withDistance.sort((a, b) => a.dist - b.dist);

    const dropCount = Math.round(withDistance.length * DROP_FRACTION);
    const keepCount = Math.max(1, withDistance.length - dropCount);
    const boxesToUse = withDistance.slice(0, keepCount).map((d) => d.area);

    const allCorners = boxesToUse.flatMap((area) => boxCorners(area));
    const hull = convexHull(allCorners);

    if (hull.length < 3) return null;

    const geoRing = hull.map(([gameX, gameY]) => convertToGeo(gameX, gameY));
    geoRing.push(geoRing[0]);

    return [geoRing];
}

function processGame(game, rootDir) {
    const inputPath = path.join(
        rootDir,
        "public",
        "data",
        game,
        "map-data",
        "cities.json",
    );

    if (!fs.existsSync(inputPath)) {
        console.warn(`Skipping ${game}, no cities.json found at ${inputPath}`);
        return;
    }

    const cities = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
    const convertToGeo = game === "ats" ? convertAtsToGeo : convertEts2ToGeo;

    console.log(`Processing ${cities.length} cities for ${game}...`);

    const features = [];
    let skipped = 0;

    for (const city of cities) {
        if (!city.areas || city.areas.length === 0) {
            skipped++;
            continue;
        }

        const polygon = buildCityHull(city, convertToGeo);
        if (!polygon) {
            skipped++;
            continue;
        }

        features.push({
            type: "Feature",
            properties: {
                token: city.token,
                name: city.name,
                population: city.population,
            },
            geometry: {
                type: "Polygon",
                coordinates: polygon,
            },
        });
    }

    const geojson = { type: "FeatureCollection", features };

    const outputPath = path.join(
        rootDir,
        "public",
        "data",
        game,
        "map-data",
        "city-boundaries.geojson",
    );

    fs.writeFileSync(outputPath, JSON.stringify(geojson));
    console.log(
        `Wrote ${features.length} city boundaries to ${outputPath} (skipped ${skipped})`,
    );
}

function main() {
    const rootDir = process.cwd();
    const gameArg = process.argv[2];

    if (gameArg === "ats" || gameArg === "ets2") {
        processGame(gameArg, rootDir);
    } else {
        processGame("ats", rootDir);
        processGame("ets2", rootDir);
    }
}

main();
