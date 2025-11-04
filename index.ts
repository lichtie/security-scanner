import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const role = new aws.iam.Role("lambdaRole", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: "lambda.amazonaws.com",
  }),
});

const policy = new aws.iam.RolePolicy("lambdaPolicy", {
  role: role.id,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: [
          "s3:ListAllMyBuckets",
          "s3:GetBucketAcl",
          "s3:GetBucketPolicy",
        ],
        Effect: "Allow",
        Resource: "*",
      },
    ],
  },
});

const lambda = new aws.lambda.Function("checkPublicS3Buckets", {
  runtime: aws.lambda.Runtime.NodeJS22dX,
  role: role.arn,
  handler: "index.handler",
  code: new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive("./lambda"),
  }),
});

// EventBridge rule to trigger Lambda on a schedule (runs daily at 9 AM UTC)
const scheduleRule = new aws.cloudwatch.EventRule("dailyS3CheckRule", {
  scheduleExpression: "cron(0 9 * * ? *)",
  description: "Trigger S3 bucket security check daily",
});

// Add Lambda as a target for the EventBridge rule
const target = new aws.cloudwatch.EventTarget("lambdaTarget", {
  rule: scheduleRule.name,
  arn: lambda.arn,
});

// Grant EventBridge permission to invoke the Lambda
const lambdaPermission = new aws.lambda.Permission("eventBridgeInvoke", {
  action: "lambda:InvokeFunction",
  function: lambda.name,
  principal: "events.amazonaws.com",
  sourceArn: scheduleRule.arn,
});

// EventBridge rule to trigger Lambda when a new S3 bucket is created
const bucketCreationRule = new aws.cloudwatch.EventRule("s3BucketCreationRule", {
  eventPattern: JSON.stringify({
    source: ["aws.s3"],
    "detail-type": ["AWS API Call via CloudTrail"],
    detail: {
      eventSource: ["s3.amazonaws.com"],
      eventName: ["CreateBucket"],
    },
  }),
  description: "Trigger S3 bucket security check when a bucket is created",
});

// Add Lambda as a target for the bucket creation rule
const bucketCreationTarget = new aws.cloudwatch.EventTarget("bucketCreationTarget", {
  rule: bucketCreationRule.name,
  arn: lambda.arn,
});

// Grant EventBridge permission to invoke the Lambda for bucket creation events
const bucketCreationPermission = new aws.lambda.Permission("bucketCreationInvoke", {
  action: "lambda:InvokeFunction",
  function: lambda.name,
  principal: "events.amazonaws.com",
  sourceArn: bucketCreationRule.arn,
});
