import type { Coords } from "./types";

/**
 * Where a student actually walks to.
 *
 * "Distance to campus" flattens a 430-acre site into one point. UT runs from
 * Dean Keeton down past MLK, so a Computer Science student and a Law student
 * living in the same building have walks that differ by ten minutes or more.
 * Picking a major moves the destination to the building that major lives in.
 *
 * The coordinates are real: every one is the centre of a named building pulled
 * from OpenStreetMap. The mapping from major to building is a sensible
 * approximation rather than gospel — departments share buildings and move — so
 * treat each as "the building you would head for", and correcting one is a
 * one-line edit here.
 *
 * Worth knowing before adding entries: these are building centroids, so a route
 * ends by walking to whatever entrance the pedestrian network offers. That is
 * usually what you want, but it makes the numbers sensitive to placement — see
 * CAMPUS_DEFAULT below for a case where a 21-metre difference cost 7 minutes.
 */
export interface Major {
  id: string;
  label: string;
  building: string;
  coords: Coords;
}

/**
 * The Tower, used when no major is chosen.
 *
 * Deliberately the plaza just outside rather than the building centroid every
 * other entry uses. Routing snaps to the nearest walkable point, and a centroid
 * sits inside the building — for a specific major that is right, because you
 * are walking in through a door. "Campus in general" is not a door, and the
 * centroid here costs seven minutes and four tenths of a mile of detour on the
 * Dean Keeton listing alone. Two coordinates 21 metres apart, very different
 * answers.
 */
export const CAMPUS_DEFAULT: Major = {
  id: "campus",
  label: "Campus in general",
  building: "Main Building (the Tower)",
  coords: [-97.7394, 30.2862],
};

export const MAJORS: Major[] = [
  CAMPUS_DEFAULT,
  {
    id: "cs",
    label: "Computer Science",
    building: "Gates Computer Science Complex",
    coords: [-97.73645, 30.28625],
  },
  {
    id: "business",
    label: "Business",
    building: "McCombs School of Business",
    coords: [-97.73785, 30.28421],
  },
  {
    id: "engineering",
    label: "Engineering (general)",
    building: "Engineering Education and Research Center",
    coords: [-97.73534, 30.28837],
  },
  {
    id: "aerospace",
    label: "Aerospace Engineering",
    building: "Aerospace Engineering Building",
    coords: [-97.73756, 30.29113],
  },
  {
    id: "chemeng",
    label: "Chemical Engineering",
    building: "Chemical and Petroleum Engineering Building",
    coords: [-97.73614, 30.29023],
  },
  {
    id: "biomedeng",
    label: "Biomedical Engineering",
    building: "Biomedical Engineering Building",
    coords: [-97.73851, 30.28912],
  },
  {
    id: "journalism",
    label: "Journalism and Media",
    building: "Belo Center for New Media",
    coords: [-97.74076, 30.29017],
  },
  {
    id: "rtf",
    label: "Radio-Television-Film",
    building: "Jesse H. Jones Communication Center",
    coords: [-97.74074, 30.28942],
  },
  {
    id: "biology",
    label: "Biology",
    building: "Biological Laboratories",
    coords: [-97.73976, 30.28722],
  },
  {
    id: "chemistry",
    label: "Chemistry",
    building: "Robert A. Welch Hall",
    coords: [-97.73781, 30.28647],
  },
  {
    id: "physics",
    label: "Physics, Maths and Astronomy",
    building: "Physics, Math, and Astronomy Building",
    coords: [-97.73632, 30.28885],
  },
  {
    id: "geosciences",
    label: "Geosciences",
    building: "Jackson Geological Sciences Building",
    coords: [-97.7356, 30.28587],
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    building: "Pharmacy Building",
    coords: [-97.7386, 30.28816],
  },
  {
    id: "law",
    label: "Law",
    building: "Townes Hall",
    coords: [-97.7308, 30.28854],
  },
  {
    id: "education",
    label: "Education",
    building: "George I. Sánchez Building",
    coords: [-97.73876, 30.28168],
  },
  {
    id: "architecture",
    label: "Architecture",
    building: "Goldsmith Hall",
    coords: [-97.74115, 30.28541],
  },
  {
    id: "finearts",
    label: "Fine Arts",
    building: "E. William Doty Fine Arts Building",
    coords: [-97.73177, 30.28585],
  },
  {
    id: "art",
    label: "Art and Art History",
    building: "Art Building and Museum",
    coords: [-97.73296, 30.28616],
  },
  {
    id: "music",
    label: "Music",
    building: "Music Building East",
    coords: [-97.73134, 30.28735],
  },
  {
    id: "history",
    label: "History",
    building: "Garrison Hall",
    coords: [-97.73849, 30.28514],
  },
  {
    id: "english",
    label: "English",
    building: "Calhoun Hall",
    coords: [-97.74018, 30.28449],
  },
  {
    id: "psychology",
    label: "Psychology and Government",
    building: "Patton Hall",
    coords: [-97.73532, 30.28492],
  },
  {
    id: "liberalarts",
    label: "Liberal Arts (general)",
    building: "Mezes Hall",
    coords: [-97.73896, 30.28437],
  },
];

export const majorById = (id: string): Major =>
  MAJORS.find((major) => major.id === id) ?? CAMPUS_DEFAULT;
