import type { Region } from "@/lib/regions";

const AIR_REGION_BY_SIDO: Record<string, string> = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  대전광역시: "대전",
  울산광역시: "울산",
  세종특별자치시: "세종",
  제주특별자치도: "제주",
  충청북도: "충북",
  충청남도: "충남",
  경상북도: "경북",
  경상남도: "경남",
  전북특별자치도: "전북",
};

const GWANGJU_DISTRICTS = ["동구", "서구", "남구", "북구", "광산구"];
const GANGWON_YEONGDONG = [
  "강릉시",
  "동해시",
  "태백시",
  "속초시",
  "삼척시",
  "고성군",
  "양양군",
];
const GYEONGGI_NORTH = [
  "의정부시",
  "동두천시",
  "구리시",
  "남양주시",
  "파주시",
  "양주시",
  "포천시",
  "연천군",
  "가평군",
];

/** 에어코리아 대기질 예보가 구분하는 권역 이름(informGrade의 지역 이름) */
export function airRegionOf(region: Region): string {
  const { sido, sigungu } = region;
  if (sido === "전남광주통합특별시")
    return GWANGJU_DISTRICTS.includes(sigungu) ? "광주" : "전남";
  if (sido === "강원특별자치도")
    return GANGWON_YEONGDONG.includes(sigungu) ? "영동" : "영서";
  if (sido === "경기도")
    return GYEONGGI_NORTH.includes(sigungu) || sigungu.startsWith("고양시")
      ? "경기북부"
      : "경기남부";
  return AIR_REGION_BY_SIDO[sido] ?? sido;
}
