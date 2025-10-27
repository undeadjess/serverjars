const semver = require("semver");
const baseURL = "https://api.papermc.io/v3/projects/paper";
let cached = null;

async function preload() {
    if (cached) return cached;

    const versionsRes = await fetch(`${baseURL}/versions`);
    const versions = await versionsRes.json();

    const versionPromises = versions.map(async (versionObj) => {
        const version = versionObj.version.id;
        try {
            const buildsRes = await fetch(
                `${baseURL}/versions/${version}/builds`
            );
            const builds = await buildsRes.json();
            return {
                version,
                builds: builds.map((build) => ({
                    build: build.id,
                    downloadURL: `https://api.papermc.io${build.downloads.application.url}`,
                })),
            };
        } catch (err) {
            console.warn(`Failed to load builds for version ${version}:`, err);
            return { version, builds: [] };
        }
    });

    cached = await Promise.all(versionPromises);
    return cached;
}

module.exports = {
    getVersions: async () => {
        const data = await preload();
        return data
            .map((v) => v.version)
            .sort((a, b) =>
                semver.rcompare(semver.coerce(a), semver.coerce(b))
            );
    },

    getBuilds: async (version) => {
        const data = await preload();
        const entry = data.find((v) => v.version === version);
        if (!entry) throw new Error(`Version ${version} not found`);
        return entry.builds.map((b) => b.build).sort((a, b) => b - a);
    },

    getDownloadURL: async (version, build) => {
        const data = await preload();
        const entry = data.find((v) => v.version === version);
        if (!entry) throw new Error(`Version ${version} not found`);
        const buildEntry = entry.builds.find((b) => b.build === build);
        if (!buildEntry) throw new Error(`Build ${build} not found`);
        return buildEntry.downloadURL;
    },

    getLatest: async () => {
        const data = await preload();
        const sortedVersions = data
            .map((v) => v.version)
            .sort((a, b) =>
                semver.rcompare(semver.coerce(a), semver.coerce(b))
            );

        const latestVersion = sortedVersions[0];
        const versionEntry = data.find((v) => v.version === latestVersion);
        const latestBuild = Math.max(
            ...versionEntry.builds.map((b) => b.build)
        );
        const buildEntry = versionEntry.builds.find(
            (b) => b.build === latestBuild
        );

        return {
            server: "paper",
            version: latestVersion,
            build: latestBuild,
            downloadURL: buildEntry.downloadURL,
        };
    },
};
