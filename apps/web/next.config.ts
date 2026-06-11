import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // @fitpart/shared exportiert TS-Quellen direkt aus dem Workspace.
  transpilePackages: ["@fitpart/shared"],
};

export default withNextIntl(nextConfig);
