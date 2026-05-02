import {
  CopyObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const ACL_POLICY_METADATA_KEY = "acl-policy";

export enum ObjectAccessGroupType {}

export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

export interface StoredObject {
  bucket: string;
  key: string;
}

function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }
  return granted === ObjectPermission.WRITE;
}

abstract class BaseObjectAccessGroup implements ObjectAccessGroup {
  constructor(
    public readonly type: ObjectAccessGroupType,
    public readonly id: string,
  ) {}

  public abstract hasMember(userId: string): Promise<boolean>;
}

function createObjectAccessGroup(
  group: ObjectAccessGroup,
): BaseObjectAccessGroup {
  switch (group.type) {
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}

let _client: S3Client | null = null;
function getClient(): S3Client {
  if (_client) return _client;
  const accountId = process.env.R2_ACCOUNT_ID;
  _client = new S3Client({
    region: "auto",
    endpoint: accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : undefined,
    credentials:
      process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
  return _client;
}

export async function setObjectAclPolicy(
  objectFile: StoredObject,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  const client = getClient();
  // S3/R2 metadata is set at upload time; updating requires a copy-in-place.
  await client.send(
    new CopyObjectCommand({
      Bucket: objectFile.bucket,
      Key: objectFile.key,
      CopySource: `${objectFile.bucket}/${encodeURIComponent(objectFile.key)}`,
      Metadata: {
        [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy),
      },
      MetadataDirective: "REPLACE",
    }),
  );
}

export async function getObjectAclPolicy(
  objectFile: StoredObject,
): Promise<ObjectAclPolicy | null> {
  const client = getClient();
  const head = await client.send(
    new HeadObjectCommand({ Bucket: objectFile.bucket, Key: objectFile.key }),
  );
  const raw = head.Metadata?.[ACL_POLICY_METADATA_KEY];
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function canAccessObject({
  userId,
  objectFile,
  requestedPermission,
}: {
  userId?: string;
  objectFile: StoredObject;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }

  if (
    aclPolicy.visibility === "public" &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }

  if (!userId) {
    return false;
  }

  if (aclPolicy.owner === userId) {
    return true;
  }

  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (
      (await accessGroup.hasMember(userId)) &&
      isPermissionAllowed(requestedPermission, rule.permission)
    ) {
      return true;
    }
  }

  return false;
}
