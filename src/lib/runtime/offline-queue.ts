"use client";

type QueueItem = {
  id: string;
  url: string;
  method: "POST";
  body: unknown;
  createdAt: number;
};

const STORAGE_KEY = "survey-lab-offline-queue-v1";

function loadQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(items: QueueItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-500)));
}

export function enqueueRequest(item: Omit<QueueItem, "createdAt">) {
  const queue = loadQueue();
  queue.push({ ...item, createdAt: Date.now() });
  saveQueue(queue);
}

export async function flushQueue() {
  const queue = loadQueue();
  if (!queue.length) return { flushed: 0, remaining: 0 };

  const remaining: QueueItem[] = [];
  let flushed = 0;

  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { "Content-Type": "application/json", "x-request-id": item.id },
        body: JSON.stringify(item.body),
      });
      if (!res.ok) throw new Error("non-200");
      flushed += 1;
    } catch {
      remaining.push(item);
    }
  }

  saveQueue(remaining);
  return { flushed, remaining: remaining.length };
}
