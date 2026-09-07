import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stone: {
          DEFAULT: "#1B1815",
          soft: "#2A2521",
        },
        parchment: {
          DEFAULT: "#ECE3CD",
          dim: "#DCD0B2",
        },
        rust: {
          DEFAULT: "#A6431E",
          deep: "#7E3117",
        },
        canopy: {
          DEFAULT: "#2B4736",
          deep: "#1D3126",
        },
        ochre: {
          DEFAULT: "#C99A3E",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-manrope)", "sans-serif"],
      },
      maxWidth: {
        prose: "70ch",
      },
    },
  },
  plugins: [],
};

export default config;
