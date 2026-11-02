export interface Moment {
  id: string;
  date: string;
  name: string;
  angle: number;
  message: string;
  really: string;
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
    really: "I was 7 or 8. It's why this website has a time machine.",
    refusal: "You can't change this one. No Doctor Who in 2007, no time machine on my website.",
  },
  {
    id: "devops",
    date: "2026",
    name: "Entered DevOps Day",
    angle: 0,
    message: "Don't enter DevOps Day.",
    really: "My teammate and I entered on a whim and took 1st place in the student track.",
    target: "/worldline/chrono-archivist/",
  },
  {
    id: "samsung",
    date: "Jul 2026",
    name: "Joined Samsung Innovation Campus",
    angle: 60,
    message: "Don't join Samsung Innovation Campus.",
    really: "Four months of data engineering and 15+ projects.",
    target: "/worldline/data-alchemist/",
  },
];
