/** @type {import('next').NextConfig} */
module.exports = {
  ...(process.env.STANDALONE_BUILD === '1' ? { output: 'standalone' } : {}),
  images: { unoptimized: false },
};
