const path = require("path");

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  
    mode: isProduction ? "production" : "development",

    entry: {
        main: "./public/js/main.js",
    },
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "public", "dist"),
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"],
                    },
                },
            },
        ],
    },
};
