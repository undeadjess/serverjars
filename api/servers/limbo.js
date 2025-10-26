// https://github.com/LOOHP/Limbo
// https://ci.loohpjames.com/job/Limbo/

const semver = require("semver");
const baseURL = "https://ci.loohpjames.com/job/Limbo";
let cached = null;

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.json();
}

async function preload() {
    if (cached) return cached;

    const data = await fetchJSON(`${baseURL}/api/json?tree=builds[number,url,artifacts[fileName,relativePath]]`);
    cached = data.builds.map(build => ({
        build: build.number,
        artifacts: build.artifacts.map(a => ({
            fileName: a.fileName,
            downloadURL: `${build.url}artifact/${a.relativePath}`
        })),
        version: build.artifacts
            .map(a => a.fileName.match(/(\d+\.\d+\.\d+)/))
            .filter(Boolean)
            .map(m => m[0])[0] || null
    }));
    return cached;
}

module.exports = {
    getVersions: async () => {
        const data = await preload();
        const versions = [...new Set(data.map(b => b.version).filter(Boolean))];
        return versions.sort((a, b) =>
            semver.rcompare(semver.coerce(a), semver.coerce(b))
        );
    },
    getBuilds: async (version) => {
        const data = await preload();
        const builds = data.filter(b => b.version === version).map(b => b.build);
        if (builds.length === 0) throw new Error(`No builds found for version ${version}`);
        return builds.sort((a, b) => b - a);
    },
    getDownloadURL: async (version, build) => {
        const data = await preload();
        const buildEntry = data.find(b => b.build === Number(build) && b.version === version);
        if (!buildEntry) throw new Error(`Build ${build} not found for version ${version}`);
        const jar = buildEntry.artifacts.find(a => a.fileName.endsWith(".jar"));
        if (!jar) throw new Error(`No JAR artifact found for build ${build}`);
        return jar.downloadURL;
    },
    getLatest: async () => {
        const data = await preload();
        if (data.length === 0) throw new Error("No builds available");
        const latestBuild = Math.max(...data.map(b => b.build));
        const buildEntry = data.find(b => b.build === latestBuild);
        const jar = buildEntry.artifacts.find(a => a.fileName.endsWith(".jar"));
        return {
            server: "limbo",
            version: buildEntry.version,
            build: latestBuild,
            downloadURL: jar ? jar.downloadURL : null
        };
    },
};
