import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Only ever one row of totals. No IPs, no IDs, nothing about who pressed Send.
const KEY = { id: "attempts" };
const MOMENTS = new Set(["fixed", "devops", "samsung"]);
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface ApiEvent {
  routeKey: string;
  pathParameters?: { moment?: string };
}

const reply = (statusCode: number, body: object, cache = "no-store") => ({
  statusCode,
  headers: { "content-type": "application/json", "cache-control": cache },
  body: JSON.stringify(body),
});

const counts = (item?: Record<string, unknown>) => ({
  total: Number(item?.total ?? 0),
  fixed: Number(item?.fixed ?? 0),
  devops: Number(item?.devops ?? 0),
  samsung: Number(item?.samsung ?? 0),
});

export async function handler(event: ApiEvent) {
  try {
    if (event.routeKey === "GET /counts") {
      const { Item } = await db.send(new GetCommand({ TableName: process.env.TABLE_NAME, Key: KEY }));
      return reply(200, counts(Item), "public, max-age=15");
    }
    const moment = event.pathParameters?.moment ?? "";
    if (!MOMENTS.has(moment)) return reply(404, { message: "No such moment." });
    const { Attributes } = await db.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: KEY,
        UpdateExpression: "ADD #total :one, #moment :one",
        ExpressionAttributeNames: { "#total": "total", "#moment": moment },
        ExpressionAttributeValues: { ":one": 1 },
        ReturnValues: "ALL_NEW",
      }),
    );
    return reply(200, counts(Attributes));
  } catch (error) {
    console.error(error);
    return reply(500, { message: "Counter unavailable." });
  }
}
