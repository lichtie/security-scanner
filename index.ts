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
