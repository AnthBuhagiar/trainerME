import type { MetadataRoute } from "next";

/** Lets the app be added to a phone's home screen and open full-screen, like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hour Power",
    short_name: "Hour Power",
    description: "Your hour power, estimated from every ride, and a plan that fits your week.",
    start_url: "/",
    display: "standalone",
    background_color: "#12161c",
    theme_color: "#12161c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
