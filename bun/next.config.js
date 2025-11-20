/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    webpack: (config, { isServer }) => {
        // Suppress node-fetch warnings when using Bun
        config.infrastructureLogging = {
            level: 'error',
        };

        config.ignoreWarnings = [
            { module: /node-fetch/ },
            { module: /next-font-loader/ },
            { message: /Caching failed for pack/ },
            { message: /Resolving dependencies are ignored for this path/ },
        ];

        // Workaround for node-fetch issue with next/font in Bun
        if (!isServer) {
            config.resolve.alias = {
                ...config.resolve.alias,
                'node-fetch': false,
            };
        }

        return config;
    },
};

module.exports = nextConfig;
