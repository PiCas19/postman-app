import type { RequestInput as RequestAddDTO, Request as RequestModifyDTO } from "../types/request";
import type { Request } from "../types/request";
import { getConfig } from "../services/config";

function getBaseUrl(): string {
  return getConfig().value.baseUrl;
}

export function fetchCollections() {
  const url = `${getBaseUrl()}collections`;
  return fetch(url).then(data => data.json());
}

export async function fetchCollectionRequests(id: number) {
  try {
    const url = `${getBaseUrl()}collections/${id}/requests?apiKey=${import.meta.env.VITE_API_KEY}`;
    const data = await fetch(url);
    return data.json();
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function fetchRequest(req: Request): Promise<Response> {
  const transformedHeaders: Record<string, string[]> = {};
  Object.entries(req.headers).forEach(([key, values]) => {
    if (key && values && values.length > 0) {
      transformedHeaders[key] = Array.isArray(values) ? values : [String(values)];
    }
  });

  const data = {
    method: req.method,
    uri: req.uri,
    headers: transformedHeaders,
    body: req.method !== "GET" && req.method !== "HEAD" && req.body ? req.body : undefined
  };

  try {
    const proxyResponse = await fetch("https://supsi-ticket.cloudns.org/supsi-http-client/proxy/execute", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    return proxyResponse;
  } catch (error) {
    throw error;
  }
}

export async function addRequest(collectionId: number, requestBody: RequestAddDTO) {
  const url = `${getBaseUrl()}collections/${collectionId}/requests?apiKey=${import.meta.env.VITE_API_KEY}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...requestBody,
      collectionId,
    }),
  });

  if (!response.ok) {
    await response.text();
    throw new Error("Errore durante la creazione della richiesta");
  }
  return response.json();
}

export async function updateRequest(requestId: string, requestBody: RequestModifyDTO & { collectionId: number }) {
  const formattedRequest = {
    ...requestBody,
    headers: requestBody.headers || {}
  };

  const response = await fetch(
    `https://supsi-ticket.cloudns.org/supsi-http-client/bff/requests/${requestId}?apiKey=${import.meta.env.VITE_API_KEY}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formattedRequest), 
    }
  );

  if (!response.ok) {
    await response.text();
    throw new Error("Errore durante l'aggiornamento della richiesta");
  }
  return response.json();
}



export async function deleteRequest(id: string) {
  const url = `${getBaseUrl()}requests/${id}?apiKey=${import.meta.env.VITE_API_KEY}`;
  const response = await fetch(url, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error("Errore durante l'eliminazione");
  }
  return "Richiesta eliminata con successo.";
}