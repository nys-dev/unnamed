"use client";

import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { updateDisplayName, type FormState } from "../actions";

export function SettingsForm({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateDisplayName,
    {},
  );

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="displayName">표시 이름</FieldLabel>
          <Input
            // 저장하면 서버가 새 값을 내려 주므로, 값이 바뀌면 입력을 다시 만든다.
            key={displayName}
            id="displayName"
            name="displayName"
            defaultValue={displayName}
            maxLength={50}
            autoComplete="nickname"
          />
        </Field>
        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        {state.message && (
          <Alert>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "저장 중…" : "저장"}
        </Button>
      </FieldGroup>
    </form>
  );
}
