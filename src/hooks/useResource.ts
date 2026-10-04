import { useEffect, useState } from "react";
import { api } from "../api/http";
import { errorMessage } from "../lib/format";

export function useResource<T>(url: string, revision = 0) {
  const [state, setState] = useState<{
    url: string;
    revision: number;
    data: T | null;
    loading: boolean;
    error: string;
  }>({ url, revision, data: null, loading: true, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    api
      .get<T>(url, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted)
          setState({
            url,
            revision,
            data: response.data,
            loading: false,
            error: "",
          });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            url,
            revision,
            data: null,
            loading: false,
            error: errorMessage(error),
          });
      });
    return () => controller.abort();
  }, [url, revision]);
  return state.url === url && state.revision === revision
    ? state
    : { data: null, loading: true, error: "" };
}
export function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
