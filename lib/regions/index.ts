import data from "./regions.json";

export type Region = {
  /** 기상청 행정구역코드 10자리. 자외선 지수 조회에 쓴다. */
  areaNo: string;
  sido: string;
  sigungu: string;
  dong: string;
  /** 동네예보 격자 좌표 */
  nx: number;
  ny: number;
  lat: number;
  lon: number;
  /** "서울특별시 종로구 청운효자동"처럼 시도부터 이어 붙인 이름 */
  name: string;
};

// 이어도는 사람이 달릴 수 있는 곳이 아니므로 뺀다.
const regions: Region[] = data.rows
  .filter((row) => row[1] !== "이어도")
  .map(([areaNo, sido, sigungu, dong, nx, ny, lat, lon]) => ({
    areaNo: areaNo as string,
    sido: sido as string,
    sigungu: sigungu as string,
    dong: dong as string,
    nx: nx as number,
    ny: ny as number,
    lat: lat as number,
    lon: lon as number,
    name: [sido, sigungu, dong].filter(Boolean).join(" "),
  }));

const squashed = regions.map((r) => r.name.replace(/\s/g, ""));
const levelOf = (r: Region) => [r.sido, r.sigungu, r.dong].filter(Boolean).length;

const MAX_RESULTS = 10;

export function searchRegions(query: string): Region[] {
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  return regions
    .map((region, index) => ({ region, index }))
    .filter(({ index }) => tokens.every((t) => squashed[index].includes(t)))
    .sort((a, b) => levelOf(a.region) - levelOf(b.region) || a.index - b.index)
    .slice(0, MAX_RESULTS)
    .map(({ region }) => region);
}

export function findRegion(areaNo: string): Region | undefined {
  return regions.find((r) => r.areaNo === areaNo);
}

/** 동 단위 지점 중 가장 가까운 곳. 거리는 위경도 차이로 근사한다. */
export function nearestRegion(lat: number, lon: number): Region {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let best = regions[0];
  let bestDistance = Infinity;
  for (const region of regions) {
    if (!region.dong) continue;
    const dy = region.lat - lat;
    const dx = (region.lon - lon) * cosLat;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      best = region;
      bestDistance = distance;
    }
  }
  return best;
}
