"use client";

import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { createRunAction, type RunFormState } from "../actions";
import { DISSATISFACTION_ITEMS } from "../validate-run";

const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
const START_HOURS = Array.from({ length: 24 }, (_, i) => i);
const END_HOURS = Array.from({ length: 24 }, (_, i) => i + 1);

export function RunForm({
  areaNo,
  regionName,
  today,
  earliestDate,
}: {
  areaNo?: string;
  regionName?: string;
  /** YYYY-MM-DD */
  today: string;
  /** 기록할 수 있는 가장 이른 날짜 */
  earliestDate: string;
}) {
  const [state, formAction, pending] = useActionState<RunFormState, FormData>(
    createRunAction,
    {},
  );
  const [satisfied, setSatisfied] = useState<"yes" | "no" | "">("");
  const [items, setItems] = useState<string[]>([]);

  const toggle = (item: string, checked: boolean) =>
    setItems((current) =>
      checked ? [...current, item] : current.filter((i) => i !== item),
    );

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="runDate">날짜</FieldLabel>
          <Input
            id="runDate"
            name="runDate"
            type="date"
            defaultValue={today}
            min={earliestDate}
            max={today}
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="startHour">시작</FieldLabel>
            <NativeSelect id="startHour" name="startHour" defaultValue="19">
              {START_HOURS.map((hour) => (
                <NativeSelectOption key={hour} value={hour}>
                  {hourLabel(hour)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="endHour">끝</FieldLabel>
            <NativeSelect id="endHour" name="endHour" defaultValue="20">
              {END_HOURS.map((hour) => (
                <NativeSelectOption key={hour} value={hour}>
                  {hourLabel(hour)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Field>
          <FieldLabel>지역</FieldLabel>
          <input type="hidden" name="areaNo" value={areaNo ?? ""} />
          <p className="text-sm">
            {regionName ?? (
              <span className="text-muted-foreground">
                위에서 지역을 검색해 골라 주세요.
              </span>
            )}
          </p>
        </Field>

        <FieldSet>
          <FieldLegend variant="label">오늘 러닝은 어땠나요?</FieldLegend>
          <input type="hidden" name="satisfied" value={satisfied} />
          <RadioGroup
            value={satisfied}
            onValueChange={(value) => setSatisfied(value as "yes" | "no")}
            className="flex gap-6"
          >
            <Field orientation="horizontal">
              <RadioGroupItem value="yes" id="satisfied-yes" />
              <FieldLabel htmlFor="satisfied-yes">만족</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="no" id="satisfied-no" />
              <FieldLabel htmlFor="satisfied-no">불만족</FieldLabel>
            </Field>
          </RadioGroup>
        </FieldSet>

        {satisfied === "no" && (
          <FieldSet>
            <FieldLegend variant="label">불만족한 항목 (고르지 않아도 됩니다)</FieldLegend>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {DISSATISFACTION_ITEMS.map((item) => (
                <Field key={item} orientation="horizontal" className="w-auto">
                  <Checkbox
                    id={`item-${item}`}
                    checked={items.includes(item)}
                    onCheckedChange={(checked) => toggle(item, checked)}
                  />
                  <FieldLabel htmlFor={`item-${item}`}>{item}</FieldLabel>
                </Field>
              ))}
            </div>
            {items.map((item) => (
              <input key={item} type="hidden" name="dissatisfaction" value={item} />
            ))}
          </FieldSet>
        )}

        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        {state.saved && (
          <Alert>
            <AlertDescription>기록했습니다.</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "기록 중…" : "기록 남기기"}
        </Button>
      </FieldGroup>
    </form>
  );
}
