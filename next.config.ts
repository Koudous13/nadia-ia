import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/chat': [
      './node_modules/sql.js/dist/sql-wasm.wasm',
      './data/paperasse.db',
    ],
  },
};

export default nextConfig;
