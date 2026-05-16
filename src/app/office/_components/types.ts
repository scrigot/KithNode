// Shared client/server types for the /office route.

export type RoomPosition = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type RoomStatus = "idle" | "active" | "working";

export type OfficeRoom = {
  id: string;
  slug: string;
  name: string;
  role: string;
  floor: number;
  adapterType: string;
  position: RoomPosition;
  status: RoomStatus;
};

export type OfficeEvent = {
  id: string;
  roomId: string;
  roomName: string;
  kind: string;
  summary: string;
  createdAt: string;
};
