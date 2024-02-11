import fs from "fs";
import os from "os";
import cluster from "cluster";
import { buildRoute } from "./render";
import { getConfig } from "./utils/config";
import { getAllRoutes, routeToFileSystem } from "./render/routes";
import { buildSitemap } from "./plugins/sitemap";
import cliProgress from "cli-progress";
import colors from "ansi-colors";
import { getRoute } from "./utils/getRoute";

const numCPUs = os.cpus().length;
const cwd = process.cwd();
const config = await getConfig(cwd);
const outdir = `${cwd}/${config.outDir}`;
const isDev = false;
const COLD_START_DELAY = 2000;

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir);
}

let numWorkers = 0;
const allRoutes = await getAllRoutes(cwd);

if (cluster.isPrimary) {
  const routes = allRoutes.map((s) => s.permalink);

  const ROUTES_BATCH = Math.round(routes.length / numCPUs);
  const bar1 = new cliProgress.SingleBar({
    format:
      "SSSX |" +
      colors.cyan("{bar}") +
      "| {percentage}% | {duration_formatted} | {eta_formatted} left | URL: {url}",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
  });
  bar1.start(routes.length, 0, { url: "" });
  let jobsIndex = 0;

  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    const routesBatch = routes.slice(
      i * ROUTES_BATCH,
      Math.min(routes.length, (i + 1) * ROUTES_BATCH)
    );
    numWorkers++;
    // console.log(i, routes.length, routesBatch.length);
    setTimeout(() => {
      worker.send(routesBatch);
    }, COLD_START_DELAY);

    worker.on("message", (url) => {
      // console.log("Received message from worker", message);
      bar1.update(jobsIndex++, { url });
    });
  }

  await buildSitemap(outdir, config, allRoutes);

  // Object.keys(cluster.workers!).forEach(function (id) {
  //   console.log("I am running with ID : " + cluster.workers![id]!.process.pid);
  // });

  cluster.on("exit", function (worker, code, signal) {
    numWorkers--;
    // console.log("worker " + worker.process.pid + " died");

    if (numWorkers === 0) {
      bar1.update(routes.length);
      bar1.stop();
      console.log("DONE");
    }
  });
} else {
  // TODO: replace delay with a lazy execution
  process.on("message", async (routes: string[]) => {
    // TODO: not the best way to parallelize, rework
    // const allRoutes = await getAllRoutes(cwd);
    // console.log("Worker", process.pid, routes.length);

    for (let i = 0; i < routes.length; i++) {
      const url = routes[i];
      // console.log({ i, url });
      // console.log("Worker", process.pid, i, routes.length, url);
      const route = getRoute(url);
      const segment = await routeToFileSystem(cwd, route, allRoutes);
      await buildRoute(route, segment!, outdir, cwd, config, isDev);
      process.send!(url);
    }

    process.exit(1);
  });
}
