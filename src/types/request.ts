export type RequestInput = Omit<Request, "id">;

export type Request = {
    id: string,
    name: string,
    uri: string,
    method: string,
    headers: Record<string, string[]>,
    body: string,
    collectionId?: number
}