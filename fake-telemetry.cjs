// fake-telemetry.js
//
// Pretends to be the real ATS telemetry bridge (the thing that normally
// runs on ws://localhost:30001 and feeds live data from the game).
//
// Run this instead of having ATS open. The app will connect to it exactly
// the same way it connects to the real bridge, no code in the app needs
// to know the difference.
//
// Usage:   node fake-telemetry.js

const { WebSocketServer } = require("ws");

const PORT = 30001;
const wss = new WebSocketServer({ port: PORT });

// --- Pretend trip: Bakersfield -> Barstow, CA ---
// These are real in-game coordinates pulled from the bundled ATS map data.
const START = { x: -104377.03, z: 7675.39 }; // Bakersfield
const END = { x: -96117.31, z: 12381.85 }; // Barstow

const DESTINATION_CITY_ID = "barstow";
const DESTINATION_CITY_NAME = "Barstow";
const DESTINATION_COMPANY_ID = "flv_food_str"; // a common company sprite, exists near most cities
const DESTINATION_COMPANY_NAME = "Flavorfair";

let progress = 0; // 0 -> 1 along the fake route
let fuel = 650;
let gameMinutes = 8 * 60; // start at 08:00 in-game

console.log(`Fake telemetry server running on ws://localhost:${PORT}`);
console.log("Open your app and it will connect automatically.");

wss.on("connection", (socket) => {
    console.log("App connected to fake telemetry");

    const interval = setInterval(() => {
        // Move the fake truck a little further along the route each tick
        progress = Math.min(1, progress + 0.0015);

        const x = START.x + (END.x - START.x) * progress;
        const z = START.z + (END.z - START.z) * progress;

        const speedKph = 70 + Math.sin(progress * 40) * 15; // wobble a bit, feels alive
        fuel = Math.max(50, fuel - 0.02);
        gameMinutes += 0.1;

        const gameTime = new Date();
        gameTime.setUTCHours(0, Math.floor(gameMinutes), 0, 0);

        const packet = {
            paused: false,
            game: "ats",
            gameVersion: "1.50",
            telemetryVersion: "1.0",

            common: {
                mapScale: 19,
                gameTime: gameTime.toISOString(),
                nextRestStopMinutes: Math.max(0, 180 - progress * 180),
            },

            truck: {
                constants: {
                    fuelCapacity: 1000,
                    brand: "Kenworth",
                    name: "T680",
                },
                current: {
                    dashboard: {
                        fuelAmount: fuel,
                        averageConsumption: 0.35,
                        fuelRange: fuel / 0.35,
                        fuelWarning: fuel < 100,
                        currentGear: 8,
                        speedKph: speedKph,
                        speedMph: speedKph * 0.621371,
                        cruiseControlSpeedKph: 0,
                        cruiseControlSpeedMph: 0,
                        cruiseControlActive: false,
                        rpm: 1500,
                        odometer: 50000 + progress * 60,
                    },
                    lights: { parking: false, beamLow: true, beamHigh: false },
                    damage: {
                        engine: 0,
                        transmission: 0,
                        cabin: 0,
                        chassis: 0,
                        wheels: 0,
                    },
                    position: { x, y: 0, z },
                    heading: 0.5,
                    parkingBrake: false,
                },
                positioning: {},
            },

            trailers: [
                {
                    attached: true,
                    damage: { cargo: 0, wheels: 0, chassis: 0 },
                    position: { x, y: 0, z },
                    heading: 0.5,
                    brand: "Generic",
                    name: "Reefer",
                },
            ],

            job: {
                remainingDeliveryTime: new Date(
                    Date.now() + 1000 * 60 * 60 * 4,
                ).toISOString(),
                cargoLoaded: true,
                specialJob: false,
                jobType: "quick_job", // anything other than external_contracts/market keeps targeting simple
                cargo: { mass: 18000, name: "Frozen Food", cargoDamage: 0 },
                cityDestinationId: DESTINATION_CITY_ID,
                cityDestination: DESTINATION_CITY_NAME,
                companyDestinationId: DESTINATION_COMPANY_ID,
                companyDestination: DESTINATION_COMPANY_NAME,
                citySourceId: "bakersfield",
                citySource: "Bakersfield",
                companySourceId: DESTINATION_COMPANY_ID,
                companySource: DESTINATION_COMPANY_NAME,
                income: 1500,
            },

            navigation: {
                distance: (1 - progress) * 45.2,
                time: (1 - progress) * 35,
                speedLimitKph: 105,
                speedLimitMph: 65,
            },

            specialEvents: {
                onJob: true,
                jobCancelled: false,
                jobDelivered: false,
                fined: false,
                tollgate: false,
                ferry: false,
                train: false,
            },

            gamePlayEvents: {
                ferryData: { payAmount: 0, sourceName: "", targetName: "" },
                finedData: { payAmount: 0, offence: "" },
                jobCancelledPenalty: 0,
                jobDelivered: {
                    autoLoaded: false,
                    autoParker: false,
                    cargoDamage: 0,
                    deliveryTime: new Date().toISOString(),
                    distanceKm: 0,
                    earnedXp: 0,
                    revenue: 0,
                },
                tollgatePayment: 0,
                trainData: { payAmount: 0, sourceName: "", targetName: "" },
            },
        };

        if (socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify(packet));
        }

        if (progress >= 1) {
            progress = 0; // loop the trip so you can keep testing
        }
    }, 500);

    socket.on("close", () => {
        console.log("App disconnected");
        clearInterval(interval);
    });
});
