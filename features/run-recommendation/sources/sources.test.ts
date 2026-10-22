import { describe, expect, test } from "vitest";

import {
  parseDustGrade,
  parseForecast,
  parseHolidays,
  parseUvIndex,
} from "./parse";
import { latestForecastBase } from "./data-go-kr";

const item = (
  fcstDate: string,
  fcstTime: string,
  category: string,
  fcstValue: string,
) => ({ baseDate: "20261022", baseTime: "1100", category, fcstDate, fcstTime, fcstValue, nx: 60, ny: 127 });

describe("기상청 단기예보 응답", () => {
  const response = {
    response: {
      header: { resultCode: "00", resultMsg: "NORMAL_SERVICE" },
      body: {
        items: {
          item: [
            item("20261022", "1900", "TMP", "13"),
            item("20261022", "1900", "WSD", "2.2"),
            item("20261022", "1900", "POP", "30"),
            item("20261022", "1900", "SKY", "1"),
            item("20261023", "0800", "TMP", "-2"),
            item("20261023", "0800", "WSD", "5.1"),
            item("20261023", "0800", "POP", "0"),
          ],
        },
      },
    },
  };

  test("날짜와 시간별로 기온, 풍속, 강수확률만 뽑는다", () => {
    expect(parseForecast(response)).toEqual([
      { date: "2026-10-22", hour: 19, temperature: 13, windSpeed: 2.2, precipitationProbability: 30 },
      { date: "2026-10-23", hour: 8, temperature: -2, windSpeed: 5.1, precipitationProbability: 0 },
    ]);
  });

  test("정상 응답이 아니면 오류로 본다", () => {
    expect(() =>
      parseForecast({ response: { header: { resultCode: "03", resultMsg: "NO_DATA" } } }),
    ).toThrow(/NO_DATA/);
  });
});

describe("기상청 자외선 지수 응답", () => {
  // 오늘 0시를 기준으로 3시간마다의 값. h72, h75는 아직 값이 없다.
  const response = {
    response: {
      header: { resultCode: "00", resultMsg: "NORMAL_SERVICE" },
      body: {
        items: {
          item: [
            {
              code: "A07_2", areaNo: "1111051500", date: "2026102200",
              h0: "0", h3: "0", h6: "1", h9: "4", h12: "5", h15: "2", h18: "0", h21: "0",
              h24: "0", h27: "0", h30: "0", h33: "2", h36: "4", h39: "2", h42: "0", h45: "0",
              h48: "0", h51: "0", h54: "0", h57: "3", h60: "4", h63: "2", h66: "0", h69: "0",
              h72: "", h75: "",
            },
          ],
        },
      },
    },
  };

  test("3시간 값을 가장 가까운 정각 값으로 시간별로 펼친다", () => {
    const uv = parseUvIndex(response);

    // 12시 값은 5이고, 11시와 13시도 가장 가까운 12시 값을 쓴다.
    expect(uv.get("2026-10-22T12")).toBe(5);
    expect(uv.get("2026-10-22T11")).toBe(5);
    expect(uv.get("2026-10-22T13")).toBe(5);
    // 다음 날 12시는 h36이다.
    expect(uv.get("2026-10-23T12")).toBe(4);
  });

  test("값이 비어 있는 시간은 넣지 않는다", () => {
    const uv = parseUvIndex(response);

    expect(uv.has("2026-10-25T00")).toBe(false);
  });
});

describe("에어코리아 대기질 예보 응답", () => {
  const forecast = (informData: string, dataTime: string, grades: string) => ({
    informData,
    dataTime,
    informGrade: grades,
  });

  test("해당 날짜의 가장 최근 발표에서 권역의 등급을 읽는다", () => {
    const items = [
      forecast("2026-10-23", "2026-10-22 05시 발표", "서울 : 보통,제주 : 좋음"),
      forecast("2026-10-23", "2026-10-22 11시 발표", "서울 : 나쁨,제주 : 좋음"),
    ];

    expect(parseDustGrade({ PM10: items }, "2026-10-23", "서울")).toBe("나쁨");
  });

  test("미세먼지와 초미세먼지 중 나쁜 쪽 등급을 쓴다", () => {
    const pm10 = [forecast("2026-10-23", "2026-10-22 11시 발표", "서울 : 보통")];
    const pm25 = [forecast("2026-10-23", "2026-10-22 11시 발표", "서울 : 매우나쁨")];

    expect(parseDustGrade({ PM10: pm10, PM25: pm25 }, "2026-10-23", "서울")).toBe("매우나쁨");
  });

  test("한쪽만 받았으면 받은 쪽 등급을 쓴다", () => {
    const pm10 = [forecast("2026-10-23", "2026-10-22 11시 발표", "서울 : 보통")];

    expect(parseDustGrade({ PM10: pm10 }, "2026-10-23", "서울")).toBe("보통");
  });

  test("그 날짜의 예보가 아직 없으면 undefined이다", () => {
    const pm10 = [forecast("2026-10-22", "2026-10-22 11시 발표", "서울 : 좋음")];

    expect(parseDustGrade({ PM10: pm10 }, "2026-10-24", "서울")).toBeUndefined();
  });

  test("권역이 응답에 없으면 undefined이다", () => {
    const pm10 = [forecast("2026-10-23", "2026-10-22 11시 발표", "서울 : 좋음")];

    expect(parseDustGrade({ PM10: pm10 }, "2026-10-23", "제주")).toBeUndefined();
  });
});

describe("특일 정보 응답", () => {
  test("휴일 여부가 Y인 날짜를 YYYY-MM-DD로 모은다", () => {
    const response = {
      response: {
        header: { resultCode: "00" },
        body: {
          items: {
            item: [
              { dateName: "개천절", isHoliday: "Y", locdate: 20261003 },
              { dateName: "대체공휴일(개천절)", isHoliday: "Y", locdate: 20261005 },
              { dateName: "어떤 기념일", isHoliday: "N", locdate: 20261010 },
            ],
          },
        },
      },
    };

    expect([...parseHolidays(response)]).toEqual(["2026-10-03", "2026-10-05"]);
  });

  test("공휴일이 없는 달은 비어 있다", () => {
    const response = { response: { header: { resultCode: "00" }, body: { items: "", totalCount: 0 } } };

    expect(parseHolidays(response).size).toBe(0);
  });
});

describe("단기예보 발표 시각", () => {
  test.each([
    ["2026-10-22T12:44", "20261022", "1100"],
    ["2026-10-22T11:14", "20261022", "0800"],
    ["2026-10-22T11:15", "20261022", "1100"],
    ["2026-10-22T02:10", "20261021", "2300"],
    ["2026-10-22T23:59", "20261022", "2300"],
  ])("%s이면 %s %s 발표를 쓴다", (now, baseDate, baseTime) => {
    expect(latestForecastBase(now)).toEqual({ baseDate, baseTime });
  });
});
