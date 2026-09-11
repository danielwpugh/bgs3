/** @type {import('next').NextConfig} */
module.exports = {
  outputFileTracingRoot: __dirname,
  ...(process.env.STANDALONE_BUILD === '1' ? { output: 'standalone' } : {}),
  images: { unoptimized: false },
};
