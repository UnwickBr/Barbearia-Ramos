export type ApiRequest = {
  method?: string;
  body?: unknown;
  headers: {
    cookie?: string;
    [key: string]: string | string[] | undefined;
  };
  on: (event: string, callback: (chunk?: any) => void) => void;
};

export type ApiResponse = {
  status: (code: number) => ApiResponse;
  setHeader: (name: string, value: string) => ApiResponse | void;
  send: (body: string) => void;
};
