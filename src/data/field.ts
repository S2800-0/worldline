// Places in the Hubble image, as fractions of its width and height. Nothing marks
// them. They turn up when the gravity well passes over.
export interface FieldObject {
  id: string;
  u: number;
  v: number;
  note: string;
}

export const BOX: FieldObject = {
  id: "box",
  u: 0.445,
  v: 0.585,
  note: "Not in any catalogue. Small, blue, and it wasn't here last time. Click it.",
};

export const fieldObjects: FieldObject[] = [
  BOX,
  {
    id: "star",
    u: 0.81,
    v: 0.67,
    note: "A star in our own galaxy, standing in the way. Nearly everything else here is a galaxy.",
  },
  {
    id: "old",
    u: 0.775,
    v: 0.545,
    note: "An old galaxy. It stopped making new stars some time ago and seems fine.",
  },
  {
    id: "spiral",
    u: 0.058,
    v: 0.47,
    note: "A spiral, face on. Anyone there looking back at us would be billions of years out of date.",
  },
  {
    id: "red",
    u: 0.088,
    v: 0.85,
    note: "The faintest red specks are some of the oldest light here, about 13 billion years. Hubble looked for about eleven days to catch it.",
  },
  {
    id: "empty",
    u: 0.63,
    v: 0.76,
    note: "Nothing here. That's what this patch of sky looked like before anyone pointed Hubble at it.",
  },
];
