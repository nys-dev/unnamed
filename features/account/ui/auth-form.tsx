"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { signIn, signUp, type FormState } from "../actions";

const COPY = {
  signin: {
    title: "로그인",
    description: "이메일과 비밀번호로 로그인합니다.",
    submit: "로그인",
    switchText: "계정이 없나요?",
    switchLabel: "가입하기",
    switchHref: "/login?mode=signup",
    action: signIn,
    autoComplete: "current-password",
  },
  signup: {
    title: "가입",
    description: "이메일과 비밀번호로 계정을 만듭니다.",
    submit: "가입하기",
    switchText: "이미 계정이 있나요?",
    switchLabel: "로그인하기",
    switchHref: "/login",
    action: signUp,
    autoComplete: "new-password",
  },
} as const;

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const copy = COPY[mode];
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    copy.action,
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-lg font-semibold">{copy.title}</h1>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">이메일</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">비밀번호</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={copy.autoComplete}
                minLength={6}
                required
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
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "처리 중…" : copy.submit}
          </Button>
          <p className="text-sm text-muted-foreground">
            {copy.switchText}{" "}
            <Link
              href={copy.switchHref}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {copy.switchLabel}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
