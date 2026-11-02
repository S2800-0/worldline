export interface Moment {
  id: string;
  date: string;
  name: string;
  angle: number;
  message: string;
  target?: string;
  refusal?: string;
}

export const moments: Moment[] = [
  {
    id: "fixed",
    date: "Nov 2007",
    name: "Started watching Doctor Who",
    angle: -60,
    message: "Don't watch Doctor Who.",
    refusal: "You can't change this one. No Doctor Who in 2007, no time machine on my website.",
  },
  {
    id: "devops",
    date: "2026",
    name: "Entered DevOps Day",
    angle: 0,
    message: "Don't enter DevOps Day.",
    target: "/worldline/chrono-archivist/",
  },
  {
    id: "samsung",
    date: "Jul 2026",
    name: "Joined Samsung Innovation Campus",
    angle: 60,
    message: "Don't join Samsung Innovation Campus.",
    target: "/worldline/data-alchemist/",
  },
];
