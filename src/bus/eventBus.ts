import mitt from "mitt";
import type {Emitter} from "mitt";
import type { Request } from "../types/request";

type Events = {
  "request-selected": Request;
  "request-modified": Request;
  "request-start": number; 
  "new-response": { response: Response; executionTime: number };
  "request-error": any;
  "request-saved": Request;
  "request-deleted": { collectionId: number; requestId: string };
  "response-click": { 
    statusCode: number;
    statusText: string;
    headers: Record<string, string>; 
    body: string; 
    contentType: string;
    size?: number;
    time?: number;
  };
  "live-request-update": Request;
  "request-submitted": Request;
};
const eventBus: Emitter<Events> = mitt();

export default eventBus;