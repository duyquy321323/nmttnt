import type { NextConfig } from "next";

import { APP_BASE_PATH } from "./lib/app-paths";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: APP_BASE_PATH,
  assetPrefix: `${APP_BASE_PATH}/`,
  trailingSlash: true,
  compress: true,

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
