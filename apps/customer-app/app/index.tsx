import { formatMoney } from "@spaceman/app-core";
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

import { customerIdentityService } from "../src/identity";

const steps = ["Browse active stores", "Validate address and fee", "Pay securely", "Track fulfillment"];

export default function CustomerHomeScreen() {
  const [session, setSession] = useState<IdentitySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => customerIdentityService.subscribe(
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

  const access = evaluateIdentityAccess(session, ["customer"]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.page}
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>SPACEMAN / CUSTOMER APP</Text>
        <Text style={styles.title}>Marketplace foundation</Text>
        <Text style={styles.body}>
          Browse as a guest. Verified customer identity is required before checkout.
        </Text>
        {steps.map((step) => (
          <View key={step} style={styles.row}>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.rowText}>{step}</Text>
          </View>
        ))}

        {loading ? <ActivityIndicator accessibilityLabel="Restoring session" color={spacemanTokens.color.brand} /> : null}
        {error ? <Text accessibilityRole="alert" style={[styles.message, styles.error]}>{error}</Text> : null}
        {notice ? <Text style={[styles.message, styles.success]}>{notice}</Text> : null}

        {!loading && access.reason === "guest" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Protected checkout</Text>
            <Text style={styles.cardBody}>Sign in or create an account when you are ready to continue.</Text>
            <Button label={showAccount ? "Hide account form" : "Continue to checkout"} onPress={() => setShowAccount((value) => !value)} />
            {showAccount ? (
              <View style={styles.form}>
                <View style={styles.modeRow}>
                  <Button label="Sign in" secondary={registering} onPress={() => setRegistering(false)} />
                  <Button label="Create account" secondary={!registering} onPress={() => setRegistering(true)} />
                </View>
                {registering ? (
                  <Field label="Name" value={displayName} onChangeText={setDisplayName} autoComplete="name" />
                ) : null}
                <Field label="Email" value={email} onChangeText={setEmail} autoComplete="email" inputMode="email" />
                <Field label="Password" value={password} onChangeText={setPassword} autoComplete={registering ? "new-password" : "current-password"} secureTextEntry />
                <Button
                  disabled={busy}
                  label={registering ? "Create customer account" : "Sign in"}
                  onPress={() => void run(
                    registering
                      ? () => customerIdentityService.registerCustomer({ displayName, email, password })
                      : () => customerIdentityService.signIn(email, password),
                    registering ? "Account created. Check your email for the verification link." : ""
                  )}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {!loading && access.reason === "email_unverified" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verify your email</Text>
            <Text style={styles.cardBody}>Open the link sent to {session?.email}, then refresh.</Text>
            <Button disabled={busy} label="Resend verification email" onPress={() => void run(() => customerIdentityService.resendVerification(), "Verification email sent.")} />
            <Button disabled={busy} label="I verified — refresh" secondary onPress={() => void run(() => customerIdentityService.syncClaims())} />
            <Button disabled={busy} label="Sign out" secondary onPress={() => void run(() => customerIdentityService.signOut())} />
          </View>
        ) : null}

        {!loading && session && access.reason === "profile_missing" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Synchronize account</Text>
            <Text style={styles.cardBody}>The canonical profile or role claims are not ready.</Text>
            <Button disabled={busy} label="Synchronize account" onPress={() => void run(() => customerIdentityService.syncClaims())} />
          </View>
        ) : null}

        {!loading && session && (access.reason === "inactive" || access.reason === "wrong_role") ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Customer access unavailable</Text>
            <Text style={styles.cardBody}>Role: {session.profile?.role ?? "missing"} · Status: {session.profile?.status ?? "missing"}</Text>
            <Button disabled={busy} label="Sign out" onPress={() => void run(() => customerIdentityService.signOut())} />
          </View>
        ) : null}

        {access.granted ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Customer account ready</Text>
            <Text style={styles.cardBody}>Signed in as {session?.email}. Protected actions are unlocked.</Text>
            <Button disabled={busy} label="Sign out" onPress={() => void run(() => customerIdentityService.signOut())} />
          </View>
        ) : null}
        <Text style={styles.footer}>Money is stored in minor units: {formatMoney(0)}.</Text>
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
  autoComplete: "email" | "name" | "new-password" | "current-password";
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
  body: { color: "#46545C", fontSize: 17, lineHeight: 25, marginBottom: 8 },
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
  dot: { color: spacemanTokens.color.brand, fontSize: 20 },
  rowText: { color: spacemanTokens.color.ink, fontSize: 16 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#D8E1E5", borderRadius: 12, borderWidth: 1, gap: 12, marginTop: 12, padding: 18 },
  cardTitle: { color: spacemanTokens.color.ink, fontSize: 20, fontWeight: "700" },
  cardBody: { color: "#46545C", fontSize: 15, lineHeight: 22 },
  form: { gap: 12 },
  modeRow: { flexDirection: "row", gap: 8 },
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
  success: { backgroundColor: "#E5F5EE", color: "#126342" },
  footer: { color: "#46545C", fontSize: 14, marginTop: 8 }
});
