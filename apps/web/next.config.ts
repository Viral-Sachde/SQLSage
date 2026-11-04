import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@sqlsage/core", "@sqlsage/graph", "@sqlsage/shared"],
};
export default config;
