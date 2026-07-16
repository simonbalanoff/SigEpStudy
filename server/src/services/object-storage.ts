import { createHash, createHmac } from "node:crypto";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import { env } from "../config/env.js";

const REGION = "auto";
const SERVICE = "s3";

export interface StoredObject {
    body: Readable;
    contentLength?: number;
    contentType?: string;
    etag?: string;
}

export async function uploadObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
}): Promise<void> {
    const response = await signedRequest({
        method: "PUT",
        key: input.key,
        body: input.body,
        contentType: input.contentType,
    });

    if (!response.ok) {
        throw await createStorageError("upload", input.key, response);
    }
}

export async function getObject(key: string): Promise<StoredObject | null> {
    const response = await signedRequest({
        method: "GET",
        key,
    });

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw await createStorageError("download", key, response);
    }

    if (!response.body) {
        throw new Error(`R2 object ${key} did not return a readable body.`);
    }

    const contentLengthHeader = response.headers.get("content-length");
    const contentLength = contentLengthHeader
        ? Number(contentLengthHeader)
        : undefined;

    return {
        body: Readable.fromWeb(
            response.body as unknown as NodeReadableStream<Uint8Array>,
        ),
        contentLength:
            contentLength !== undefined && Number.isFinite(contentLength)
                ? contentLength
                : undefined,
        contentType: response.headers.get("content-type") ?? undefined,
        etag: response.headers.get("etag") ?? undefined,
    };
}

export async function deleteObjects(keys: string[]): Promise<void> {
    const uniqueKeys = [...new Set(keys.filter(Boolean))];

    await Promise.all(
        uniqueKeys.map(async (key) => {
            const response = await signedRequest({
                method: "DELETE",
                key,
            });

            if (!response.ok && response.status !== 404) {
                throw await createStorageError("delete", key, response);
            }
        }),
    );
}

async function signedRequest(input: {
    method: "GET" | "PUT" | "DELETE";
    key: string;
    body?: Buffer;
    contentType?: string;
}): Promise<Response> {
    const path = buildObjectPath(input.key);
    const url = new URL(
        path,
        `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    );
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256(input.body ?? Buffer.alloc(0));
    const headers = new Headers({
        host: url.host,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
    });

    if (input.contentType) {
        headers.set("content-type", input.contentType);
    }

    const signedHeaderNames = [...headers.keys()]
        .map((name) => name.toLowerCase())
        .sort();
    const canonicalHeaders =
        signedHeaderNames
            .map(
                (name) =>
                    `${name}:${normalizeHeaderValue(headers.get(name) ?? "")}`,
            )
            .join("\n") + "\n";
    const signedHeaders = signedHeaderNames.join(";");
    const canonicalRequest = [
        input.method,
        url.pathname,
        "",
        canonicalHeaders,
        signedHeaders,
        payloadHash,
    ].join("\n");
    const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
    const stringToSign = [
        "AWS4-HMAC-SHA256",
        amzDate,
        credentialScope,
        sha256(canonicalRequest),
    ].join("\n");
    const signingKey = getSignatureKey(
        env.R2_SECRET_ACCESS_KEY,
        dateStamp,
        REGION,
        SERVICE,
    );
    const signature = hmac(signingKey, stringToSign).toString("hex");

    headers.set(
        "authorization",
        `AWS4-HMAC-SHA256 Credential=${env.R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    );

    return fetch(url, {
        method: input.method,
        headers,
        body: input.body,
    });
}

function buildObjectPath(key: string): string {
    const encodedBucket = encodePathSegment(env.R2_BUCKET_NAME);
    const encodedKey = key.split("/").map(encodePathSegment).join("/");
    return `/${encodedBucket}/${encodedKey}`;
}

function encodePathSegment(value: string): string {
    return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
        `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
}

function normalizeHeaderValue(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

function sha256(value: string | Buffer): string {
    return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Buffer, value: string): Buffer {
    return createHmac("sha256", key).update(value).digest();
}

function getSignatureKey(
    secret: string,
    dateStamp: string,
    region: string,
    service: string,
): Buffer {
    const dateKey = hmac(`AWS4${secret}`, dateStamp);
    const regionKey = hmac(dateKey, region);
    const serviceKey = hmac(regionKey, service);
    return hmac(serviceKey, "aws4_request");
}

async function createStorageError(
    operation: string,
    key: string,
    response: Response,
): Promise<Error> {
    const responseText = await response.text().catch(() => "");
    return new Error(
        `R2 ${operation} failed for ${key} with ${response.status}: ${responseText}`,
    );
}
