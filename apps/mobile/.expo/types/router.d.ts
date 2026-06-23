/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth)` | `/(auth)/biometrics` | `/(auth)/forgot-password` | `/(auth)/login` | `/(auth)/pin-lock` | `/(auth)/signup` | `/(tabs)` | `/(tabs)/` | `/(tabs)/home` | `/(tabs)/notebooks` | `/(tabs)/notifications` | `/(tabs)/search` | `/(tabs)/settings` | `/(tabs)/study` | `/_sitemap` | `/ai/chat` | `/ai/generate` | `/ai/summarize` | `/audio/recorder` | `/biometrics` | `/camera/scanner` | `/forgot-password` | `/home` | `/login` | `/media/audio-recorder` | `/media/gallery-picker` | `/media/pdf-viewer` | `/media/scanner` | `/notebooks` | `/notes/create` | `/notes/history` | `/notes/templates` | `/notes/trash` | `/notifications` | `/onboarding/features` | `/onboarding/paywall` | `/onboarding/setup-profile` | `/onboarding/welcome` | `/pin-lock` | `/premium/manage` | `/premium/upgrade` | `/search` | `/settings` | `/share/intent` | `/signup` | `/study` | `/study/spaced-repetition`;
      DynamicRoutes: `/folders/${Router.SingleRoutePart<T>}` | `/notebooks/${Router.SingleRoutePart<T>}` | `/notes/${Router.SingleRoutePart<T>}` | `/study/flashcards/${Router.SingleRoutePart<T>}` | `/study/quiz/${Router.SingleRoutePart<T>}` | `/tags/${Router.SingleRoutePart<T>}` | `/workspaces/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/folders/[id]` | `/notebooks/[id]` | `/notes/[id]` | `/study/flashcards/[deckId]` | `/study/quiz/[quizId]` | `/tags/[id]` | `/workspaces/[id]`;
    }
  }
}
