import { formatMoney } from "@spaceman/app-core";
import { isAppError } from "@spaceman/app-errors";
import {
  useInfiniteActiveItems,
  useInfiniteActiveStores,
} from "@spaceman/app-query";
import type { IdentitySession } from "@spaceman/app-types";
import { spacemanTokens } from "@spaceman/app-ui";
import { evaluateIdentityAccess } from "@spaceman/shared/auth";
import * as Network from "expo-network";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  customerIdentityService,
  customerMarketplaceService,
} from "../src/identity";

const steps = [
  "Browse active stores",
  "Validate address and fee",
  "Pay securely",
  "Track fulfillment",
];

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
  const [storeId, setStoreId] = useState<string>();
  const networkState = Network.useNetworkState();
  const stores = useInfiniteActiveStores(customerMarketplaceService, {
    limit: 12,
  });
  const items = useInfiniteActiveItems(customerMarketplaceService, storeId, {
    limit: 12,
  });
  const storeRecords = useMemo(
    () => stores.data?.pages.flatMap((page) => page.records) ?? [],
    [stores.data],
  );
  const itemRecords = useMemo(
    () => items.data?.pages.flatMap((page) => page.records) ?? [],
    [items.data],
  );

  useEffect(
    () =>
      customerIdentityService.subscribe(
        (nextSession) => {
          setSession(nextSession);
          setLoading(false);
        },
        (nextError) => {
          setError(nextError.userMessage);
          setLoading(false);
        },
      ),
    [],
  );

  useEffect(() => {
    const first = storeRecords[0];
    if (first && !storeRecords.some((store) => store.id === storeId))
      setStoreId(first.id);
  }, [storeId, storeRecords]);

  async function run(action: () => Promise<unknown>, successMessage = "") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
    } catch (caught) {
      setError(
        isAppError(caught)
          ? caught.userMessage
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const access = evaluateIdentityAccess(session, ["customer"]);
  const catalogOffline =
    networkState.isConnected === false ||
    networkState.isInternetReachable === false;
  const catalogRefreshFailed =
    stores.isError ||
    stores.isRefetchError ||
    items.isError ||
    items.isRefetchError;
  const catalogFailed = catalogOffline || catalogRefreshFailed;
  const catalogHasData = storeRecords.length > 0 || itemRecords.length > 0;
  const catalogState = catalogOffline
    ? catalogHasData
      ? "Cached catalog — offline"
      : "Catalog unavailable offline"
    : catalogRefreshFailed
    ? catalogHasData
      ? "Cached catalog — refresh failed"
      : "Catalog unavailable"
    : stores.isFetching || items.isFetching
      ? "Refreshing catalog…"
      : "Catalog cached and current";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.page}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>SPACEMAN / CUSTOMER APP</Text>
        <Text style={styles.title}>Marketplace foundation</Text>
        <Text style={styles.body}>
          Browse as a guest. Verified customer identity is required before
          checkout.
        </Text>

        <View style={styles.marketplaceHeader}>
          <View>
            <Text style={styles.eyebrow}>ACTIVE CATALOG</Text>
            <Text style={styles.cardTitle}>Browse stores</Text>
          </View>
          {stores.isFetching || items.isFetching ? (
            <ActivityIndicator
              accessibilityLabel="Refreshing catalog"
              color={spacemanTokens.color.brand}
            />
          ) : (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.fresh}
            >
              {catalogState}
            </Text>
          )}
        </View>
        <Button
          disabled={stores.isFetching || items.isFetching}
          label="Refresh catalog"
          secondary
          onPress={() =>
            void Promise.all([
              stores.refetch(),
              ...(storeId ? [items.refetch()] : []),
            ])
          }
        />
        {catalogFailed ? (
          <Text
            accessibilityRole="alert"
            style={[styles.message, styles.error]}
          >
            {catalogOffline
              ? "The marketplace is offline. Cached results remain visible when available."
              : "The marketplace refresh failed. Cached results remain visible when available."}
          </Text>
        ) : null}
        {storeRecords.map((store) => (
          <Pressable
            accessibilityRole="button"
            key={store.id}
            onPress={() => setStoreId(store.id)}
            style={[
              styles.storeCard,
              store.id === storeId && styles.storeCardSelected,
            ]}
          >
            {store.cardMedia?.thumbnailUrl || store.imageUrl ? (
              <Image
                accessibilityLabel={store.cardMedia?.altText ?? store.name}
                source={{
                  uri: store.cardMedia?.thumbnailUrl ?? store.imageUrl,
                }}
                style={styles.catalogImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imageLetter}>{store.name.slice(0, 1)}</Text>
              </View>
            )}
            <View style={styles.catalogCopy}>
              <Text style={styles.eyebrow}>{store.category.toUpperCase()}</Text>
              <Text style={styles.cardTitle}>{store.name}</Text>
              <Text style={styles.cardBody}>
                {store.description || "Marketplace store"}
              </Text>
              <Text style={styles.cardBody}>
                Minimum {formatMoney(store.minimumOrder.amountMinor)} ·{" "}
                {store.openForOrders ? "Open" : "Browsing only"}
              </Text>
            </View>
          </Pressable>
        ))}
        {stores.hasNextPage ? (
          <Button
            disabled={stores.isFetchingNextPage}
            label={
              stores.isFetchingNextPage ? "Loading stores…" : "Load more stores"
            }
            secondary
            onPress={() => void stores.fetchNextPage()}
          />
        ) : null}
        {storeId ? (
          <View style={styles.menuSection}>
            <Text style={styles.cardTitle}>Active menu</Text>
            {itemRecords.map((item) => (
              <View
                key={item.id}
                style={[styles.itemCard, !item.available && styles.unavailable]}
              >
                {item.media?.thumbnailUrl || item.imageUrl ? (
                  <Image
                    accessibilityLabel={item.imageAlt || item.name}
                    source={{ uri: item.media?.thumbnailUrl ?? item.imageUrl }}
                    style={styles.itemImage}
                  />
                ) : null}
                <View style={styles.catalogCopy}>
                  <Text style={styles.eyebrow}>
                    {item.categoryLabel.toUpperCase()}
                  </Text>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardBody}>{item.description}</Text>
                  <Text style={styles.itemPrice}>
                    {formatMoney(item.price.amountMinor)}
                  </Text>
                  <Text style={styles.cardBody}>
                    {item.available ? "Available" : "Temporarily unavailable"}
                  </Text>
                </View>
              </View>
            ))}
            {items.hasNextPage ? (
              <Button
                disabled={items.isFetchingNextPage}
                label={
                  items.isFetchingNextPage
                    ? "Loading menu…"
                    : "Load more menu items"
                }
                secondary
                onPress={() => void items.fetchNextPage()}
              />
            ) : null}
          </View>
        ) : null}
        {steps.map((step) => (
          <View key={step} style={styles.row}>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.rowText}>{step}</Text>
          </View>
        ))}

        {loading ? (
          <ActivityIndicator
            accessibilityLabel="Restoring session"
            color={spacemanTokens.color.brand}
          />
        ) : null}
        {error ? (
          <Text
            accessibilityRole="alert"
            style={[styles.message, styles.error]}
          >
            {error}
          </Text>
        ) : null}
        {notice ? (
          <Text style={[styles.message, styles.success]}>{notice}</Text>
        ) : null}

        {!loading && access.reason === "guest" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Protected checkout</Text>
            <Text style={styles.cardBody}>
              Sign in or create an account when you are ready to continue.
            </Text>
            <Button
              label={showAccount ? "Hide account form" : "Continue to checkout"}
              onPress={() => setShowAccount((value) => !value)}
            />
            {showAccount ? (
              <View style={styles.form}>
                <View style={styles.modeRow}>
                  <Button
                    label="Sign in"
                    secondary={registering}
                    onPress={() => setRegistering(false)}
                  />
                  <Button
                    label="Create account"
                    secondary={!registering}
                    onPress={() => setRegistering(true)}
                  />
                </View>
                {registering ? (
                  <Field
                    label="Name"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoComplete="name"
                  />
                ) : null}
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoComplete="email"
                  inputMode="email"
                />
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  autoComplete={
                    registering ? "new-password" : "current-password"
                  }
                  secureTextEntry
                />
                <Button
                  disabled={busy}
                  label={registering ? "Create customer account" : "Sign in"}
                  onPress={() =>
                    void run(
                      registering
                        ? () =>
                            customerIdentityService.registerCustomer({
                              displayName,
                              email,
                              password,
                            })
                        : () => customerIdentityService.signIn(email, password),
                      registering
                        ? "Account created. Check your email for the verification link."
                        : "",
                    )
                  }
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {!loading && access.reason === "email_unverified" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verify your email</Text>
            <Text style={styles.cardBody}>
              Open the link sent to {session?.email}, then refresh.
            </Text>
            <Button
              disabled={busy}
              label="Resend verification email"
              onPress={() =>
                void run(
                  () => customerIdentityService.resendVerification(),
                  "Verification email sent.",
                )
              }
            />
            <Button
              disabled={busy}
              label="I verified — refresh"
              secondary
              onPress={() =>
                void run(() => customerIdentityService.syncClaims())
              }
            />
            <Button
              disabled={busy}
              label="Sign out"
              secondary
              onPress={() => void run(() => customerIdentityService.signOut())}
            />
          </View>
        ) : null}

        {!loading && session && access.reason === "profile_missing" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Synchronize account</Text>
            <Text style={styles.cardBody}>
              The canonical profile or role claims are not ready.
            </Text>
            <Button
              disabled={busy}
              label="Synchronize account"
              onPress={() =>
                void run(() => customerIdentityService.syncClaims())
              }
            />
          </View>
        ) : null}

        {!loading &&
        session &&
        (access.reason === "inactive" || access.reason === "wrong_role") ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Customer access unavailable</Text>
            <Text style={styles.cardBody}>
              Role: {session.profile?.role ?? "missing"} · Status:{" "}
              {session.profile?.status ?? "missing"}
            </Text>
            <Button
              disabled={busy}
              label="Sign out"
              onPress={() => void run(() => customerIdentityService.signOut())}
            />
          </View>
        ) : null}

        {access.granted ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Customer account ready</Text>
            <Text style={styles.cardBody}>
              Signed in as {session?.email}. Protected actions are unlocked.
            </Text>
            <Button
              disabled={busy}
              label="Sign out"
              onPress={() => void run(() => customerIdentityService.signOut())}
            />
          </View>
        ) : null}
        <Text style={styles.footer}>
          Money is stored in minor units: {formatMoney(0)}.
        </Text>
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

function Button({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text
        style={[styles.buttonText, secondary && styles.buttonTextSecondary]}
      >
        {label}
      </Text>
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
  eyebrow: {
    color: spacemanTokens.color.brand,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 32,
  },
  title: {
    color: spacemanTokens.color.ink,
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 42,
  },
  body: { color: "#46545C", fontSize: 17, lineHeight: 25, marginBottom: 8 },
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
  dot: { color: spacemanTokens.color.brand, fontSize: 20 },
  rowText: { color: spacemanTokens.color.ink, fontSize: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D8E1E5",
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginTop: 12,
    padding: 18,
  },
  cardTitle: {
    color: spacemanTokens.color.ink,
    fontSize: 20,
    fontWeight: "700",
  },
  cardBody: { color: "#46545C", fontSize: 15, lineHeight: 22 },
  form: { gap: 12 },
  modeRow: { flexDirection: "row", gap: 8 },
  field: { gap: 6 },
  label: { color: spacemanTokens.color.ink, fontSize: 14, fontWeight: "700" },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#AEBCC4",
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    alignItems: "center",
    backgroundColor: spacemanTokens.color.brand,
    borderColor: spacemanTokens.color.brand,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  buttonSecondary: { backgroundColor: "#FFFFFF" },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  buttonTextSecondary: { color: spacemanTokens.color.brand },
  message: { borderRadius: 8, padding: 12 },
  error: { backgroundColor: "#FCE8EC", color: "#8D1F35" },
  success: { backgroundColor: "#E5F5EE", color: "#126342" },
  footer: { color: "#46545C", fontSize: 14, marginTop: 8 },
  marketplaceHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  fresh: { color: "#126342", fontSize: 13, fontWeight: "700" },
  storeCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D8E1E5",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  storeCardSelected: {
    borderColor: spacemanTokens.color.brand,
    borderWidth: 2,
  },
  catalogImage: { borderRadius: 9, height: 96, width: 96 },
  imagePlaceholder: {
    alignItems: "center",
    backgroundColor: "#DDECF1",
    borderRadius: 9,
    height: 96,
    justifyContent: "center",
    width: 96,
  },
  imageLetter: {
    color: spacemanTokens.color.brand,
    fontSize: 34,
    fontWeight: "700",
  },
  catalogCopy: { flex: 1, gap: 4 },
  menuSection: { gap: 12, marginBottom: 8 },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D8E1E5",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  itemImage: { borderRadius: 8, height: 76, width: 76 },
  itemPrice: {
    color: spacemanTokens.color.ink,
    fontSize: 17,
    fontWeight: "700",
  },
  unavailable: { opacity: 0.62 },
});
