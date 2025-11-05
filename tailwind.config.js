import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/renderer/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#497886", // OneMed teal/green color from the website
          light: "#6A99A7", // Lighter variant of the teal color
          dark: "#366573", // Darker variant for hover states
        },
        accent: "#E63946", // OneMed accent color
        neutral: {
          DEFAULT: "#333333", // Primary text color
          secondary: "#666666", // Secondary text color
          light: "#F5F5F5", // Background color
          white: "#FFFFFF", // White
        },
        // Top-level aliases for custom colors
        white: "#FFFFFF",
        "neutral-white": "#FFFFFF",
        "neutral-light": "#F5F5F5",
        "neutral-secondary": "#666666",
        neutral: "#333333",
        "primary-light": "#6A99A7",
        "primary-dark": "#366573",
        accent: "#E63946",
      },
      fontFamily: {
        sans: ["Roboto", "sans-serif"],
        secondary: ["Open Sans", "sans-serif"],
      },
      fontSize: {
        base: "16px",
        xs: "14px", // Small text
        sm: "16px", // Base size
        md: "18px", // H4
        lg: "20px", // H3
        xl: "24px", // H2
        "2xl": "32px", // H1
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        bold: 600,
      },
      spacing: {
        ...defaultTheme.spacing,
        unit: "8px",
        sm: "8px", // Small spacing
        md: "16px", // Medium spacing
        lg: "24px", // Large spacing
        xl: "32px", // Extra large spacing
        "2xl": "48px", // XX large spacing
      },
      borderRadius: {
        ...defaultTheme.borderRadius,
        sm: "4px", // Small radius (buttons)
        md: "8px", // Medium radius (cards)
        lg: "12px", // Large radius
      },
      boxShadow: {
        sm: "0 2px 4px rgba(0,0,0,0.1)",
        md: "0 4px 8px rgba(0,0,0,0.1)",
        lg: "0 8px 16px rgba(0,0,0,0.15)",
      },
      backgroundImage: {
        "gradient-glass":
          "linear-gradient(135deg, #E8B4A0 0%, #D4A89B 25%, #B8A8B8 50%, #9AA5B8 75%, #8B9BAB 100%)",
      },
      transitionProperty: {
        default: "all",
      },
      transitionDuration: {
        default: "200ms",
      },
      transitionTimingFunction: {
        default: "ease-in-out",
      },
    },
  },
  plugins: [],
};
