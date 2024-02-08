import { resolveImages } from "../plugins/resolveImages";
import { getRoute } from "../utils/getRoute";
import { rimraf } from "../utils/rimraf";
import { getCommonBuildOptions } from "../utils/settings";
import { generateClient } from "./generateClient";
import { generateSSR } from "./generateSSR";
import { renderSSR } from "./renderSSR";
import { routeToFileSystem } from "./routes";

export const buildRoute = async (url: string, outdir: string, base: string) => {
  const route = getRoute(url);
  const ssrFile = `${outdir}/ssr.js`;

  const segment = await routeToFileSystem(`${base}pages/`, route);
  console.log(segment);

  if (segment) {
    // TODO: query `module.data(param)` to get data here
    const props = segment.param;

    // creating this inside outdir
    if (route !== "/") outdir += route;

    rimraf(outdir);

    const common = getCommonBuildOptions();
    await generateSSR(base, segment.route, ssrFile, common, [
      resolveImages(outdir, true),
    ]);
    await renderSSR(ssrFile, outdir, props);
    await generateClient(
      base,
      segment.route,
      outdir,
      common,
      {},
      [resolveImages(outdir)],
      props
    );
  }
};
