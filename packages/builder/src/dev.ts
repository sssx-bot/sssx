import open from "open";
import express from "express";
import { buildRoute } from "./render";

const app = express();
const cwd = process.cwd();
const outdir = `${cwd}/dev`;

// TODO: add watch functionlaity and reload
// TODO: start looking into adding tailwind support
// TODO: always trailing slash policy

app.get("*", async (req, res) => {
  const { url } = req;
  const base = `${cwd}/src/pages`;

  // generate build only on main route request
  if (url.endsWith("/")) {
    await buildRoute(url, outdir, base);
  }

  // serve the requested file from the filesystem
  let filename = url !== "/" ? url : "index.html";
  res.sendFile(`${outdir}/${filename}`);
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const host = "127.0.0.1";

app.listen(port, host, () => {
  console.log(`Listening on port ${port}`);
  open(`http://${host}:${port}`);
});
