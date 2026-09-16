const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Monorepo: root proyek frontend adalah folder ini (bukan root repo)
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
