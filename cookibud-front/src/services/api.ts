import { useToast } from "@soilhat/react-components";
import { saveDataToCache, getCachedData } from "./idb";

export const getApiUrl = (url: string) => {
    const isDemo = localStorage.getItem("demo")
    const api = isDemo ? "/demo" : import.meta.env.VITE_API;
    const postfix = isDemo ? ".json" : "";
    return `${api}${url}${postfix}`
}

// API response wrapper
export type ApiResponse<T = unknown> = { data: T; offline: boolean };

// Track in-flight GET requests to avoid duplicate network calls (useful during
// React Strict Mode double-mount in development and for rapidly re-rendered components).
const inFlightRequests: Map<string, Promise<ApiResponse<unknown>>> = new Map();

export const callApi = async <T = unknown>(
    url: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
    save_name?: string | undefined,
    data?: BodyInit | null | undefined | object
): Promise<ApiResponse<T>> => {
    const offline = !navigator.onLine
    if (offline && save_name) {
        serveCachedData(save_name);
    }

    let body: BodyInit | undefined = undefined;
    const headers: Record<string, string> = {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Access-Control-Allow-Origin": "*",
    };

    if (method !== "GET" && data !== undefined && data !== null) {
        if (data instanceof FormData) {
            body = data;
            // Do not set Content-Type for FormData
        } else if (typeof data === "string") {
            body = data;
            headers["Content-Type"] = "application/json";
        } else {
            body = JSON.stringify(data);
            headers["Content-Type"] = "application/json";
        }
    }

    const apiUrl = getApiUrl(url);

    // Deduplicate GET requests by returning the existing in-flight Promise when present.
    if (method === 'GET') {
        const key = apiUrl;
        if (inFlightRequests.has(key)) {
            return inFlightRequests.get(key) as Promise<ApiResponse<T>>;
        }

        const promise: Promise<ApiResponse<T>> = fetch(apiUrl, { method, headers, body })
            .then(async (response) => {
                if (!response.ok) {
                    if (response.status === 403) {
                        localStorage.clear();
                        globalThis.location.href = "/auth/login";
                    }
                    throw new Error(response.statusText);
                }
                const json = (await response.json()) as T;
                if (save_name) await saveDataToCache(json, save_name);
                return { data: json, offline };
            }).catch(async (err) => {
                if (err.message === "Failed to fetch") {
                    if (save_name) return serveCachedData<T>(save_name);
                }
                throw err;
            }).finally(() => {
                inFlightRequests.delete(key);
            });

        // store as loose ApiResponse<unknown> in the map for deduping
        inFlightRequests.set(key, promise as Promise<ApiResponse<unknown>>);
        return promise;
    }

    // Non-GET requests: proceed normally (no dedupe)
    return await fetch(apiUrl, {
        method: method,
        headers: headers,
        body: body,
    }).then(async (response) => {
        if (!response.ok) {
            if (response.status === 403) {
                localStorage.clear();
                globalThis.location.href = "/auth/login";
            }
            throw new Error(response.statusText);
        }
        const json = (await response.json()) as T;
        if (save_name) await saveDataToCache(json, save_name);
        return { data: json, offline };
    }).catch(async (err) => {
        if (err.message === "Failed to fetch") {
            if (save_name) {
                return serveCachedData<T>(save_name);
            }
        }
        throw err;
    });
}

const serveCachedData = async <T = unknown>(save_name: string): Promise<ApiResponse<T>> => {
    const { error, info } = useToast();
    const cached = await getCachedData(save_name);
    if (cached) info("You are offline. Serving cached data.");
    else error("You are offline and no cached data is available.");
    return { data: cached as T, offline: true };
}