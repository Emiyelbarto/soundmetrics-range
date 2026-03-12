/** @type {import('next').NextConfig} */
const webpack = require('webpack');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, 'config.env')));
const rawEnv = Object.keys(envConfig).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(envConfig[next]);
  return prev;
}, {});

const nextConfig = {
  webpack: (config) => {
    config.plugins.push(new webpack.DefinePlugin(rawEnv));
    return config;
  },
};

module.exports = nextConfig;