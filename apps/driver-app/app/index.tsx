import { ASSIGNMENT_STATUSES } from "@spaceman/app-core";
import { isAppError } from "@spaceman/app-errors";
import type { IdentitySession } from "@spaceman/app-types";
import { spacemanTokens } from "@spaceman/app-ui";
import { evaluateIdentityAccess } from "@spaceman/shared/auth";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { driverIdentityService } from "../src/identity";

export default function DriverHomeScreen() {
  const [session, setSession] = useState<IdentitySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => driverIdentityService.subscribe(
    (nextSession) => {
      setSession(nextSession);
      setLoading(false);
    },
    (nextError) => {
      setError(nextError.userMessage);
      setLoading(false);
    }
  ), []);

  async function run(action: () => Promise<unknown>, successMessage = "") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
    } catch (caught) {
      setError(isAppError(caught) ? caught.userMessage : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const access = evaluateIdentityAccess(session, ["driver"], false);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>SPACEMAN / DRIVER APP</Text>
        <Text style={styles.title}>{access.granted ? "Delivery operations" : "Driver sign in"}</Text>
        <Text style={styles.body}>
          Driver access is invitation-only. Location publishing remains limited to an assigned,
          foreground active delivery.
        </Text>
        {loading ? <ActivityIndicator accessibilityLabel="Restoring session" color={spacemanTokens.color.brand} /> : null}
        {error ? <Text accessibilityRole="alert" style={[styles.message, styles.error]}>{error}</Text> : null}
        {notice ? <Text style={[styles.message, styles.success]}>{notice}</Text> : null}

        {!loading && access.reason === "guest" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Invited driver account</Text>
            <Field label="Email" value={email} onChangeText={setEmail} autoComplete="email" inputMode="email" />
            <Field label="Password" value={password} onChangeText={setPassword} autoComplete="current-password" secureTextEntry />
            <Button disabled={busy} label="Sign in" onPress={() => void run(() => driverIdentityService.signIn(email, password))} />
            <Button
              disabled={busy}
              label="Accept invitation or reset password"
              secondary
              onPress={() => void run(
                () => driverIdentityService.sendStaffSetupLink(email),
                "If the invited account exists, a secure setup link has been requested."
              )}
            />
          </View>
        ) : null}

        {!loading && session && access.reason === "profile_missing" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Synchronize account claims</Text>
            <Button disabled={busy} label="Synchronize account" onPress={() => void run(() => driverIdentityService.syncClaims())} />
          </View>
        ) : null}

        {!loading && session && (access.reason === "inactive" || access.reason === "wrong_role") ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Driver access unavailable</Text>
            <Text style={styles.cardBody}>Role: {session.profile?.role ?? "missing"} · Status: {session.profile?.status ?? "missing"}</Text>
            <Text style={styles.cardBody}>Invited accounts remain blocked until an administrator activates them.</Text>
            <Button disabled={busy} label="Sign out" onPress={() => void run(() => driverIdentityService.signOut())} />
          </View>
        ) : null}

        {access.granted ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Driver identity ready</Text>
              <Text style={styles.cardBody}>Signed in as {session?.email}.</Text>
              <Text style={styles.cardBody}>Delivery zones: {session?.claims?.deliveryZoneIds.join(", ") || "none assigned"}.</Text>
              <Button disabled={busy} label="Sign out" onPress={() => void run(() => driverIdentityService.signOut())} />
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Assignment states remain independent of fulfillment.</Text>
              <Text style={styles.cardBody}>{ASSIGNMENT_STATUSES.join(" · ")}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}

function Button({ label, onPress, disabled = false, secondary = false }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, secondary && styles.buttonSecondary, disabled && styles.buttonDisabled]}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  autoComplete: "email" | "current-password";
  inputMode?: "email";
  secureTextEntry?: boolean;
}

function Field({ label, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...inputProps} autoCapitalize="none" style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#F5F7F8", flex: 1 },
  content: { gap: 16, padding: 24, paddingBottom: 48 },
  eyebrow: { color: spacemanTokens.color.brand, fontSize: 12, fontWeight: "700", letterSpacing: 1.2, marginTop: 32 },
  title: { color: spacemanTokens.color.ink, fontSize: 36, fontWeight: "700", lineHeight: 42 },
  body: { color: "#46545C", fontSize: 17, lineHeight: 25 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#D8E1E5", borderRadius: 12, borderWidth: 1, gap: 12, padding: 18 },
  cardTitle: { color: spacemanTokens.color.ink, fontSize: 20, fontWeight: "700" },
  cardBody: { color: "#46545C", fontSize: 15, lineHeight: 22 },
  field: { gap: 6 },
  label: { color: spacemanTokens.color.ink, fontSize: 14, fontWeight: "700" },
  input: { backgroundColor: "#FFFFFF", borderColor: "#AEBCC4", borderRadius: 8, borderWidth: 1, fontSize: 16, paddingHorizontal: 12, paddingVertical: 10 },
  button: { alignItems: "center", backgroundColor: spacemanTokens.color.brand, borderColor: spacemanTokens.color.brand, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11 },
  buttonSecondary: { backgroundColor: "#FFFFFF" },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  buttonTextSecondary: { color: spacemanTokens.color.brand },
  message: { borderRadius: 8, padding: 12 },
  error: { backgroundColor: "#FCE8EC", color: "#8D1F35" },
  success: { backgroundColor: "#E5F5EE", color: "#126342" }
});
