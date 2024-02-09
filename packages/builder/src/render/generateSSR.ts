import esbuild, { Plugin, type BuildOptions } from "esbuild";
//@ts-ignore
import type { CompileOptions, Warning } from "svelte/types/compiler/interfaces";
import sveltePlugin from "esbuild-svelte";
import sveltePreprocess from "svelte-preprocess";
import { generateEntryPoint } from "./generateEntryPoint";

const defaultCompilerOptions: CompileOptions = {
  generate: "ssr",
  // css: "injected",
  css: "none",
  hydratable: true,
};

export const generateSSR = async (
  basedir: string,
  route: string,
  buildOptions: BuildOptions = {},
  plugins: Plugin[] = [],
  compilerSSROptions: Partial<CompileOptions> = {},
  isDev: boolean
) => {
  const compilerOptions: CompileOptions = {
    ...defaultCompilerOptions,
    ...compilerSSROptions,
  };
  if (isDev) {
    compilerOptions.dev = isDev;
    // gives Cannot read properties of null (reading 'sourcesContent') [plugin esbuild-svelte]
    compilerOptions.enableSourcemap = true;
  }
  const contents = generateEntryPoint(true, compilerOptions, route);

  const stdin: esbuild.StdinOptions = {
    contents,
    loader: "js",
    resolveDir: basedir,
    sourcefile: "main.js",
  };

  // server
  const result = await esbuild.build({
    ...buildOptions,
    // output is in memory, not file system
    write: false,
    //
    stdin,
    //
    outfile: "./ssr.js",
    splitting: false,
    //
    plugins: [
      ...plugins,
      sveltePlugin({
        preprocess: sveltePreprocess(),
        compilerOptions,
      }),
    ],
  });
  // .catch((reason: any) => {
  //   console.warn(`Errors: `, reason);
  //   process.exit(1);
  // });

  // TODO: check for warnings
  const output = result.outputFiles[0].text;

  return output;
};
