import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { handler } from "../lambda/counter.ts";

const send = mock.method(DynamoDBDocumentClient.prototype, "send", async () => ({}));
beforeEach(() => send.mock.resetCalls());

test("reads zeros before anyone has tried", async () => {
  const res = await handler({ routeKey: "GET /counts" });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { total: 0, fixed: 0, devops: 0, samsung: 0 });
  assert.ok(send.mock.calls[0].arguments[0] instanceof GetCommand);
});

test("adds to the total and the moment atomically", async () => {
  send.mock.mockImplementationOnce(async () => ({ Attributes: { id: "attempts", total: 3, devops: 2 } }));
  const res = await handler({ routeKey: "POST /counts/{moment}", pathParameters: { moment: "devops" } });
  assert.deepEqual(JSON.parse(res.body), { total: 3, fixed: 0, devops: 2, samsung: 0 });
  const command = send.mock.calls[0].arguments[0] as UpdateCommand;
  assert.ok(command instanceof UpdateCommand);
  assert.equal(command.input.ExpressionAttributeNames?.["#moment"], "devops");
});

test("refuses a moment that doesn't exist, without touching the table", async () => {
  for (const moment of ["total", "id", "nope", ""]) {
    const res = await handler({ routeKey: "POST /counts/{moment}", pathParameters: { moment } });
    assert.equal(res.statusCode, 404);
  }
  assert.equal(send.mock.callCount(), 0);
});

test("fails with a plain 500 and no internal detail", async () => {
  mock.method(console, "error", () => {});
  send.mock.mockImplementationOnce(async () => {
    throw new Error("secret internals");
  });
  const res = await handler({ routeKey: "GET /counts" });
  assert.equal(res.statusCode, 500);
  assert.ok(!res.body.includes("secret"));
});
