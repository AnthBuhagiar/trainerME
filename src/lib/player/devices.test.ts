import { describe, expect, test } from "vitest";
import { forgetSensor, loadSensors, rememberSensor } from "@/lib/player/devices";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe("remembered sensors", () => {
  test("pairing is kept per kind, and forgetting one keeps the other", () => {
    const s = memory();
    rememberSensor("trainer", { id: "abc", name: "KICKR CORE 1234" }, s, new Date("2026-10-26T00:00:00Z"));
    rememberSensor("hr", { id: "def" }, s);
    expect(loadSensors(s).trainer).toMatchObject({ id: "abc", name: "KICKR CORE 1234", pairedAt: "2026-10-26T00:00:00.000Z" });
    expect(loadSensors(s).hr?.name).toBe("Heart rate"); // unnamed straps get a label
    forgetSensor("trainer", s);
    expect(loadSensors(s)).toEqual({ hr: expect.objectContaining({ id: "def" }) });
  });

  test("ignores missing or broken storage", () => {
    expect(loadSensors(null)).toEqual({});
    const s = memory();
    s.setItem("hour-power:sensors", "{not json");
    expect(loadSensors(s)).toEqual({});
    s.setItem("hour-power:sensors", JSON.stringify({ trainer: { id: 3 } }));
    expect(loadSensors(s)).toEqual({});
  });
});

describe("sensors connected in Settings", () => {
  test("are handed to the ride, even where the browser can't list remembered devices", async () => {
    const { handOver, rememberedDevice } = await import("@/lib/player/devices");
    const strap = { id: "strap-1", name: "Polar H10" } as BluetoothDevice;
    expect(await rememberedDevice("hr")).toBeNull();
    handOver("hr", strap);
    expect(await rememberedDevice("hr")).toBe(strap);
    expect(await rememberedDevice("trainer")).toBeNull();
  });
});
