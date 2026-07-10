import type { Map as MapLibreGl, StyleSpecification } from "maplibre-gl";
import { BlobSource } from "~/assets/utils/shared/BlobSource";

export async function initializeMap(
    container: HTMLElement,
): Promise<MapLibreGl> {
    const { settings, activeSettings } = useSettings();

    const baseUrl = window.location.origin;

    const maplibregl = (await import("maplibre-gl")).default;
    const { Protocol, PMTiles } = await import("pmtiles");

    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    async function loadPmtiles(fileName: string, key: string) {
        const url = `${window.location.origin}/data/${settings.value.selectedGame}/map-data/tiles/${fileName}.mp3`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load ${fileName}`);

            const blob = await response.blob();
            const pmtilesInstance = new PMTiles(new BlobSource(blob, key));
            protocol.add(pmtilesInstance);

            console.log(
                `Successfully loaded ${fileName} into memory (${(blob.size / 1024 / 1024).toFixed(2)} MB)`,
            );
        } catch (error) {
            console.error("Error loading PMTiles blob:", error);
        }
    }

    await Promise.all([
        loadPmtiles("roads", "roads"),
        loadPmtiles("map-data-combined", "all-data"),
    ]);

    const style: StyleSpecification = {
        version: 8,

        name: "PMTiles (local)",
        sources: {
            [`${settings.value.selectedGame}`]: {
                type: "vector",
                url: `pmtiles://roads`,
            },
        },

        sprite: `${baseUrl}/sprites/${settings.value.selectedGame}/sprites`,
        glyphs: `${baseUrl}/glyphs/{fontstack}/{range}.pbf`,

        layers: [
            {
                id: "background",
                type: "background",
                paint: { "background-color": "#c0e4a6" },
            },
            {
                id: "lines",
                type: "line",
                source: `${settings.value.selectedGame}`,
                "source-layer": `${settings.value.selectedGame}`,
                paint: {
                    "line-color": "#b3b5b9",
                    "line-width": 2,
                },
            },
        ],
    };

    const gameMap = {
        ets: {
            container,
            style,
            center: [10, 50],
            zoom: 6,
            minZoom: 5,
            maxZoom: 13,
            maxPitch: 60,
            fadeDuration: 0,
            attributionControl: false,
            collectResourceTiming: false,
            maxBounds: [
                [-28, 25], // [[west, south]
                [50, 74], // [east, north]]
            ],
        },

        ats: {
            container,
            style,
            center: [-115, 40],
            zoom: 6,
            minZoom: 5,
            maxZoom: 13,
            maxPitch: 60,
            fadeDuration: 0,
            attributionControl: false,
            collectResourceTiming: false,
            maxBounds: [
                [-130, 23], // SW
                [-60, 55], // NE
            ],
        },
    };

    const selectedMap =
        settings.value.selectedGame === "ets2" ? gameMap.ets : gameMap.ats;
    const map = new maplibregl.Map(selectedMap as maplibregl.MapOptions);

    map.on("error", (e) => {
        console.error(">>> MAP ERROR EVENT:", e);
        if (e.error) {
            console.error("   Message:", e.error.message);
            console.error("   Stack:", e.error.stack);
        }
        // @ts-ignore
        if (e.sourceId) console.error("  Failing Source:", e.sourceId);
        // @ts-ignore
        if (e.tile) console.error("  Failing Tile:", e.tile);
    });

    //// =================> LATER ATS UPDATE <=================

    map.on("load", async () => {
        map.addSource("all-data", {
            type: "vector",
            url: "pmtiles://all-data",
        });

        // CITY BOUNDARIES (generated from cities.json's area boxes, see
        // generate-city-boundaries.cjs). Inserted just above the background
        // and below every other layer, so roads/water/parking still draw
        // correctly on top of it instead of being covered.
        map.addSource("city-boundaries", {
            type: "geojson",
            data: `${baseUrl}/data/${settings.value.selectedGame}/map-data/city-boundaries.geojson`,
        });

        map.addLayer(
            {
                id: "city-boundaries",
                type: "fill",
                source: "city-boundaries",
                paint: {
                    "fill-color": "#ece7d8",
                    "fill-opacity": 0.9,
                },
            },
            "lines",
        );

        ////
        //// LAYERS FOR DISPLAYING
        //// FROM SOURCES
        ////
        // OUTLINE
        map.addLayer({
            id: "water-outline",
            type: "line",
            source: "all-data",
            "source-layer": "water",
            paint: {
                "line-color": "#5cb8d6",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    5,
                    7,
                    10,
                    4,
                ],
                "line-opacity": 0.6,
            },
        });

        // WATER
        map.addLayer({
            id: "water",
            type: "fill",
            source: "all-data",
            "source-layer": "water",
            paint: {
                "fill-color": "#8ddbf6",
                "fill-opacity": 0.85,
            },
        });

        // THICK ROADS
        map.addLayer({
            id: "roads",
            type: "line",
            source: `${settings.value.selectedGame}`,
            "source-layer": `${settings.value.selectedGame}`,
            layout: {
                "line-join": ["step", ["zoom"], "miter", 8, "round"],
                "line-cap": ["step", ["zoom"], "butt", 8, "round"],
            },
            paint: {
                "line-color": "#b3b5b9",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    5,
                    0.5,
                    9,
                    2,
                    10,
                    6,
                    11,
                    9,
                ],
                "line-opacity": 1,
            },
        });

        // POLYGONS FOR PARKING ETC
        map.addLayer(
            {
                id: "maparea-zones",
                type: "fill",
                source: "all-data",
                "source-layer": "mapareas",
                paint: {
                    "fill-color": "#fef5e1",
                    "fill-opacity": 0.7,
                },
            },
            "lines",
        );

        // PREFABS FOR SERVICE AREAS     ETC
        map.addLayer(
            {
                id: "prefab-zones",
                type: "fill",
                source: "all-data",
                "source-layer": "prefabs",
                paint: {
                    "fill-color": "#fef5e1",
                },
                minzoom: 5,
            },
            "lines",
        );

        // DISPLAYING VILLAGE NAMES
        map.addLayer({
            id: "village-labels",
            type: "symbol",
            source: "all-data",
            "source-layer": "ets2villages",
            layout: {
                "text-field": ["get", "name"],
                "text-font": [activeSettings.value.fontFamily],
                "text-size": 13,
                "text-anchor": "center",
                "text-offset": [0, 0],
                "text-allow-overlap": true,
                "text-ignore-placement": true,
            },
            paint: {
                "text-color": "#3a3a3c",
                "text-halo-color": "#ffffff",
                "text-halo-width": 1,
            },
            minzoom: 8.2,
        });

        // DISPLAYING COUNTRY DELIMITATIONS
        map.addLayer(
            {
                id: "country-borders",
                type: "line",
                source: "all-data",
                "source-layer": "countries",
                paint: {
                    "line-color": "#c8c0ad",
                    "line-width": 2,
                    "line-opacity": 0.6,
                },
            },
            "lines",
        );

        // DISPLAYING STATE DELIMITATIONS
        map.addLayer(
            {
                id: "state-borders",
                type: "line",
                source: "all-data",
                "source-layer": "states",
                paint: {
                    "line-color": "#c8c0ad",
                    "line-width": 2,
                    "line-opacity": 0.6,
                },
            },
            "lines",
        );

        // ALL SPRITE SHEETS
        map.addLayer({
            id: "all-sprites",
            type: "symbol",
            source: "all-data",
            "source-layer": "spritelocations",
            filter: ["!=", ["get", "poiType"], "road"],
            minzoom: 8,
            layout: {
                "icon-image": ["get", "sprite"],
                "icon-size": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    7,
                    0.7,
                    10,
                    1.5,
                ],
                "icon-allow-overlap": false,
                "symbol-sort-key": [
                    "match",
                    ["get", "sprite"],
                    "gas_ico",
                    1,
                    "service_ico",
                    2,
                    10,
                ],
                "symbol-placement": "point",
            },
        });

        // ROAD POI TYPE
        map.addLayer({
            id: "road-sprites",
            type: "symbol",
            source: "all-data",
            "source-layer": "spritelocations",
            filter: ["==", ["get", "poiType"], "road"],
            minzoom: 8,
            layout: {
                "icon-image": ["get", "sprite"],
                "icon-size": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    7,
                    0.6,
                    10,
                    0.9,
                ],
                "icon-allow-overlap": true,
                "symbol-placement": "point",
            },
        });

        // DISPLAYING CITY NAMES
        map.addLayer({
            id: "city-labels",
            type: "symbol",
            source: "all-data",
            "source-layer": "cities",
            filter: ["!=", ["get", "capital"], 2],
            layout: {
                "text-field": ["get", "name"],
                "text-font": [activeSettings.value.fontFamily],
                "text-size": 15,
                "text-anchor": "bottom",
                "text-offset": [0, -0.3],
                "text-allow-overlap": true,
                "text-ignore-placement": true,
            },
            paint: {
                "text-color": "#1c1c1e",

                "text-halo-color": "#ffffff",
                "text-halo-width": 1.1,
            },
            minzoom: 6,
            maxzoom: 8,
        });

        // DISPLAYING CAPITAL NAMES
        map.addLayer({
            id: "capital-major-labels",
            type: "symbol",
            filter: ["==", ["get", "capital"], 2],
            source: "all-data",
            "source-layer": "cities",
            layout: {
                "text-field": ["get", "name"],
                "text-size": 18,
                "text-font": [activeSettings.value.fontFamily],
                "text-anchor": "bottom",
                "text-offset": [0, -0.3],
                "text-allow-overlap": true,
                "text-ignore-placement": true,
            },
            paint: {
                "text-color": "#1c1c1e",
                "text-halo-color": "#ffffff",
                "text-halo-width": 1.2,
            },

            minzoom: 6,
            maxzoom: 8,
        });

        // DISPLAYING COUNTRY NAMES
        map.addLayer({
            id: "country-labels",
            type: "symbol",
            source: "all-data",
            "source-layer": "countrynames",
            layout: {
                "text-field": ["get", "name"],
                "text-size": 20,
                "text-font": [activeSettings.value.fontFamily],
                "text-anchor": "bottom",
                "text-offset": [0, -0.3],
                "text-allow-overlap": true,
                "text-ignore-placement": true,
            },
            paint: {
                "text-color": "#1c1c1e",
                "text-halo-color": "#ffffff",
                "text-halo-width": 1.2,
                "text-opacity": 0.6,
            },
            minzoom: 5,
            maxzoom: 6,
        });
    });

    return map;
}
