import { App } from "aws-cdk-lib";
import { CounterStack } from "../lib/counter-stack.ts";

const app = new App();
new CounterStack(app, "WorldlineCounter", {
  description: "Anonymous counter behind the Worldline portfolio console",
  env: { region: process.env.CDK_DEFAULT_REGION ?? "us-east-1" },
  // Set to the Amplify URL once it exists: cdk deploy -c siteOrigin=https://...
  siteOrigin: app.node.tryGetContext("siteOrigin") ?? "*",
});
