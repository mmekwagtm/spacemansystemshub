import { formatMoney } from "@spaceman/app-core";
import { spacemanTokens } from "@spaceman/app-ui";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

const steps = ["Browse active stores", "Validate address and fee", "Pay securely", "Track fulfillment"];

export default function CustomerHomeScreen() {
  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <Text style={styles.eyebrow}>SPACEMAN / CUSTOMER APP</Text>
      <Text style={styles.title}>Marketplace foundation</Text>
      <Text style={styles.body}>
        Checkout will fail closed until the backend verifies serviceability and delivery pricing.
      </Text>
      {steps.map((step) => (
        <View key={step} style={styles.row}>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.rowText}>{step}</Text>
        </View>
      ))}
      <Text style={styles.footer}>Money is stored in minor units: {formatMoney(0)}.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#F5F7F8", flex: 1, gap: 16, justifyContent: "center", padding: 24 },
  eyebrow: { color: spacemanTokens.color.brand, fontSize: 12, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: spacemanTokens.color.ink, fontSize: 36, fontWeight: "700", lineHeight: 42 },
  body: { color: "#46545C", fontSize: 17, lineHeight: 25, marginBottom: 8 },
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
  dot: { color: spacemanTokens.color.brand, fontSize: 20 },
  rowText: { color: spacemanTokens.color.ink, fontSize: 16 },
  footer: { color: "#46545C", fontSize: 14, marginTop: 8 }
});
