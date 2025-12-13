import { useToast } from "@soilhat/react-components";
import { saveDataToCache, getCachedData } from "./idb";

export const getApiUrl = (url: string) => {
    const isDemo = localStorage.getItem("demo")
    const api = isDemo ? "/demo" : import.meta.env.VITE_API;
    const postfix = isDemo ? ".json" : "";
    return `${api}${url}${postfix}`
}

// Track in-flight GET requests to avoid duplicate network calls (useful during
// React Strict Mode double-mount in development and for rapidly re-rendered components).
const inFlightRequests: Map<string, Promise<any>> = new Map();

export const callApi = async (
    url: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    save_name?: string | undefined,
    data?: BodyInit | null | undefined | object
) => {
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
            return inFlightRequests.get(key);
        }

        const promise = fetch(apiUrl, { method, headers, body })
            .then((response) => {
                if (!response.ok) {
                    if (response.status === 403) {
                        localStorage.clear();
                        globalThis.location.href = "/auth/login";
                    }
                    throw new Error(response.statusText);
                }
                return response.json();
            }).then(async (data) => {
                if (save_name) await saveDataToCache(data, save_name);
                return { data: data, offline: offline };
            }).catch((err) => {
                if (err.message === "Failed to fetch") {
                    if (save_name) return serveCachedData(save_name);
                }
                throw err;
            }).finally(() => {
                inFlightRequests.delete(key);
            });

        inFlightRequests.set(key, promise);
        return promise;
    }

    // Non-GET requests: proceed normally (no dedupe)
    return await fetch(apiUrl, {
        method: method,
        headers: headers,
        body: body,
    }).then((response) => {
        if (!response.ok) {
            if (response.status === 403) {
                localStorage.clear();
                globalThis.location.href = "/auth/login";
            }
            throw new Error(response.statusText);
        }
        return response.json();
    }).then(async (data) => {
        if (save_name) await saveDataToCache(data, save_name);
        return { data: data, offline: offline };
    }).catch((err) => {
        if (err.message === "Failed to fetch") {
            if (save_name) {
                return serveCachedData(save_name);
            }
        }
        throw err;
    });
}

const serveCachedData = async (save_name: string) => {
    const { error, info } = useToast();
    const cached = await getCachedData(save_name);
    if (cached) info("You are offline. Serving cached data.");
    else error("You are offline and no cached data is available.");
    return { data: cached, offline: true }
}