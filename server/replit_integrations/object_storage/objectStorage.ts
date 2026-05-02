import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Response } from "express";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const objectStorageClient = new S3Client({
  region: "auto",
  endpoint: accountId
    ? `https://${accountId}.r2.cloudflarestorage.com`
    : undefined,
  credentials:
    accessKeyId && secretAccessKey
      ? { accessKeyId, secretAccessKey }
      : undefined,
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export interface StoredObject {
  bucket: string;
  key: string;
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) {
    throw new Error("R2_BUCKET env var not set");
  }
  return bucket;
}

function getPublicPrefix(): string {
  return (process.env.PUBLIC_OBJECT_PREFIX || "public").replace(/^\/+|\/+$/g, "");
}

function getPrivatePrefix(): string {
  return (process.env.PRIVATE_OBJECT_PREFIX || "private").replace(/^\/+|\/+$/g, "");
}

export class ObjectStorageService {
  constructor() {}

  async searchPublicObject(filePath: string): Promise<StoredObject | null> {
    const bucket = getBucket();
    const key = `${getPublicPrefix()}/${filePath}`.replace(/\/+/g, "/");
    try {
      await objectStorageClient.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
      return { bucket, key };
    } catch {
      return null;
    }
  }

  async downloadObject(
    file: StoredObject,
    res: Response,
    cacheTtlSec: number = 3600,
  ) {
    try {
      const head = await objectStorageClient.send(
        new HeadObjectCommand({ Bucket: file.bucket, Key: file.key }),
      );
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";

      res.set({
        "Content-Type": head.ContentType || "application/octet-stream",
        "Content-Length": head.ContentLength?.toString(),
        "Cache-Control": `${
          isPublic ? "public" : "private"
        }, max-age=${cacheTtlSec}`,
      });

      const obj = await objectStorageClient.send(
        new GetObjectCommand({ Bucket: file.bucket, Key: file.key }),
      );
      const body = obj.Body;
      if (!body) {
        if (!res.headersSent) res.status(404).end();
        return;
      }
      const stream = body as Readable;
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const bucket = getBucket();
    const objectId = randomUUID();
    const key = `${getPrivatePrefix()}/uploads/${objectId}`;
    return getSignedUrl(
      objectStorageClient,
      new PutObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 900 },
    );
  }

  async getObjectEntityFile(objectPath: string): Promise<StoredObject> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const entityId = objectPath.slice("/objects/".length);
    if (!entityId) {
      throw new ObjectNotFoundError();
    }
    const bucket = getBucket();
    const key = `${getPrivatePrefix()}/${entityId}`;
    try {
      await objectStorageClient.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
      return { bucket, key };
    } catch {
      throw new ObjectNotFoundError();
    }
  }

  normalizeObjectEntityPath(rawPath: string): string {
    // Accept already-normalized paths
    if (rawPath.startsWith("/objects/")) {
      return rawPath;
    }

    // Try to parse as a presigned URL and extract the key
    let key: string | null = null;
    try {
      const url = new URL(rawPath);
      // R2 endpoint:  https://<account>.r2.cloudflarestorage.com/<bucket>/<key>
      // Custom domain: https://uploads.example.com/<key>
      const parts = url.pathname.replace(/^\/+/, "").split("/");
      if (url.hostname.endsWith(".r2.cloudflarestorage.com")) {
        // strip leading bucket segment
        key = parts.slice(1).join("/");
      } else {
        key = parts.join("/");
      }
    } catch {
      return rawPath;
    }

    const privatePrefix = getPrivatePrefix() + "/";
    if (key && key.startsWith(privatePrefix)) {
      const entityId = key.slice(privatePrefix.length);
      return `/objects/${entityId}`;
    }
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: StoredObject;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}
