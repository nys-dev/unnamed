import { describe, expect, test } from "vitest";

import { findRegion, nearestRegion, searchRegions } from "./index";

describe("지역명 검색", () => {
  test("동 이름으로 찾으면 시도부터 동까지의 이름과 격자 좌표를 준다", () => {
    const [first] = searchRegions("청운효자동");

    expect(first).toMatchObject({
      areaNo: "1111051500",
      name: "서울특별시 종로구 청운효자동",
      nx: 60,
      ny: 127,
    });
  });

  test("띄어쓰기와 일부 단어만으로도 찾는다", () => {
    const names = searchRegions("종로구 청운").map((r) => r.name);

    expect(names).toContain("서울특별시 종로구 청운효자동");
  });

  test("빈 검색어는 결과가 없다", () => {
    expect(searchRegions("   ")).toEqual([]);
  });

  test("없는 지역명은 결과가 없다", () => {
    expect(searchRegions("존재하지않는동네")).toEqual([]);
  });

  test("결과는 최대 10개이다", () => {
    expect(searchRegions("동").length).toBeLessThanOrEqual(10);
  });

  test("더 짧은 상위 지역(시군구)이 하위 동보다 앞에 온다", () => {
    const [first] = searchRegions("종로구");

    expect(first.name).toBe("서울특별시 종로구");
  });
});

describe("지점 코드로 찾기", () => {
  test("행정구역코드로 지역을 찾는다", () => {
    expect(findRegion("1111051500")?.name).toBe("서울특별시 종로구 청운효자동");
  });

  test("모르는 코드는 undefined이다", () => {
    expect(findRegion("0000000000")).toBeUndefined();
  });
});

describe("현재 위치에서 가장 가까운 지역", () => {
  test("청운효자동 근처 좌표는 청운효자동이다", () => {
    expect(nearestRegion(37.5841, 126.9706).areaNo).toBe("1111051500");
  });
});
