import { S3Client, ListBucketsCommand, GetBucketAclCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyResult } from "aws-lambda";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

export const handler = async (): Promise<APIGatewayProxyResult> => {
  try {
    const listCommand = new ListBucketsCommand({});
    const result = await s3.send(listCommand);
    const publicBuckets: string[] = [];

    if (result.Buckets) {
      for (const bucket of result.Buckets) {
        if (bucket.Name) {
          try {
            const aclCommand = new GetBucketAclCommand({ Bucket: bucket.Name });
            const acl = await s3.send(aclCommand);
            const grants = acl.Grants || [];

            for (const grant of grants) {
              if (
                grant.Grantee?.URI === "http://acs.amazonaws.com/groups/global/AllUsers" &&
                (grant.Permission === "READ" || grant.Permission === "FULL_CONTROL")
              ) {
                publicBuckets.push(bucket.Name);
                break;
              }
            }
          } catch (error) {
            console.warn(`Failed to get ACL for bucket ${bucket.Name}:`, error);
          }
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ publicBuckets }),
    };
  } catch (error) {
    console.error("Error scanning S3 buckets:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
