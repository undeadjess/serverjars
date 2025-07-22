<img src="https://raw.githubusercontent.com/undeadjess/mcserverjars/refs/heads/main/web/public/assets/images/favicon.png" width="100">

# ServerJars

ServerJars automatically fetches and builds the latest versions of many different Minecraft servers, and displays them in one easy place!

## Deployment:

> ServerJars is not yet ready for production use

Assuming you have docker and docker-compose installed, you can deploy ServerJars by running the following commands:

```bash
wget https://raw.githubusercontent.com/undeadjess/mcserverjars/main/docker-compose.yml
docker-compose up -d
```

ServerJars will then be available on port 80

## API Usage:

`GET /api/<type>/<jar>/<version>/<build>`

-   type: The type of the server jar. (Servers, Proxies and more coming soon!)
-   jar: The server jar file to download. (vanilla, paper, forge)
-   version: The minecraft version of the jar. (1.16.5, 1.17.1)
-   build: The build number of the server jar. Only for non-vanilla servers (1, 2, 3, ...)

Both `version` and `build` are optional. If none are specified, the latest version will be returned

#### Examples:

`GET /api/server/paper/1.17.1/142`
Returns the download link for the 142nd build of the 1.17.1 paper server jar.

`GET /api/server/paper/1.16.5`
Returns the download link for the latest build of the 1.16.5 paper server jar.

`GET /api/server/paper`
Returns the download link for the latest build of the latest version of the paper server jar.

## Future Plans:

-   Build bukkit and spigot jars and store them in a cache
