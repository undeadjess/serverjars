const mysql = require("mysql2/promise");

const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;
const updateInterval = process.env.UPDATE_INTERVAL || 3600000; // 1 hour

const pool = mysql.createPool({
    connectionLimit: 10,
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
});

const serverTypes = ["vanilla", "paper", "purpur", "fabric"];

async function getVanillaServerURLs() {
    console.log(
        "[getMinecraftServerURLs] Fetching Minecraft versions and server URLs"
    );

    try {
        const versionsResponse = await fetch(
            "https://launchermeta.mojang.com/mc/game/version_manifest.json"
        );
        const versionsData = await versionsResponse.json();

        const mcversions = versionsData.versions.filter(
            (version) => version.type === "release"
        );

        const fetchPromises = mcversions.map(async (version) => {
            try {
                const response = await fetch(version.url);
                const data = await response.json();
                return {
                    version: version.id,
                    downloadURL: data.downloads.server?.url,
                }; // Optional chaining
            } catch (error) {
                console.log(
                    `[getMinecraftServerURLs] error getting ${version.url}:`,
                    error
                );
                return null;
            }
        });

        const results = await Promise.all(fetchPromises);
        const validResults = results.filter((result) => result !== null);

        console.log(
            "[getMinecraftServerURLs] Finished fetching Minecraft server URLs"
        );
        return validResults;
    } catch (error) {
        console.log("[getMinecraftServerURLs] error:", error);
        return []; // Return an empty array on error
    }
}

// paper
async function getPaperServerURLs() {
    // data structure: {version: "1.16.4", builds: [{build: 1, downloadURL: "something"}, {build: 2, downloadURL: "somethingelse"}]}
    const paperServerURLs = [];
    const paperURL = "https://api.papermc.io/v2/projects/paper";
    console.log("[getPaperServerURLs] Fetching Paper Server URLs");

    try {
        const response = await fetch(paperURL);
        const data = await response.json();
        const fetchPromises = data.versions.map(async (version) => {
            const fetchedBuilds = await fetch(
                `https://api.papermc.io/v2/projects/paper/versions/${version}`
            );
            const builds = (await fetchedBuilds.json()).builds;

            const buildsData = builds.map((build) => ({
                build: build,
                downloadURL: `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${build}/downloads/paper-${version}-${build}.jar`,
            }));

            return { version: version, builds: buildsData };
        });

        const results = await Promise.all(fetchPromises);
        paperServerURLs.push(...results);

        console.log("[getPaperServerURLs] Finished Fetching Paper Server URLs");
    } catch (error) {
        console.error("[getPaperServerURLs] Error: ", error);
    }

    return paperServerURLs;
}

// purpur
async function getPurpurServerURLs() {
    const purpurServerURLs = [];
    const purpurURL = "https://api.purpurmc.org/v2/purpur";
    console.log("[getPurpurServerURLs] Fetching Purpur Server URLs");

    try {
        const response = await fetch(purpurURL);
        const data = await response.json();
        const purpurVersions = data.versions;

        const fetchPromises = purpurVersions.map(async (version) => {
            const fetchedBuilds = await fetch(
                `https://api.purpurmc.org/v2/purpur/${version}`
            );
            const builds = (await fetchedBuilds.json()).builds.all;

            const buildsData = builds.map((buildNumber) => ({
                build: buildNumber,
                downloadURL: `https://api.purpurmc.org/v2/purpur/${version}/${buildNumber}/download`,
            }));

            return { version: version, builds: buildsData };
        });

        const results = await Promise.all(fetchPromises);
        purpurServerURLs.push(...results);

        console.log("[getPaperServerURLs] Finished Fetching Paper Server URLs");
    } catch (error) {
        console.error("[getPaperServerURLs] Error: ", error);
    }

    return purpurServerURLs;
}

// spigot
// Potential DMCA issues exist - see https://github.com/github/dmca/blob/master/2014/2014-09-05-CraftBukkit.md
// Complicated - need to build the server jar
async function getSpigotServerURLs() {
    return null;
}

// bukkit
// Potential DMCA issues exist - see https://github.com/github/dmca/blob/master/2014/2014-09-05-CraftBukkit.md
// Complicated - need to build the server jar
async function getBukkitServerURLs() {
    return null;
}

// forge
// Complicated - need to build the server jar
async function getForgeServerURLs() {
    return null;
}

// fabric
async function getFabricServerURLs() {
    // https://meta.fabricmc.net/v2/versions/loader/1.21.1/0.16.5/1.0.1/server/jar
    // https://meta.fabricmc.net/v2/versions/loader/<Minecraft Version>/<Fabric Loader Version>/<Installer Version>/server/jar

    const fabricServerURLs = [];
    const fabricURL = "https://meta.fabricmc.net/v2/versions/loader";
    console.log("[getFabricServerURLs] Fetching Fabric Server URLs");

    // we will always want the latest installer version...
    async function getLatestInstallerVersion() {
        // https://meta.fabricmc.net/v2/versions/installer
        const installerURL = "https://meta.fabricmc.net/v2/versions/installer";
        try {
            const response = await fetch(installerURL);
            const data = await response.json();
            return data[0].version; // Return the latest installer version
        } catch (error) {
            console.error(
                "[getFabricServerURLs] Error fetching installer version:",
                error
            );
            return null; // Return null if there's an error
        }
    }

    // need to get the game versions supported by fabric
    async function getSupportedStableMinecraftVersions() {
        // https://meta.fabricmc.net/v2/versions/game
        const gameURL = "https://meta.fabricmc.net/v2/versions/game";
        const supportedMinecraftVersions = [];
        try {
            const response = await fetch(gameURL);
            const data = await response.json();
            data.map((version) => {
                // check that stable is true
                if (version.stable) {
                    supportedMinecraftVersions.push(version.version);
                }
            });
        } catch (error) {
            console.error(
                "[getFabricServerURLs] Error fetching supported Minecraft versions:",
                error
            );
            return null; // Return null if there's an error
        }
        return supportedMinecraftVersions;
    }

    // get fabric loader versions
    async function getFabricLoaderVersions() {
        // https://meta.fabricmc.net/v2/versions/loader
        const loaderURL = "https://meta.fabricmc.net/v2/versions/loader";
        const fabricLoaderVersions = [];

        try {
            const response = await fetch(loaderURL);
            const data = await response.json();
            data.map((version) => {
                fabricLoaderVersions.push(version.version);
            });
        } catch (error) {
            console.error(
                "[getFabricServerURLs] Error fetching Fabric Loader versions:",
                error
            );
            return null; // Return null if there's an error
        }
        return fabricLoaderVersions.sort();
    }

    try {
        const installerVersion = await getLatestInstallerVersion();
        const supportedMinecraftVersions =
            await getSupportedStableMinecraftVersions();
        const fabricLoaderVersions = await getFabricLoaderVersions();

        // for each supported version, get the server jar
        for (const minecraftVersion of supportedMinecraftVersions) {
            // data structure: {version: "1.16.4", builds: [{build: 1, fabricLoaderVersion: "something", downloadURL: "something"}]}
            const fabricServerURLsForVersion = [];

            // filter out any loader versions below 0.12
            filteredFabricLoaderVersions = fabricLoaderVersions
                .map((version) => {
                    // split the version string into an array of numbers
                    const versionNumbers = version.split(".").map(Number);
                    // discard any array items after the first 2
                    versionNumbers.length = 2; //maybe redundant?
                    // check if the second number is less than 12, else return the version
                    if (versionNumbers[1] < 12) {
                        return;
                    } else {
                        return version;
                    }
                })
                // remove any undefined values
                .filter(Boolean);

            // construct the download URL for each loader version and add it to the array
            for (const fabricLoaderVersion of filteredFabricLoaderVersions) {
                const downloadURL = `https://meta.fabricmc.net/v2/versions/loader/${minecraftVersion}/${fabricLoaderVersion}/${installerVersion}/server/jar`;

                fabricServerURLsForVersion.push({
                    build: fabricLoaderVersion,
                    downloadURL: downloadURL,
                });
            }
            fabricServerURLs.push({
                version: minecraftVersion,
                builds: fabricServerURLsForVersion,
            });
        }

        console.log(
            "[getFabricServerURLs] Finished Fetching Fabric Server URLs"
        );
    } catch (error) {
        console.error("[getFabricServerURLs] Error: ", error);
    }

    return fabricServerURLs;
}

async function updateDatabase() {
    console.log("[updateDatabase] updating database");

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // batch insert for server types
        let serverTypeQueries = serverTypes.map((server) => [server]);
        if (serverTypeQueries.length > 0) {
            await connection.query(
                "INSERT INTO server_types (type) VALUES ? ON DUPLICATE KEY UPDATE type = type",
                [serverTypeQueries]
            );
        }

        // add all the urls and builds for all the different server types
        // vanilla - has no builds
        const vanillaServerURLs = await getVanillaServerURLs();
        let vanillaQueries = vanillaServerURLs.map((server) => [
            server.version,
            server.downloadURL,
        ]);
        if (vanillaQueries.length > 0) {
            await connection.query(
                "INSERT INTO vanilla (version, download_url) VALUES ? ON DUPLICATE KEY UPDATE download_url = VALUES(download_url)",
                [vanillaQueries]
            );
        }

        // Paper servers with builds
        const paperServerURLs = await getPaperServerURLs();
        let paperQueries = [];
        paperServerURLs.forEach((server) => {
            server.builds.forEach((build) => {
                paperQueries.push([
                    server.version,
                    build.build,
                    build.downloadURL,
                ]);
            });
        });

        // check that there wernt any problems
        if (paperQueries.length > 0) {
            await connection.query(
                "INSERT INTO paper (version, build, download_url) VALUES ? ON DUPLICATE KEY UPDATE download_url = VALUES(download_url)",
                [paperQueries]
            );
        }

        // Purpur servers with builds
        const purpurServerURLs = await getPurpurServerURLs();
        let purpurQueries = [];
        purpurServerURLs.forEach((server) => {
            server.builds.forEach((build) => {
                purpurQueries.push([
                    server.version,
                    build.build,
                    build.downloadURL,
                ]);
            });
        });

        if (purpurQueries.length > 0) {
            await connection.query(
                "INSERT INTO purpur (version, build, download_url) VALUES ? ON DUPLICATE KEY UPDATE download_url = VALUES(download_url)",
                [purpurQueries]
            );
        }

        // Fabric servers with builds
        const fabricServerURLs = await getFabricServerURLs();
        let fabricQueries = [];
        fabricServerURLs.forEach((server) => {
            server.builds.forEach((build) => {
                fabricQueries.push([
                    server.version,
                    build.build,
                    build.downloadURL,
                ]);
            });
        });

        if (fabricQueries.length > 0) {
            await connection.query(
                "INSERT INTO fabric (version, build, download_url) VALUES ? ON DUPLICATE KEY UPDATE download_url = VALUES(download_url)",
                [fabricQueries]
            );
        }

        // commit the transaction to make it :sparkles: *official* :sparkles:
        await connection.commit();
        console.log("[updateDatabase] Transaction Complete.");
    } catch (err) {
        await connection.rollback();
        console.error("[updateDatabase] Transaction Failed:", err);
    } finally {
        connection.release();
    }
}

async function initializeDatabase() {
    const connection = await pool.getConnection();
    try {
        console.log("[initializeDatabase] Connected!");

        await connection.query(
            "CREATE TABLE IF NOT EXISTS server_types (type VARCHAR(255) PRIMARY KEY)"
        );
        console.log("[initializeDatabase] server_types table created");

        // make tables for each server type
        for (const server of serverTypes) {
            await connection.query(`CREATE TABLE IF NOT EXISTS ${server} (
                version VARCHAR(255) NOT NULL,
                build VARCHAR(255) NOT NULL DEFAULT '0',
                download_url TEXT,
                PRIMARY KEY (version, build),
                INDEX (version)
            )`);
            console.log(`[initializeDatabase] ${server} table created`);
        }
    } catch (err) {
        console.error("[initializeDatabase] Error:", err);
    } finally {
        connection.release();
    }
}

// run everything once, and  every hour
async function main() {
    await initializeDatabase();
    await updateDatabase();
    setInterval(updateDatabase, updateInterval);
}

main();
