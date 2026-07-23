import {
  createSpacemanQueryClient,
  QueryClientProvider,
} from "@spaceman/app-query";
import { Stack } from "expo-router";

const queryClient = createSpacemanQueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
