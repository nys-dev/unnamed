import { describe, expect, test } from "vitest";

import { searchRegions } from "@/lib/regions";

import { airRegionOf } from "./air-region";

describe("에어코리아 예보 권역", () => {
  test.each([
    ["서울특별시 종로구 청운효자동", "서울"],
    ["강원특별자치도 강릉시", "영동"],
    ["강원특별자치도 춘천시", "영서"],
    ["경기도 고양시덕양구", "경기북부"],
    ["경기도 수원시장안구", "경기남부"],
    ["전남광주통합특별시 서구", "광주"],
    ["전남광주통합특별시 목포시", "전남"],
    ["제주특별자치도 제주시", "제주"],
  ])("%s은(는) %s 권역이다", (name, airRegion) => {
    const region = searchRegions(name).find((r) => r.name === name);

    expect(region).toBeDefined();
    expect(airRegionOf(region!)).toBe(airRegion);
  });
});
