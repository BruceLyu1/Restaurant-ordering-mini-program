
import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { readStorage, writeStorage } from "../services/storage";

export function useLocalState<T>(
  key: string,
  initialValue: T | (() => T),
  eventName?: string,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStorage<T>(
    key,
    typeof initialValue === "function" ? (initialValue as () => T)() : initialValue,
  ));

  useEffect(() => {
    writeStorage(key, value, eventName);
  }, [eventName, key, value]);

  return [value, setValue];
}
