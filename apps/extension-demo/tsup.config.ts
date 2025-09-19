import path from "node:path";
import { defineConfig } from "tsup";
import aliasPlugin from "esbuild-plugin-alias";

export default defineConfig({
  entry: ["src/content-script.ts", "src/popup/popup.ts", "src/detector-entry.ts"],
  format: "esm",
  target: "es2022",
  outDir: "dist",
  clean: true,
  platform: "browser",
  splitting: false,
  sourcemap: false,
  treeshake: true,
  noExternal: [/.*/],
  esbuildPlugins: [
    aliasPlugin({
      "#detectors/freework": path.resolve(
        __dirname,
        "../../packages/detectors/src/freework/detector.ts",
      ),
      "#detectors/url": path.resolve(
        __dirname,
        "../../packages/detectors/src/utils/url.ts",
      ),
    }),
  ],
});
