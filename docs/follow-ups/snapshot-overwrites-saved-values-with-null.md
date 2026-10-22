# 날씨 값 저장이 이전 값을 null로 덮어씀

- 증상: 다시 연 추천 화면에서 자외선이나 미세먼지 조회가 실패하면, 이미 저장된 같은 시간의 값이 null로 바뀐다.
- 근거: `features/run-log/data.ts`의 `saveWeatherSnapshots`가 없는 값을 `null`로 만들어 upsert한다.
- 다음 단계: 값이 있는 열만 갱신하도록 바꾸거나, 기존 행을 읽어 값이 없는 열은 그대로 둔다.
