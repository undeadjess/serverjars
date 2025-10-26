const semver = require("semver");
const baseURL = "https://api.papermc.io/v2/projects/paper";
let cached = null;

// Prefetch and cache the full structure
async function preload() {
    if (cached) return cached;
    const versionData = await fetch(baseURL).then((res) => res.json());

    // ensure array present
    const versions = Array.isArray(versionData && versionData.versions)
        ? versionData.versions
        : [];

    const versionPromises = versions.map(async (version) => {
        try {
            const buildRes = await fetch(`${baseURL}/versions/${version}`);
            const buildJson = await buildRes.json();

            // ensure array present (again)
            const buildsArr = Array.isArray(buildJson && buildJson.builds)
                ? buildJson.builds
                : [];

            const builds = buildsArr.map((build) => ({
                build,
                downloadURL: `${baseURL}/versions/${version}/builds/${build}/downloads/paper-${version}-${build}.jar`,
            }));

            return { version, builds };
        } catch (err) {
            // if a single version fails, skip it instead of fucking everything
            console.warn(`Failed to load Paper builds for version ${version}:`, err);
            return { version, builds: [] };
        }
    });
    const all = await Promise.all(versionPromises);
    cached = all;
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
        const buildEntry = entry.builds.find(
            (b) => Number(b.build) === Number(build)
        );
        if (!buildEntry)
            throw new Error(`Build ${build} not found for version ${version}`);
        return buildEntry.downloadURL;
    },

    getLatest: async () => {
        const data = await preload();
        if (data.length === 0) throw new Error("No versions available");

        // Get latest version (first after sorting)
        const sortedVersions = data
            .map((v) => v.version)
            .sort((a, b) =>
                semver.rcompare(semver.coerce(a), semver.coerce(b))
            );

        const latestVersion = sortedVersions[0];
        const versionEntry = data.find((v) => v.version === latestVersion);

        // Get latest build for that version
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
