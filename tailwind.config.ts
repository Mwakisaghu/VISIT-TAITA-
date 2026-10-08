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
          light: "#E3BC6B", // small text on the green sections (the default gold is too dim there)
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-manrope)", "sans-serif"],
      },
      keyframes: {
        kenburns: { "0%": { transform: "scale(1.02) translate3d(0,0,0)" }, "100%": { transform: "scale(1.13) translate3d(-1.6%,-1.1%,0)" } },
        hint: { "0%,100%": { transform: "translateY(0)", opacity: "0.45" }, "50%": { transform: "translateY(7px)", opacity: "1" } },
        drift: { "0%": { transform: "translate3d(0,0,0)" }, "100%": { transform: "translate3d(-160px,0,0)" } },
      },
      animation: {
        kenburns: "kenburns 30s ease-in-out infinite alternate",
        hint: "hint 2.4s ease-in-out infinite",
        drift: "drift 70s linear infinite alternate",
      },
      maxWidth: {
        prose: "70ch",
      },
    },
  },
  plugins: [],
};

export default config;
