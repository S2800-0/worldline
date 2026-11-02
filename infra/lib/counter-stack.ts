import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { CfnStage, CorsHttpMethod, HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { AttributeType, Billing, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import type { Construct } from "constructs";

const here = dirname(fileURLToPath(import.meta.url));

interface CounterProps extends StackProps {
  siteOrigin: string;
}

export class CounterStack extends Stack {
  constructor(scope: Construct, id: string, props: CounterProps) {
    super(scope, id, props);

    const table = new TableV2(this, "Counts", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      billing: Billing.onDemand(),
      // Only anonymous tallies live here, so nothing is lost by removing the stack.
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const handler = new NodejsFunction(this, "Handler", {
      entry: join(here, "../lambda/counter.ts"),
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(3),
      environment: { TABLE_NAME: table.tableName },
      logGroup: new LogGroup(this, "HandlerLogs", {
        retention: RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      bundling: { externalModules: ["@aws-sdk/*"] },
    });
    table.grant(handler, "dynamodb:GetItem", "dynamodb:UpdateItem");

    const api = new HttpApi(this, "Api", {
      description: "Counts attempts to change the past. Stores no visitor data.",
      corsPreflight: {
        allowOrigins: [props.siteOrigin],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST],
        maxAge: Duration.hours(1),
      },
    });
    const integration = new HttpLambdaIntegration("Integration", handler);
    api.addRoutes({ path: "/counts", methods: [HttpMethod.GET], integration });
    api.addRoutes({ path: "/counts/{moment}", methods: [HttpMethod.POST], integration });

    // Caps both the bill and how fast anyone can inflate the numbers.
    const stage = api.defaultStage!.node.defaultChild as CfnStage;
    stage.defaultRouteSettings = { throttlingRateLimit: 10, throttlingBurstLimit: 20 };

    new CfnOutput(this, "CounterUrl", { value: api.apiEndpoint });
  }
}
