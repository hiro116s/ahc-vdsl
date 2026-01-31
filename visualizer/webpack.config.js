const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    entry: './src/index.ts',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: process.env.NODE_ENV === 'production' ? '/ahc-vdsl/' : '/',
        clean: true,
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.BASE_PATH': JSON.stringify(
                process.env.NODE_ENV === 'production' ? '/ahc-vdsl' : ''
            ),
        }),
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
        }),
        // Create 404.html for GitHub Pages SPA routing
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: '404.html',
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'err', to: 'err', noErrorOnMissing: true },
                { from: 'samples', to: 'samples', noErrorOnMissing: true },
            ],
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        port: 8080,
        hot: true,
        historyApiFallback: true,
    },
};
