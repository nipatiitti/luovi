// The panel speaks degrees and compass bearings, clockwise from north; the world frame and every renderer setting speak
// radians counter-clockwise from east. These are the only conversions between the two.

export const toRadians = (degrees: number): number => (degrees * Math.PI) / 180
export const toDegrees = (radians: number): number => (radians * 180) / Math.PI

/** A bearing in [0, 360). */
export const bearing = (degrees: number): number => ((degrees % 360) + 360) % 360

/** The world azimuth, rad counter-clockwise from east, of a compass bearing in degrees. */
export const azimuthOf = (compass: number): number => toRadians(90 - compass)
/** The compass bearing in degrees of a world azimuth. */
export const bearingOf = (azimuth: number): number => bearing(90 - toDegrees(azimuth))
