import { defineConfig } from "astro/config";

// Amplify provides these at build time, which gives the default amplifyapp.com address.
const { AWS_APP_ID, AWS_BRANCH } = process.env;
const site = AWS_APP_ID && AWS_BRANCH ? `https://${AWS_BRANCH.replaceAll("/", "-")}.${AWS_APP_ID}.amplifyapp.com` : undefined;

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "always",
  devToolbar: { enabled: false },
});
